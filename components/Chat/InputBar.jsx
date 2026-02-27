import { useState } from 'react';
import clsx from 'clsx';
import { STRICT_REPORT_TRIGGER } from '../../lib/reportMode';

const MODES = ['Quick', 'Deep', 'Investor', 'Acquisition'];

export default function InputBar({
  disabled,
  isStreaming,
  onSend,
  onCancel,
  onGenerateReport
}) {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('Quick');

  const send = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) {
      return;
    }

    onSend({ message: trimmed, mode });
    setMessage('');
  };

  const generateReport = () => {
    if (disabled) {
      return;
    }

    onGenerateReport({ message: STRICT_REPORT_TRIGGER, mode, forceExpectJson: true });
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      generateReport();
    }
  };

  return (
    <section className="glass-panel mt-4 rounded-2xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-400">Mode</p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((option) => (
            <button
              key={option}
              type="button"
              className={clsx(
                'rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                mode === option
                  ? 'border-accent bg-accent/20 text-white'
                  : 'border-slate-600 text-slate-300 hover:border-slate-400'
              )}
              onClick={() => setMode(option)}
              aria-label={`Set mode to ${option}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <label htmlFor="prompt-input" className="sr-only">
        Message input
      </label>
      <textarea
        id="prompt-input"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask for pricing strategy, competitive analysis, or KPI diagnostics..."
        className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-100 outline-none transition focus:border-accent"
        aria-label="Chat message input"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={disabled || !message.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          Send
        </button>

        <button
          type="button"
          onClick={generateReport}
          disabled={disabled}
          className="rounded-lg border border-mint/70 bg-mint/15 px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-mint/25 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Generate structured report"
        >
          Generate Report
        </button>

        {isStreaming ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-amber-500/70 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
            aria-label="Cancel streaming response"
          >
            Cancel
          </button>
        ) : null}

        <p className="ml-auto text-xs text-slate-400">Enter to send, Shift+Enter newline, Ctrl+G report</p>
      </div>
    </section>
  );
}
