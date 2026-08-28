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
    <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-azure-deep">{title}</p>
        {subtitle ? <p className="mt-2 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <a
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-azure/20 bg-azure-soft px-4 py-3 text-sm font-medium text-azure-deep transition hover:bg-azure/10"
        >
          {actionLabel}
          <ArrowRight size={16} />
        </a>
      ) : null}
      {children}
    </div>
  );
}
