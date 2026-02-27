export default function FactsList({ facts = [] }) {
  if (!facts.length) {
    return (
      <section className="glass-panel rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-slate-100">Observed facts</h3>
        <p className="mt-2 text-sm text-slate-300">
          No data available. Ask the agent to extract more concrete facts and cite sources.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-slate-100">Observed facts</h3>
      <ul className="mt-3 space-y-3 text-sm text-slate-200">
        {facts.map((fact, index) => (
          <li key={`${fact.text || 'fact'}-${index}`} className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3">
            <p>{fact.text}</p>
            <p className="mt-2 text-xs text-slate-400">Timestamp: {fact.timestamp || 'N/A'}</p>
            {Array.isArray(fact.sources) && fact.sources.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {fact.sources.map((source, sourceIndex) => (
                  <a
                    key={`${source.url || source}-${sourceIndex}`}
                    href={source.url || source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent underline-offset-2 hover:underline"
                  >
                    Source {sourceIndex + 1}
                  </a>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
