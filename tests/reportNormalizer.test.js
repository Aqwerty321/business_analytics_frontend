import { normalizeReportForUi } from '../lib/reportNormalizer';

describe('report schema compatibility normalization', () => {
  test('maps alternate output schema into existing dashboard schema', () => {
    const payload = {
      executive_summary: {
        overview: 'NVIDIA overview'
      },
      observed_facts: [
        {
          fact: 'Fact content',
          evidence: [1]
        }
      ],
      inferred_insights: [
        {
          insight: 'Insight content',
          evidence: [1],
          confidence: 95
        }
      ],
      competitive_comparison_table: [
        {
          company: 'NVIDIA',
          focus: 'AI/Data Center',
          FY2025_revenue_B: 130.5,
          AI_leadership: 'Leader'
        }
      ],
      financial_analysis_if_public: {
        summary_table: [
          { fiscal_year: '2025', revenue_B: 130.5, gross_margin_pct: 75 },
          { fiscal_year: '2026', revenue_B: 215.9, gross_margin_pct: '~73', eps: 12.5 }
        ],
        segment_breakdown: [
          { segment: 'Data Center', FY2025_revenue_B: 115.2 },
          { segment: 'Gaming', FY2025_revenue_B: 11.4 }
        ]
      },
      internal_data_analysis_if_provided: null,
      confidence_scores: {
        section_scores: {
          executive_summary: 0.98
        }
      },
      sources: [
        {
          id: 1,
          url: 'https://example.com/source-1'
        }
      ]
    };

    const normalized = normalizeReportForUi(payload);

    expect(normalized.executive_summary.thesis).toBe('NVIDIA overview');
    expect(normalized.executive_summary.confidence).toBe(0.98);

    expect(normalized.observed_facts[0].text).toBe('Fact content');
    expect(normalized.observed_facts[0].sources[0].url).toBe('https://example.com/source-1');

    expect(normalized.inferred_insights[0].text).toBe('Insight content');
    expect(normalized.inferred_insights[0].confidence).toBe(0.95);
    expect(normalized.inferred_insights[0].sources[0].url).toBe('https://example.com/source-1');

    expect(normalized.competitive_comparison_table[0].name).toBe('NVIDIA');
    expect(normalized.competitive_comparison_table[0].segment).toBe('AI/Data Center');
    expect(normalized.competitive_comparison_table[0].differentiation).toBe('Leader');

    expect(normalized.financial_analysis_if_public.latest_quarter.quarter).toBe('FY2026');
    expect(normalized.financial_analysis_if_public.latest_quarter.revenue).toBe(215.9);
    expect(normalized.financial_analysis_if_public.latest_quarter.ebitda_margin).toBe(0.73);

    expect(
      normalized.internal_data_analysis_if_provided.computed_metrics.revenue_timeseries.length
    ).toBe(2);
    expect(
      normalized.internal_data_analysis_if_provided.computed_metrics.segment_breakdown.length
    ).toBe(2);
  });

  test('maps capitalized keys and income_statement/segment_perf payloads', () => {
    const payload = {
      executive_summary: {
        headline: 'Tesla report',
        summary: 'Tesla summary text',
        confidence: 0.99
      },
      observed_facts: [
        {
          fact: 'Tesla fact',
          evidence: [1]
        }
      ],
      inferred_insights: [
        {
          insight: 'Tesla insight',
          evidence: [1],
          confidence: 0.98
        }
      ],
      competitive_comparison_table: [
        {
          Company: 'Tesla',
          '2024 Revenue': '$97.7B',
          Focus: 'EV + Energy',
          'AI/AV Platform': 'FSD/Robotaxi',
          Notes: 'Leader'
        }
      ],
      financial_analysis_if_public: {
        income_statement: {
          2023: { 'Total Revenue': '$96.8B', 'Operating Margin': '9.2%' },
          2024: { 'Total Revenue': '$97.7B', 'Operating Margin': '7.2%' }
        },
        segment_perf: {
          Automotive: { Revenue: '$77.1B' },
          Energy: { Revenue: '$10.1B' }
        }
      },
      internal_data_analysis_if_provided: {},
      sources: [{ id: 1, url: 'https://example.com/tesla-source' }]
    };

    const normalized = normalizeReportForUi(payload);

    expect(normalized.executive_summary.thesis).toBe('Tesla summary text');
    expect(normalized.observed_facts[0].text).toBe('Tesla fact');
    expect(normalized.observed_facts[0].sources[0].url).toBe('https://example.com/tesla-source');
    expect(normalized.inferred_insights[0].text).toBe('Tesla insight');

    expect(normalized.competitive_comparison_table[0].name).toBe('Tesla');
    expect(normalized.competitive_comparison_table[0].price).toBe('$97.7B');
    expect(normalized.competitive_comparison_table[0].segment).toBe('EV + Energy');
    expect(normalized.competitive_comparison_table[0].differentiation).toBe('FSD/Robotaxi');

    expect(normalized.financial_analysis_if_public.latest_quarter.quarter).toBe('FY2024');
    expect(normalized.financial_analysis_if_public.latest_quarter.revenue).toBe(97.7);
    expect(normalized.financial_analysis_if_public.latest_quarter.ebitda_margin).toBeCloseTo(0.072, 6);

    expect(
      normalized.internal_data_analysis_if_provided.computed_metrics.revenue_timeseries
    ).toEqual([
      { period: '2023', value: 96.8 },
      { period: '2024', value: 97.7 }
    ]);
    expect(
      normalized.internal_data_analysis_if_provided.computed_metrics.segment_breakdown
    ).toEqual([
      { segment: 'Automotive', value: 77.1 },
      { segment: 'Energy', value: 10.1 }
    ]);
  });
});
