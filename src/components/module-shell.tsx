"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "../lib/i18n";

type ModuleShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  // Sub-pages reached from a listing (a detail view, a "new" form) should
  // point back to that listing instead of the dashboard.
  backHref?: string;
  backLabel?: string;
};

export function ModuleShell({ title, description, children, backHref = "/", backLabel }: ModuleShellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-[var(--line)] pb-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--azure)] transition hover:text-[var(--azure-deep)]"
        >
          <ArrowLeft size={16} />
          {backLabel ?? t("Back to dashboard")}
        </Link>
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--ink)]">
              {title}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{description}</p>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
