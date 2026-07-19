import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  /** Colore dell'accento superiore da 2px. Default azzurro. */
  accent?: "azure" | "win" | "none";
};

const accentClass: Record<NonNullable<SectionCardProps["accent"]>, string> = {
  azure: "before:bg-[var(--azure)]",
  win: "before:bg-[var(--win)]",
  none: "before:bg-transparent",
};

export function SectionCard({
  title,
  description,
  children,
  action,
  accent = "azure",
}: SectionCardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 before:absolute before:inset-x-0 before:top-0 before:h-[2px] ${accentClass[accent]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-[var(--ink)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
