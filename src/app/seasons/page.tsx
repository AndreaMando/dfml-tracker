"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { SectionCard } from "../../components/section-card";
import { useTranslation } from "../../lib/i18n";

type Season = {
  id: string;
  name: string;
  year: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

export default function SeasonsPage() {
  const { t } = useTranslation();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seasons")
      .then((res) => res.json())
      .then(setSeasons)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ModuleShell
      title={t("Seasons")}
      description={t("Track season status, participants and the current matchday cadence.")}
    >
      <SectionCard title={t("Season summary")} description={t("Overview of the current season")}>
        {loading ? (
          <p className="text-sm text-ink-muted">{t("Loading")}...</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {seasons.map((season) => (
              <article key={season.id} className="rounded-3xl border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-ink">{season.name}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{season.year}</p>
                  </div>
                  <span className="rounded-full border border-azure/20 bg-azure-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-azure-deep">
                    {season.status}
                  </span>
                </div>
                {season.startDate && season.endDate && (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink">
                    <span>{t("Planned matchdays")}</span>
                    <strong className="text-ink">
                      {season.startDate.slice(0, 4)} → {season.endDate.slice(0, 4)}
                    </strong>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("Create Season")} description={t("Create a new league season and configure the schedule.")}>
        <Link href="/seasons/new" className="inline-flex rounded-2xl border border-azure/20 bg-azure-soft px-4 py-3 text-sm font-semibold text-azure-deep transition hover:bg-azure/10">
          {t("Create season")}
        </Link>
      </SectionCard>
    </ModuleShell>
  );
}
