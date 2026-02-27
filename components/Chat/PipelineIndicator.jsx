export default function PipelineIndicator({ isStreaming }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-xs text-slate-300"
      aria-live="polite"
    >
      <span className="font-semibold text-slate-100">Agent pipeline</span>
      <span className={isStreaming ? 'text-accent' : 'text-slate-400'}>
        {isStreaming ? 'Streaming response' : 'Idle'}
      </span>
      {isStreaming ? (
        <span className="streaming-dots flex gap-1" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : null}
    </div>
  );
}
