import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
};

export function PageHeader({ title, subtitle, actionLabel, actionHref, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/20 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">{title}</p>
        {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <a
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
        >
          {actionLabel}
          <ArrowRight size={16} />
        </a>
      ) : null}
      {children}
    </div>
  );
}
