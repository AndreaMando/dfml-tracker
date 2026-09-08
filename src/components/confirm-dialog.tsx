"use client";

/**
 * Shared destructive-action modal — same visual language as the sell-player
 * confirmation (fixed inset-0 overlay, rounded-3xl card), instead of the
 * bare browser confirm() previously used for every delete/close action.
 * Season close and other high-stakes actions can list concrete
 * `consequences` so the admin sees exactly what will happen before
 * committing.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  consequences,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  consequences?: string[];
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}

        {consequences && consequences.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-xl bg-surface-alt p-3 text-xs text-ink-muted">
            {consequences.map((item, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-rose-600">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-ink transition hover:bg-surface-alt disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
