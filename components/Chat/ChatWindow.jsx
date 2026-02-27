import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import PipelineIndicator from './PipelineIndicator';

export default function ChatWindow({
  messages,
  isStreaming,
  expectJson,
  jsonBuffer,
  jsonError,
  onCancel,
  onRetry
}) {
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, expectJson, jsonError]);

  return (
    <section className="glass-panel flex h-[58vh] flex-col rounded-2xl p-4 md:h-[68vh]">
      <div className="mb-3">
        <PipelineIndicator isStreaming={isStreaming} />
      </div>

      {expectJson || jsonError ? (
        <div className="mb-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-3">
          {expectJson ? (
            <>
              <p className="text-sm font-semibold text-slate-100">⏳ Generating structured report…</p>
              <p className="mt-1 text-xs text-slate-400">
                Buffering JSON stream safely ({jsonBuffer.length.toLocaleString()} chars received).
              </p>
            </>
          ) : null}

          {jsonError ? <p className="text-sm font-semibold text-rose-300">{jsonError}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {expectJson && isStreaming ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-amber-500/70 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                Cancel
              </button>
            ) : null}

            <button
              type="button"
              onClick={onRetry}
              disabled={isStreaming}
              className="rounded-md border border-accent/70 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto pr-1" role="list" aria-label="Chat messages">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-600/80 bg-slate-900/30 p-4 text-sm text-slate-300">
            Ask a business question, then use Generate Report to receive structured dashboard JSON.
          </div>
        ) : null}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </section>
  );
}
