"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { Tabs } from "../../../components/tabs";
import { FilterPill } from "../../../components/filter-pill";
import { RoleBadge } from "../../../components/role-badge";
import { useTranslation } from "../../../lib/i18n";

const POSITION_CAPS: Record<CompositionRow["position"], number> = { GK: 3, DF: 8, MF: 8, FW: 6 };

type CompositionRow = {
  rosterPlayerId: string;
  playerId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  teamName: string | null;
  currentValue: string | null;
  fvm: string | null;
  acquisitionPrice: string | null;
  priceUncertain: boolean;
};

type RosterDetail = {
  id: string;
  name: string | null;
  creditsRemaining: string | null;
  participant: { id: string; displayName: string } | null;
  players: CompositionRow[];
};

type PlayerOption = {
  id: string;
  fullName: string;
  position: string;
  teamName: string | null;
  status: string | null;
};

const positionFilters = ["all", "GK", "DF", "MF", "FW"];

export default function RosterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { t } = useTranslation();
  const tabs = [
    { id: "overview", label: t("Overview") },
    { id: "players", label: t("Players") },
    { id: "add", label: t("Add player") },
  ];

  const [roster, setRoster] = useState<RosterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [positionFilter, setPositionFilter] = useState("all");

  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [price, setPrice] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addError, setAddError] = useState("");

  const [sellTarget, setSellTarget] = useState<CompositionRow | null>(null);
  const [selling, setSelling] = useState(false);
  const [syncingPlayerId, setSyncingPlayerId] = useState("");

  function loadRoster() {
    return fetch(`/api/rosters/${id}`)
      .then((res) => res.json())
      .then(setRoster);
  }

  useEffect(() => {
    if (!id) return;
    loadRoster().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/api/players")
      .then((res) => res.json())
      .then(setAllPlayers);
  }, []);

  const filteredComposition = useMemo(() => {
    if (!roster) return [];
    return roster.players.filter((p) => positionFilter === "all" || p.position === positionFilter);
  }, [roster, positionFilter]);

  const rosterPlayerIds = useMemo(
    () => new Set(roster?.players.map((p) => p.playerId) ?? []),
    [roster]
  );

  const roleCounts = useMemo(() => {
    const counts: Record<CompositionRow["position"], number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
    for (const p of roster?.players ?? []) counts[p.position] += 1;
    return counts;
  }, [roster]);

  const totalSpent = useMemo(
    () => (roster?.players ?? []).reduce((sum, p) => sum + Number(p.acquisitionPrice ?? 0), 0),
    [roster]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allPlayers
      .filter(
        (p) =>
          !rosterPlayerIds.has(p.id) &&
          p.status !== "transferred" &&
          p.fullName.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [search, allPlayers, rosterPlayerIds]);

  async function handleAddPlayer(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedPlayerId) return;
    setAddingPlayer(true);
    const res = await fetch(`/api/rosters/${id}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: selectedPlayerId, acquisitionPrice: price || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? t("Could not add player"));
      setAddingPlayer(false);
      return;
    }
    setSelectedPlayerId("");
    setPrice("");
    setSearch("");
    setAddError("");
    await loadRoster();
    setAddingPlayer(false);
    setActiveTab("players");
  }

  async function handlePriceBlur(playerId: string, value: string) {
    await fetch(`/api/rosters/${id}/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acquisitionPrice: value || null }),
    });
    await loadRoster();
  }

  // Mirrors the server-side rule in DELETE /api/rosters/[id]/players/[playerId]:
  // refund = min(acquisitionPrice, current quotation); full refund if the
  // player has no quotation on record, or if flagged priceUncertain (the
  // asterisk on fantacalcio.it — long-term injury, transfer limbo, etc.).
  function computeRefund(player: CompositionRow) {
    const paid = Number(player.acquisitionPrice ?? 0);
    if (player.priceUncertain) return paid;
    const currentValue =
      player.currentValue !== null && player.currentValue !== undefined ? Number(player.currentValue) : null;
    return currentValue !== null ? Math.min(paid, currentValue) : paid;
  }

  // Quotations are only refreshed by manually importing from fantacalcio.it
  // (Players page), so they can be a few days stale. Re-sync the listone
  // before showing the sale preview so the refund reflects today's value —
  // the sync is fast (~1s, batched), no real cost to doing it on every sale.
  async function handleOpenSell(player: CompositionRow) {
    setSyncingPlayerId(player.playerId);
    await fetch("/api/players/sync-fantaasta", { method: "POST" }).catch(() => null);
    const freshRoster: RosterDetail = await fetch(`/api/rosters/${id}`).then((res) => res.json());
    setRoster(freshRoster);
    const freshPlayer = freshRoster.players.find((p) => p.playerId === player.playerId);
    setSellTarget(freshPlayer ?? player);
    setSyncingPlayerId("");
  }

  async function handleConfirmSell() {
    if (!sellTarget) return;
    setSelling(true);
    await fetch(`/api/rosters/${id}/players/${sellTarget.playerId}`, { method: "DELETE" });
    await loadRoster();
    setSelling(false);
    setSellTarget(null);
  }

  async function handleDeleteRoster() {
    if (!confirm(t("Delete this roster?"))) return;
    await fetch(`/api/rosters/${id}`, { method: "DELETE" });
    router.push("/rosters");
  }

  if (loading) {
    return (
      <ModuleShell title={t("Rosters")} description="" backHref="/rosters" backLabel={t("Back to rosters")}>
        <p className="text-sm text-ink-muted">{t("Loading")}...</p>
      </ModuleShell>
    );
  }

  if (!roster) {
    return (
      <ModuleShell title={t("Rosters")} description="" backHref="/rosters" backLabel={t("Back to rosters")}>
        <p className="text-sm text-ink-muted">{t("Roster not found")}</p>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      title={roster.name ?? ""}
      description={`${t("Managed by")} ${roster.participant?.displayName ?? "—"}`}
      backHref="/rosters"
      backLabel={t("Back to rosters")}
    >
      <div className="mt-6 space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-line bg-surface p-4">
            <p className="text-sm text-ink-muted">{t("Players")}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{roster.players.length}</p>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-4">
            <p className="text-sm text-ink-muted">{t("Credits left")}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{roster.creditsRemaining ?? "—"}</p>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <div className="grid gap-4 rounded-3xl border border-line bg-surface p-5">
            <p className="text-sm text-ink-muted">
              {t("The team name is set on the Participants page")}
              {roster.participant && (
                <>
                  {" — "}
                  <Link href={`/participants/${roster.participant.id}`} className="font-medium text-azure hover:text-azure-deep">
                    {roster.participant.displayName}
                  </Link>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={handleDeleteRoster}
              className="w-fit rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              {t("Delete roster")}
            </button>
          </div>
        )}

        {activeTab === "players" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm">
              {(["GK", "DF", "MF", "FW"] as const).map((role) => (
                <span key={role} className="flex items-center gap-1.5">
                  <RoleBadge position={role} t={t} size="sm" />
                  <span className="font-mono-data text-ink-muted">
                    {roleCounts[role]}/{POSITION_CAPS[role]}
                  </span>
                </span>
              ))}
              <span className="ml-auto text-ink-muted">
                {t("Spent")}: <strong className="text-ink">{totalSpent.toFixed(2)}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {positionFilters.map((position) => (
                <FilterPill
                  key={position}
                  label={position === "all" ? t("All") : t(position)}
                  active={positionFilter === position}
                  onClick={() => setPositionFilter(position)}
                />
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-ink">
                  <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-3 py-2">{t("Role")}</th>
                      <th className="px-3 py-2">{t("Player")}</th>
                      <th className="hidden px-3 py-2 sm:table-cell">{t("Team")}</th>
                      <th className="px-3 py-2 text-right">{t("Purchase price")}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComposition.map((player) => (
                      <tr key={player.rosterPlayerId} className="border-t border-line hover:bg-surface-alt/60">
                        <td className="px-3 py-2">
                          <RoleBadge position={player.position} t={t} size="sm" />
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {player.fullName}
                          {player.priceUncertain && (
                            <span
                              title={t("Uncertain roster status (fantacalcio.it asterisk) — full refund if sold")}
                              className="ml-1 font-bold text-amber-600"
                            >
                              *
                            </span>
                          )}
                        </td>
                        <td className="hidden px-3 py-2 text-ink-muted sm:table-cell">{player.teamName ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            defaultValue={player.acquisitionPrice ?? ""}
                            onBlur={(event) => handlePriceBlur(player.playerId, event.target.value)}
                            className="w-20 rounded-lg border border-line bg-surface-alt px-2 py-1 text-right text-sm text-ink outline-none transition focus:border-azure"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenSell(player)}
                            disabled={syncingPlayerId === player.playerId}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            {syncingPlayerId === player.playerId ? t("Syncing") + "..." : t("Sell")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredComposition.length === 0 && (
                <p className="p-4 text-sm text-ink-muted">{t("No data yet")}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "add" && (
          <form onSubmit={handleAddPlayer} className="grid gap-5 rounded-3xl border border-line bg-surface p-6">
            {addError && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {addError}
              </p>
            )}
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Search player")}</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelectedPlayerId("");
                }}
                placeholder={t("Type a player name")}
                className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
              />
            </label>

            {searchResults.length > 0 && (
              <div className="grid gap-2">
                {searchResults.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setSelectedPlayerId(p.id);
                      setSearch(p.fullName);
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selectedPlayerId === p.id
                        ? "border-azure bg-azure/15 text-azure-deep"
                        : "border-line bg-surface-alt text-ink hover:border-azure/40"
                    }`}
                  >
                    {p.fullName} — {t(p.position)} — {p.teamName ?? "—"}
                  </button>
                ))}
              </div>
            )}

            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Purchase price")}</span>
              <input
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
              />
            </label>

            <button
              type="submit"
              disabled={!selectedPlayerId || addingPlayer}
              className="w-full rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
            >
              {addingPlayer ? t("Saving") + "..." : t("Add to roster")}
            </button>
          </form>
        )}
      </div>

      {sellTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-ink">{t("Sell player")}</h3>
            <p className="mt-1 text-sm text-ink-muted">{sellTarget.fullName}</p>
            {sellTarget.priceUncertain && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                * {t("Uncertain roster status (fantacalcio.it asterisk) — full refund if sold")}
              </p>
            )}

            <div className="mt-4 space-y-2 rounded-2xl border border-line bg-surface-alt p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">{t("Purchase price")}</span>
                <span className="font-semibold text-ink">
                  {Number(sellTarget.acquisitionPrice ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">{t("Current value")}</span>
                <span className="font-semibold text-ink">
                  {sellTarget.currentValue !== null ? Number(sellTarget.currentValue).toFixed(2) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="text-ink-muted">{t("Credits received")}</span>
                <span className="text-base font-bold text-azure-deep">
                  {computeRefund(sellTarget).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmSell}
                disabled={selling}
                className="flex-1 rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
              >
                {selling ? t("Saving") + "..." : t("Confirm sale")}
              </button>
              <button
                type="button"
                onClick={() => setSellTarget(null)}
                disabled={selling}
                className="flex-1 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm font-semibold text-ink transition hover:border-azure/40"
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
