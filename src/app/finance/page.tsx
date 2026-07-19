"use client";

import { ModuleShell } from "../../components/module-shell";
import { useTranslation } from "../../lib/i18n";

const entries = [
  { label: "Registration fee", amount: -20, type: "Expense" },
  { label: "Prize payout", amount: 50, type: "Income" },
  { label: "Market fee", amount: -5, type: "Expense" },
];

export default function FinancePage() {
  const { t } = useTranslation();

  return (
    <ModuleShell
      title={t("Finance")}
      description={t("Keep track of league fees, prizes and transaction balance.")}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {entries.map((entry) => (
          <article
            key={entry.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20"
          >
            <p className="text-sm text-slate-400">{t(entry.type)}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{t(entry.label)}</h2>
            <p className={`mt-3 text-lg font-semibold ${entry.amount > 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {entry.amount > 0 ? "+" : ""}{entry.amount} {t("credits")}
            </p>
          </article>
        ))}
      </div>
    </ModuleShell>
  );
}
