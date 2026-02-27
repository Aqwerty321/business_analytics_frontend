function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/[^0-9.-]/g, '');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeConfidence(value) {
  const numeric = toNumber(value);
  if (numeric === null) {
    return null;
  }

  const ratio = numeric > 1 ? numeric / 100 : numeric;
  return Math.max(0, Math.min(1, ratio));
}

function buildSourceLookup(sources = []) {
  const lookup = new Map();
  for (const source of asArray(sources)) {
    if (!source || source.id === undefined || source.id === null) {
      continue;
    }

    lookup.set(String(source.id), source);
  }
  return lookup;
}

function resolveEvidence(evidence, sourceLookup) {
  return asArray(evidence)
    .map((item) => {
      if (!item) {
        return null;
      }

      if (typeof item === 'object' && item.url) {
        return item;
      }

      return sourceLookup.get(String(item)) || null;
    })
    .filter(Boolean);
}

function pickLatestYearRow(summaryTable = []) {
  if (!Array.isArray(summaryTable) || summaryTable.length === 0) {
    return null;
  }

  const ranked = [...summaryTable].sort((left, right) => {
    const leftScore = toNumber(left?.fiscal_year ?? left?.year ?? left?.fiscalYear) ?? -Infinity;
    const rightScore = toNumber(right?.fiscal_year ?? right?.year ?? right?.fiscalYear) ?? -Infinity;
    return rightScore - leftScore;
  });

  return ranked[0] || summaryTable[summaryTable.length - 1] || null;
}

function normalizeLatestQuarter(report) {
  const financial = report?.financial_analysis_if_public || {};
  if (financial.latest_quarter) {
    return financial.latest_quarter;
  }

  const latestYear = pickLatestYearRow(financial.summary_table);
  if (!latestYear) {
    return null;
  }

  const quarter =
    latestYear.quarter ||
    latestYear.fiscal_quarter ||
    (latestYear.fiscal_year ? `FY${latestYear.fiscal_year}` : 'Latest year');

  const revenue =
    toNumber(latestYear.revenue) ??
    toNumber(latestYear.revenue_B) ??
    toNumber(latestYear.revenue_b) ??
    0;

  const ebitdaMarginRaw =
    latestYear.ebitda_margin ?? latestYear.ebitda_margin_pct ?? latestYear.gross_margin_pct;
  const ebitdaMargin = normalizeConfidence(ebitdaMarginRaw) ?? 0;

  const firstSource = asArray(report?.sources)[0];

  return {
    quarter,
    revenue,
    ebitda_margin: ebitdaMargin,
    eps: latestYear.eps ?? latestYear.EPS ?? 'N/A',
    source: latestYear.source || firstSource?.url || null
  };
}

function normalizeRevenueSeries(report) {
  const internalSeries =
    report?.internal_data_analysis_if_provided?.computed_metrics?.revenue_timeseries;
  if (Array.isArray(internalSeries) && internalSeries.length > 0) {
    return internalSeries;
  }

  const summaryTable = asArray(report?.financial_analysis_if_public?.summary_table);
  return summaryTable
    .map((row) => {
      const value =
        toNumber(row?.value) ??
        toNumber(row?.revenue) ??
        toNumber(row?.revenue_B) ??
        toNumber(row?.revenue_b);
      if (value === null) {
        return null;
      }

      return {
        period: String(row?.period ?? row?.fiscal_year ?? row?.year ?? ''),
        value
      };
    })
    .filter(Boolean);
}

function normalizeSegmentBreakdown(report) {
  const internalBreakdown =
    report?.internal_data_analysis_if_provided?.computed_metrics?.segment_breakdown;
  if (Array.isArray(internalBreakdown) && internalBreakdown.length > 0) {
    return internalBreakdown;
  }

  const financialBreakdown = asArray(report?.financial_analysis_if_public?.segment_breakdown);
  return financialBreakdown
    .map((entry, index) => {
      const value =
        toNumber(entry?.value) ??
        toNumber(entry?.revenue) ??
        toNumber(entry?.FY2025_revenue_B) ??
        toNumber(entry?.revenue_B);
      if (value === null) {
        return null;
      }

      return {
        segment: entry?.segment || entry?.name || `Segment ${index + 1}`,
        value
      };
    })
    .filter(Boolean);
}

export function normalizeReportForUi(report) {
  if (!report || typeof report !== 'object') {
    return report;
  }

  const sourceLookup = buildSourceLookup(report.sources);
  const executive = report.executive_summary || {};
  const executiveConfidence =
    normalizeConfidence(executive.confidence) ??
    normalizeConfidence(report?.confidence_scores?.section_scores?.executive_summary) ??
    0;

  const observedFacts = asArray(report.observed_facts).map((fact) => {
    const mappedSources =
      Array.isArray(fact?.sources) && fact.sources.length > 0
        ? fact.sources
        : resolveEvidence(fact?.evidence, sourceLookup);

    return {
      ...fact,
      text: fact?.text || fact?.fact || fact?.statement || '',
      timestamp: fact?.timestamp || fact?.date || null,
      sources: mappedSources
    };
  });

  const inferredInsights = asArray(report.inferred_insights).map((insight) => {
    const mappedSources =
      Array.isArray(insight?.sources) && insight.sources.length > 0
        ? insight.sources
        : resolveEvidence(insight?.evidence, sourceLookup);

    return {
      ...insight,
      text: insight?.text || insight?.insight || insight?.summary || '',
      confidence: normalizeConfidence(insight?.confidence) ?? 0,
      sources: mappedSources
    };
  });

  const comparisonRows = asArray(report.competitive_comparison_table).map((row) => {
    const mappedSources =
      Array.isArray(row?.sources) && row.sources.length > 0
        ? row.sources
        : resolveEvidence(row?.evidence, sourceLookup);

    return {
      ...row,
      name: row?.name || row?.company || row?.competitor || '-',
      price:
        row?.price ||
        row?.pricing ||
        (row?.FY2025_revenue_B !== undefined ? `$${row.FY2025_revenue_B}B revenue` : '-'),
      segment: row?.segment || row?.focus || row?.market_segment || '-',
      differentiation: row?.differentiation || row?.AI_leadership || row?.product_breadth || '-',
      sources: mappedSources
    };
  });

  const latestQuarter = normalizeLatestQuarter(report);
  const revenueTimeseries = normalizeRevenueSeries(report);
  const segmentBreakdown = normalizeSegmentBreakdown(report);
  const existingInternal = report.internal_data_analysis_if_provided || {};
  const existingComputed = existingInternal.computed_metrics || {};

  return {
    ...report,
    executive_summary: {
      ...executive,
      thesis: executive.thesis || executive.overview || executive.summary || '',
      confidence: executiveConfidence
    },
    observed_facts: observedFacts,
    inferred_insights: inferredInsights,
    competitive_comparison_table: comparisonRows,
    financial_analysis_if_public: {
      ...(report.financial_analysis_if_public || {}),
      latest_quarter: latestQuarter
    },
    internal_data_analysis_if_provided: {
      ...existingInternal,
      computed_metrics: {
        ...existingComputed,
        revenue_timeseries: revenueTimeseries,
        segment_breakdown: segmentBreakdown
      }
    }
  };
}
