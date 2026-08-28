import { ReactNode } from "react";

type FilterPillProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function FilterPill({ label, active = false, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-azure bg-azure-soft text-azure-deep"
          : "border-line bg-surface text-ink-muted hover:border-azure/30 hover:bg-azure-soft/50"
      }`}
    >
      {label}
    </button>
  );
}
