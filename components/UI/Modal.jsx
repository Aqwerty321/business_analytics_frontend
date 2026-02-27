import { useEffect } from 'react';

export default function Modal({ isOpen, title, onClose, children }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button
            type="button"
            className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-300 transition hover:border-accent hover:text-white"
            onClick={onClose}
            aria-label="Close evidence modal"
          >
            Close
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto text-sm text-slate-200">{children}</div>
      </div>
    </div>
  );
}
