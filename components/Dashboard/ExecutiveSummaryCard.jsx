import ConfidenceBadge from '../UI/ConfidenceBadge';

export default function ExecutiveSummaryCard({
  thesis,
  confidence,
  overrideRevenue,
  onOverrideRevenue,
  hasManualOverride
}) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Executive summary</p>
          <h2 className="mt-1 text-xl font-bold text-slate-100">Core thesis</h2>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>

      <p className="text-sm leading-7 text-slate-200">{thesis || 'No data available. Ask the agent for a thesis statement.'}</p>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-400">Manual override</p>
          {hasManualOverride ? (
            <span className="rounded-full border border-amber-500/70 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              Manual override
            </span>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Revenue estimate
          <input
            type="number"
            value={overrideRevenue ?? ''}
            onChange={(event) => onOverrideRevenue(event.target.value)}
            className="w-40 rounded-md border border-slate-600 bg-slate-950/70 px-2 py-1 text-sm text-slate-100 outline-none focus:border-accent"
            placeholder="Optional"
            aria-label="Revenue override input"
          />
        </label>
      </div>
    </section>
  );
}
