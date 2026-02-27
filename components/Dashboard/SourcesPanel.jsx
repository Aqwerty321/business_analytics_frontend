export default function SourcesPanel({ sources = [] }) {
  if (!sources.length) {
    return (
      <section className="glass-panel rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-slate-100">Sources</h3>
        <p className="mt-2 text-sm text-slate-300">
          No data available. Ask the agent to include source URLs and snippets.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-slate-100">Sources</h3>
      <ul className="mt-3 space-y-3">
        {sources.map((source, index) => (
          <li key={`${source.url || source}-${index}`} className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 text-sm">
            <a
              href={source.url || '#'}
              target="_blank"
              rel="noreferrer"
              className="break-all text-accent underline-offset-2 hover:underline"
            >
              {source.url || 'Unknown URL'}
            </a>
            {source.snippet ? <p className="mt-1 text-slate-300">{source.snippet}</p> : null}
            <p className="mt-2 text-xs text-slate-400">
              Retrieval: {source.retrieval_method || 'N/A'} | Credibility: {source.credibility_score ?? 'N/A'}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
