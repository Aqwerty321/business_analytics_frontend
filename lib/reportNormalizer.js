function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function canonicalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getValueByAliases(record, aliases = []) {
  if (!record || typeof record !== 'object') {
    return undefined;
  }

  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(record, alias)) {
      return record[alias];
    }
  }

  const canonicalLookup = new Map(
    Object.entries(record).map(([key, value]) => [canonicalizeKey(key), value])
  );

  for (const alias of aliases) {
    const hit = canonicalLookup.get(canonicalizeKey(alias));
    if (hit !== undefined) {
      return hit;
    }
  }

  return undefined;
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

  const latestYearFromTable = pickLatestYearRow(financial.summary_table);
  let latestYear = latestYearFromTable;

  if (!latestYear) {
    const incomeStatement = financial.income_statement;
    if (incomeStatement && typeof incomeStatement === 'object') {
      const rankedYears = Object.entries(incomeStatement)
        .map(([yearKey, row]) => {
          const yearNumber = toNumber(yearKey);
          return {
            yearKey,
            yearNumber: yearNumber ?? -Infinity,
            row
          };
        })
        .sort((left, right) => right.yearNumber - left.yearNumber);

      if (rankedYears.length > 0) {
        latestYear = {
          ...(rankedYears[0].row || {}),
          fiscal_year: rankedYears[0].yearKey
        };
      }
    }
  }

  if (!latestYear) {
    return null;
  }

  const quarter =
    getValueByAliases(latestYear, ['quarter', 'fiscal_quarter', 'fiscal quarter']) ||
    (getValueByAliases(latestYear, ['fiscal_year', 'fiscal year', 'year'])
      ? `FY${getValueByAliases(latestYear, ['fiscal_year', 'fiscal year', 'year'])}`
      : 'Latest year');

  const revenue =
    toNumber(getValueByAliases(latestYear, ['revenue', 'revenue_B', 'revenue_b', 'total revenue'])) ??
    0;

  const ebitdaMarginRaw =
    getValueByAliases(latestYear, [
      'ebitda_margin',
      'ebitda margin',
      'ebitda_margin_pct',
      'operating margin',
      'op. margin',
      'gross_margin_pct',
      'gross margin'
    ]);
  const ebitdaMargin = normalizeConfidence(ebitdaMarginRaw) ?? 0;

  const firstSource = asArray(report?.sources)[0];

  return {
    quarter,
    revenue,
    ebitda_margin: ebitdaMargin,
    eps: getValueByAliases(latestYear, ['eps', 'EPS', 'gaap eps', 'diluted eps']) ?? 'N/A',
    source: getValueByAliases(latestYear, ['source', 'source_url']) || firstSource?.url || null
  };
}

function normalizeRevenueSeries(report) {
  const internalSeries =
    report?.internal_data_analysis_if_provided?.computed_metrics?.revenue_timeseries;
  if (Array.isArray(internalSeries) && internalSeries.length > 0) {
    return internalSeries;
  }

  const summaryTable = asArray(report?.financial_analysis_if_public?.summary_table);
  const summarySeries = summaryTable
    .map((row) => {
      const value =
        toNumber(getValueByAliases(row, ['value', 'revenue', 'revenue_B', 'revenue_b', 'total revenue']));
      if (value === null) {
        return null;
      }

      return {
        period: String(getValueByAliases(row, ['period', 'fiscal_year', 'fiscal year', 'year']) ?? ''),
        value
      };
    })
    .filter(Boolean);

  if (summarySeries.length > 0) {
    return summarySeries;
  }

  const incomeStatement = report?.financial_analysis_if_public?.income_statement;
  if (!incomeStatement || typeof incomeStatement !== 'object') {
    return [];
  }

  return Object.entries(incomeStatement)
    .map(([period, row]) => {
      const value = toNumber(getValueByAliases(row, ['total revenue', 'revenue', 'revenue_B']));
      if (value === null) {
        return null;
      }

      return { period, value };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftYear = toNumber(left.period) ?? -Infinity;
      const rightYear = toNumber(right.period) ?? -Infinity;
      return leftYear - rightYear;
    });
}

function normalizeSegmentBreakdown(report) {
  const internalBreakdown =
    report?.internal_data_analysis_if_provided?.computed_metrics?.segment_breakdown;
  if (Array.isArray(internalBreakdown) && internalBreakdown.length > 0) {
    return internalBreakdown;
  }

  const financialBreakdown = asArray(report?.financial_analysis_if_public?.segment_breakdown);
  const mappedFinancialBreakdown = financialBreakdown
    .map((entry, index) => {
      const value =
        toNumber(
          getValueByAliases(entry, ['value', 'revenue', 'FY2025_revenue_B', 'revenue_B', '2024 Revenue'])
        );
      if (value === null) {
        return null;
      }

      return {
        segment: getValueByAliases(entry, ['segment', 'name']) || `Segment ${index + 1}`,
        value
      };
    })
    .filter(Boolean);

  if (mappedFinancialBreakdown.length > 0) {
    return mappedFinancialBreakdown;
  }

  const segmentPerf = report?.financial_analysis_if_public?.segment_perf;
  if (!segmentPerf || typeof segmentPerf !== 'object') {
    return [];
  }

  return Object.entries(segmentPerf)
    .map(([segment, row]) => {
      const value = toNumber(getValueByAliases(row, ['Revenue', 'revenue', '2024 Revenue']));
      if (value === null) {
        return null;
      }

      return {
        segment,
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
      text:
        getValueByAliases(fact, ['text', 'fact', 'statement', 'summary', 'headline']) || '',
      timestamp: getValueByAliases(fact, ['timestamp', 'date']) || null,
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
      text: getValueByAliases(insight, ['text', 'insight', 'summary', 'headline']) || '',
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
      name:
        getValueByAliases(row, ['name', 'company', 'competitor', 'Company']) || '-',
      price:
        getValueByAliases(row, ['price', 'pricing', '2024 Revenue', 'FY2025_revenue_B']) ||
        (row?.FY2025_revenue_B !== undefined ? `$${row.FY2025_revenue_B}B revenue` : '-'),
      segment: getValueByAliases(row, ['segment', 'focus', 'market_segment', 'EV Units (2024)']) || '-',
      differentiation:
        getValueByAliases(row, [
          'differentiation',
          'AI_leadership',
          'AI/AV Platform',
          'product_breadth',
          'Notes'
        ]) || '-',
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
      thesis:
        getValueByAliases(executive, ['thesis', 'overview', 'summary', 'headline']) || '',
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
