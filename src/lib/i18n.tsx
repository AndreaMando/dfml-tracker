"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "it";
const STORAGE_KEY = "dfml_language";
const DEFAULT_LANG: Lang = "en";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    //English texts are default
  },
  it: {
    "Dashboard": "Panoramica",
    "Overview": "Panoramica",
    "Seasons": "Stagioni",
    "Participants": "Partecipanti",
    "Players": "Giocatori",
    "Rosters": "Rosa",
    "Lineups": "Formazioni",
    "Market": "Mercato",
    "Scores": "Punti",
    "Standings": "Classifica",
    "Finance": "Finanza",
    "History": "Storico",
    "Back to dashboard": "Torna alla dashboard",
    "DFML Tracker": "DFML Tracker",
    "Companion dashboard for seasons, rosters and matchday flow.": "Dashboard di accompagnamento per stagioni, rose e calendario delle partite.",
    "Manage your league with a clean overview of seasons, participants, rosters, lineups and market activity.": "Gestisci la tua lega con una vista chiara di stagioni, partecipanti, rose, formazioni e attività di mercato.",
    "Open module": "Apri modulo",
    "Open API": "Apri API",
    "Language": "Lingua",
    "English": "Inglese",
    "Italian": "Italiano",
    "Overview of the current season": "Panoramica della stagione attuale",
    "Active season": "Stagione attiva",
    "Active participants": "Partecipanti attivi",
    "Registered players": "Giocatori registrati",
    "Live standings": "Classifica live",
    "No data yet": "Nessun dato ancora",
    "Recent activity": "Attività recente",
    "Season summary": "Riepilogo stagione",
    "Manage the league": "Gestisci la lega",
    "Current matchday": "Giornata corrente",
    "Open transfers": "Trasferimenti aperti",
    "Planned matchdays": "Giornate pianificate",
    "PARTICIPANTS": "PARTECIPANTI",
    "MATCHDAY": "GIORNATA",
    "All": "Tutti",
    "Active": "Attivi",
    "Inactive": "Inattivi",
    "Pending": "In attesa",
    "Manager": "Manager",
    "Team": "Squadra",
    "Status": "Stato",
    "Value": "Valore",
    "Top players": "Top giocatori",
    "The most valuable players across the roster.": "I giocatori più preziosi della rosa.",
    "Remaining credits": "Crediti rimanenti",
    "Create season": "Crea stagione",
    "Create participant": "Crea partecipante",
    "Create roster": "Crea rosa",
    "Create a new league season and configure the schedule.": "Crea una nuova stagione di lega e configura il calendario.",
    "Review squads, player count and remaining budget for every roster.": "Controlla le rose, il numero di giocatori e il budget rimanente per ogni rosa.",
    "Browse player pool, positions and current valuations.": "Esplora la rosa dei giocatori, le posizioni e le valutazioni correnti.",
    "Manage the league roster of teams and their current state.": "Gestisci la rosa della lega e lo stato delle squadre.",
    "Create a season and configure the league timeline.": "Crea una stagione e configura la timeline della lega.",
    "Create a participant and assign initial budget.": "Crea un partecipante e assegna il budget iniziale.",
    "Build a new roster for the season.": "Crea una nuova rosa per la stagione.",
  }
};

type TranslationContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === "en" || stored === "it") {
      setLangState(stored);
    }
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const t = (key: string) => translations[lang][key] ?? key;

  return (
    <TranslationContext.Provider value={{ lang, setLang, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
}
