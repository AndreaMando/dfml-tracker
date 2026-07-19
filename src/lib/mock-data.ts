export type Season = {
  id: string;
  name: string;
  year: number;
  status: string;
  startDate: string;
  endDate: string;
};

export type Participant = {
  id: string;
  name: string;
  team: string;
  credits: number;
  status: string;
};

export type Player = {
  id: string;
  fullName: string;
  position: string;
  teamName: string;
  value: number;
  form: string;
  age: number;
  isUnder21: boolean;
};

export type Roster = {
  id: string;
  name: string;
  participant: string;
  players: number;
  value: number;
  credits: number;
  formation: string;
  active: boolean;
};

export const seasons: Season[] = [
  {
    id: "season-2026",
    name: "DFML 26/27",
    year: 2026,
    status: "Active",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
  },
  {
    id: "season-2025",
    name: "DFML 25/26",
    year: 2025,
    status: "Finished",
    startDate: "2025-09-01",
    endDate: "2026-06-30",
  },
];

export const participants: Participant[] = [
  { id: "participant-1", name: "Luca", team: "The North Stars", credits: 85, status: "Active" },
  { id: "participant-2", name: "Marta", team: "Blue Thunder", credits: 72, status: "Active" },
  { id: "participant-3", name: "Giorgio", team: "Rookies FC", credits: 61, status: "Pending" },
];

export const players: Player[] = [
  { id: "player-1", fullName: "Marco Rossi", position: "FW", teamName: "Atalanta", value: 22, form: "Hot", age: 24, isUnder21: false },
  { id: "player-2", fullName: "Lorenzo Bianchi", position: "MF", teamName: "Inter", value: 18, form: "Stable", age: 23, isUnder21: false },
  { id: "player-3", fullName: "Davide Ferri", position: "DF", teamName: "Juventus", value: 16, form: "Watch", age: 20, isUnder21: true },
  { id: "player-4", fullName: "Giulio Conti", position: "GK", teamName: "Milan", value: 14, form: "Good", age: 22, isUnder21: false },
];

export const rosters: Roster[] = [
  { id: "roster-1", name: "North Stars", participant: "Luca", players: 15, value: 122, credits: 18, formation: "4-3-3", active: true },
  { id: "roster-2", name: "Blue Thunder", participant: "Marta", players: 14, value: 118, credits: 22, formation: "4-4-2", active: true },
  { id: "roster-3", name: "Rookies FC", participant: "Giorgio", players: 13, value: 110, credits: 24, formation: "3-5-2", active: false },
];

export const getPlayerById = (id: string) => players.find((player) => player.id === id);
export const getRosterById = (id: string) => rosters.find((roster) => roster.id === id);
export const getParticipantById = (id: string) => participants.find((participant) => participant.id === id);
