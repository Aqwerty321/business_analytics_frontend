import { useState } from 'react';
import Modal from '../UI/Modal';

export default function InsightsList({ insights = [] }) {
  const [activeInsight, setActiveInsight] = useState(null);

  if (!insights.length) {
    return (
      <section className="glass-panel rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-slate-100">Inferred insights</h3>
        <p className="mt-2 text-sm text-slate-300">
          No data available. Request deeper analysis to generate inferred insights.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-slate-100">Inferred insights</h3>
      <ul className="mt-3 space-y-3">
        {insights.map((insight, index) => (
          <li key={`${insight.text || 'insight'}-${index}`} className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3">
            <p className="text-sm text-slate-100">{insight.text}</p>
            <p className="mt-1 text-xs text-slate-400">Confidence: {Math.round(Number(insight.confidence || 0) * 100)}%</p>
            {Array.isArray(insight.assumptions) && insight.assumptions.length > 0 ? (
              <p className="mt-2 text-xs text-slate-300">Assumptions: {insight.assumptions.join(' | ')}</p>
            ) : null}
            <button
              type="button"
              onClick={() => setActiveInsight(insight)}
              className="mt-3 rounded-md border border-accent/70 px-2 py-1 text-xs font-semibold text-accent transition hover:bg-accent/10"
            >
              Show evidence
            </button>
          </li>
        ))}
      </ul>

      <Modal isOpen={Boolean(activeInsight)} title="Insight evidence" onClose={() => setActiveInsight(null)}>
        <p className="mb-3 text-sm text-slate-200">{activeInsight?.text}</p>
        {Array.isArray(activeInsight?.sources) && activeInsight.sources.length > 0 ? (
          <ul className="space-y-2">
            {activeInsight.sources.map((source, index) => (
              <li key={`${source.url || source}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                <a
                  href={source.url || source}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent underline-offset-2 hover:underline"
                >
                  {source.url || source}
                </a>
                {source.snippet ? <p className="mt-1 text-xs text-slate-300">{source.snippet}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No source evidence available.</p>
        )}
      </Modal>
    </section>
  );
}
