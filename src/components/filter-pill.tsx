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
          ? "border-cyan-500 bg-cyan-500/15 text-cyan-200"
          : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-cyan-500/20 hover:bg-cyan-500/10"
      }`}
    >
      {label}
    </button>
  );
}
