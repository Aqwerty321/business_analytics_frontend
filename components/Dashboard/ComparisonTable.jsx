export default function ComparisonTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <section className="glass-panel rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-slate-100">Competitive comparison</h3>
        <p className="mt-2 text-sm text-slate-300">
          No data available. Ask the agent for a competitor pricing and differentiation table.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-slate-100">Competitive comparison</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm text-slate-200">
          <thead>
            <tr className="border-b border-slate-700 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Price</th>
              <th className="px-2 py-2">Segment</th>
              <th className="px-2 py-2">Differentiation</th>
              <th className="px-2 py-2">Sources</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.name || 'comp'}-${index}`} className="border-b border-slate-800/80">
                <td className="px-2 py-3 font-medium text-slate-100">{row.name || '-'}</td>
                <td className="px-2 py-3">{row.price || '-'}</td>
                <td className="px-2 py-3">{row.segment || '-'}</td>
                <td className="px-2 py-3">{row.differentiation || '-'}</td>
                <td className="px-2 py-3">
                  {Array.isArray(row.sources) && row.sources.length > 0
                    ? row.sources.map((source, sourceIndex) => (
                        <a
                          key={`${source.url || source}-${sourceIndex}`}
                          href={source.url || source}
                          target="_blank"
                          rel="noreferrer"
                          className="mr-2 text-xs text-accent underline-offset-2 hover:underline"
                        >
                          Link {sourceIndex + 1}
                        </a>
                      ))
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
