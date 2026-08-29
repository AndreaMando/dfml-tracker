"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ModuleShell } from "../../../components/module-shell";
import { Tabs } from "../../../components/tabs";
import { FilterPill } from "../../../components/filter-pill";
import { useTranslation } from "../../../lib/i18n";

const POSITION_CAPS: Record<CompositionRow["position"], number> = { GK: 3, DF: 8, MF: 8, FW: 6 };
const roleStyles: Record<CompositionRow["position"], string> = {
  GK: "bg-sky-50 text-sky-700",
  DF: "bg-emerald-50 text-emerald-700",
  MF: "bg-amber-50 text-amber-700",
  FW: "bg-rose-50 text-rose-700",
};

type CompositionRow = {
  rosterPlayerId: string;
  playerId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  teamName: string | null;
  currentValue: string | null;
  fvm: string | null;
  acquisitionPrice: string | null;
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
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [price, setPrice] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addError, setAddError] = useState("");

  function loadRoster() {
    return fetch(`/api/rosters/${id}`)
      .then((res) => res.json())
      .then((data: RosterDetail) => {
        setRoster(data);
        setName(data.name ?? "");
      });
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

  async function handleSaveName(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await fetch(`/api/rosters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await loadRoster();
    setSaving(false);
  }

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

  async function handleRemovePlayer(playerId: string) {
    if (!confirm(t("Remove this player from the roster?"))) return;
    await fetch(`/api/rosters/${id}/players/${playerId}`, { method: "DELETE" });
    await loadRoster();
  }

  async function handleDeleteRoster() {
    if (!confirm(t("Delete this roster?"))) return;
    await fetch(`/api/rosters/${id}`, { method: "DELETE" });
    router.push("/rosters");
  }

  if (loading) {
    return (
      <ModuleShell title={t("Rosters")} description="">
        <p className="text-sm text-ink-muted">{t("Loading")}...</p>
      </ModuleShell>
    );
  }

  if (!roster) {
    return (
      <ModuleShell title={t("Rosters")} description="">
        <p className="text-sm text-ink-muted">{t("Roster not found")}</p>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      title={roster.name ?? ""}
      description={`${t("Managed by")} ${roster.participant?.displayName ?? "—"}`}
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
          <form onSubmit={handleSaveName} className="grid gap-4 rounded-3xl border border-line bg-surface p-5 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Roster name")}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
              >
                {saving ? t("Saving") + "..." : t("Save changes")}
              </button>
              <button
                type="button"
                onClick={handleDeleteRoster}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                {t("Delete roster")}
              </button>
            </div>
          </form>
        )}

        {activeTab === "players" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm">
              {(["GK", "DF", "MF", "FW"] as const).map((role) => (
                <span key={role} className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${roleStyles[role]}`}
                  >
                    {t(role)}
                  </span>
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
                      <th className="w-10 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComposition.map((player) => (
                      <tr key={player.rosterPlayerId} className="border-t border-line hover:bg-surface-alt/60">
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${roleStyles[player.position]}`}
                          >
                            {t(player.position)}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">{player.fullName}</td>
                        <td className="hidden px-3 py-2 text-ink-muted sm:table-cell">{player.teamName ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            defaultValue={player.acquisitionPrice ?? ""}
                            onBlur={(event) => handlePriceBlur(player.playerId, event.target.value)}
                            className="w-20 rounded-lg border border-line bg-surface-alt px-2 py-1 text-right text-sm text-ink outline-none transition focus:border-azure"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePlayer(player.playerId)}
                            title={t("Remove")}
                            aria-label={t("Remove")}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={14} />
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
    </ModuleShell>
  );
}
