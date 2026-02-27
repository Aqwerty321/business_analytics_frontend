import clsx from 'clsx';

function getConfidenceState(confidence = 0) {
  if (confidence >= 0.75) {
    return { label: 'High confidence', color: 'text-emerald-400', ring: '#10b981' };
  }

  if (confidence >= 0.45) {
    return { label: 'Moderate confidence', color: 'text-amber-400', ring: '#f59e0b' };
  }

  return { label: 'Low confidence', color: 'text-rose-400', ring: '#ef4444' };
}

export default function ConfidenceBadge({ confidence = 0 }) {
  const normalized = Math.max(0, Math.min(1, Number(confidence || 0)));
  const percent = Math.round(normalized * 100);
  const stroke = 2 * Math.PI * 24;
  const dashOffset = stroke - (stroke * percent) / 100;
  const state = getConfidenceState(normalized);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/65 px-3 py-2">
      <svg viewBox="0 0 56 56" className="h-14 w-14">
        <circle cx="28" cy="28" r="24" fill="transparent" stroke="#334155" strokeWidth="6" />
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="transparent"
          stroke={state.ring}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={stroke}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700"
          transform="rotate(-90 28 28)"
        />
        <text x="28" y="32" textAnchor="middle" className="fill-slate-100 text-xs font-bold">
          {percent}%
        </text>
      </svg>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">Model confidence</p>
        <p className={clsx('text-sm font-semibold', state.color)}>{state.label}</p>
      </div>
    </div>
  );
}
