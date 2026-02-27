export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function computeMomGrowth(revenueTimeseries = []) {
  return revenueTimeseries.map((entry, index) => {
    if (index === 0) {
      return { period: entry.period, growthPct: 0 };
    }

    const previousValue = Number(revenueTimeseries[index - 1]?.value || 0);
    const currentValue = Number(entry?.value || 0);

    if (previousValue === 0) {
      return { period: entry.period, growthPct: 0 };
    }

    return {
      period: entry.period,
      growthPct: Number((((currentValue - previousValue) / previousValue) * 100).toFixed(2))
    };
  });
}

export function applyRevenueOverride(report, overrideRevenue) {
  if (!report || overrideRevenue === null || Number.isNaN(Number(overrideRevenue))) {
    return report;
  }

  const cloned = deepClone(report);
  const latestQuarter = cloned?.financial_analysis_if_public?.latest_quarter;
  const timeseries =
    cloned?.internal_data_analysis_if_provided?.computed_metrics?.revenue_timeseries || [];

  const parsedOverride = Number(overrideRevenue);

  if (latestQuarter && Number(latestQuarter.revenue) > 0) {
    const factor = parsedOverride / Number(latestQuarter.revenue);
    latestQuarter.revenue = parsedOverride;

    if (Array.isArray(timeseries) && timeseries.length > 0) {
      cloned.internal_data_analysis_if_provided.computed_metrics.revenue_timeseries =
        timeseries.map((entry) => ({
          ...entry,
          value: Number((Number(entry.value || 0) * factor).toFixed(2))
        }));
    }
  } else if (Array.isArray(timeseries) && timeseries.length > 0) {
    const latestPoint = Number(timeseries[timeseries.length - 1]?.value || 1);
    const factor = parsedOverride / latestPoint;
    cloned.internal_data_analysis_if_provided.computed_metrics.revenue_timeseries =
      timeseries.map((entry) => ({
        ...entry,
        value: Number((Number(entry.value || 0) * factor).toFixed(2))
      }));
  }

  return cloned;
}
