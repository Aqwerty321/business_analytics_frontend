const QUADS = [
  { key: 'strengths', title: 'Strengths' },
  { key: 'weaknesses', title: 'Weaknesses' },
  { key: 'opportunities', title: 'Opportunities' },
  { key: 'threats', title: 'Threats' }
];

export default function SWOTQuad({ swot }) {
  if (!swot) {
    return (
      <section className="glass-panel rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-slate-100">SWOT analysis</h3>
        <p className="mt-2 text-sm text-slate-300">
          No data available. Ask the agent to provide strengths, weaknesses, opportunities, and threats.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-slate-100">SWOT analysis</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {QUADS.map((quad) => (
          <div key={quad.key} className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3">
            <h4 className="text-sm font-semibold text-slate-100">{quad.title}</h4>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {(swot[quad.key] || []).length > 0 ? (
                (swot[quad.key] || []).map((item, index) => (
                  <li key={`${quad.key}-${index}`} className="leading-5">
                    • {item}
                  </li>
                ))
              ) : (
                <li>No data available</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
