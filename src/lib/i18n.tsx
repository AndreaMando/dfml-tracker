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
    "Rosters": "Rose",
    "Player Stats": "Statistiche giocatori",
    "Season-long stats for every player, sortable and searchable.": "Statistiche stagionali di ogni giocatore, ordinabili e ricercabili.",
    "PG": "PG",
    "Appearances": "Presenze",
    "Avg": "Media",
    "Average vote": "Voto medio",
    "FV": "FV",
    "Total fantavoto": "Fantavoto totale",
    "Clean sheets": "Porte inviolate",
    "Role": "Ruolo",
    "Market": "Mercato",
    "Scores": "Punteggi",
    "Standings": "Classifica",
    "Finance": "Finanza",
    "History": "Storico",
    "Back to dashboard": "Torna alla dashboard",
    "DFML Tracker": "DFML Tracker",
    "Companion dashboard for seasons, rosters and matchday flow.": "Dashboard di accompagnamento per stagioni, rose e calendario delle partite.",
    "Manage your league with a clean overview of seasons, participants, rosters, stats and market activity.": "Gestisci la tua lega con una vista chiara di stagioni, partecipanti, rose, statistiche e attività di mercato.",
    "Open module": "Apri modulo",
    "Open API": "Apri API",
    "Language": "Lingua",
    "Menu": "Menu",
    "English": "Inglese",
    "Italian": "Italiano",
    "Overview of the current season": "Panoramica della stagione attuale",
    "Active season": "Stagione attiva",
    "Active participants": "Partecipanti attivi",
    "Registered players": "Giocatori registrati",
    "Live standings": "Classifica live",
    "League leader": "Prima in classifica",
    "No data yet": "Nessun dato ancora",
    "Recent activity": "Attività recente",
    "Season summary": "Riepilogo stagione",
    "Manage the league": "Gestisci la lega",
    "Current matchday": "Giornata corrente",
    "Open transfers": "Trasferimenti aperti",
    "Planned matchdays": "Giornate pianificate",
    "PARTICIPANTS": "PARTECIPANTI",
    "MATCHDAY": "GIORNATA",
    "MARKET OPEN": "MERCATO APERTO",
    "MARKET CLOSED": "MERCATO CHIUSO",
    "All": "Tutti",
    "Top": "Top",
    "Grid": "Griglia",
    "Table": "Tabella",
    "Active": "Attivi",
    "Inactive": "Inattivi",
    "Pending": "In attesa",
    "Submitted": "Inviata",
    "scheduled": "programmata",
    "played": "giocata",
    "walkover_home": "vittoria a tavolino (casa)",
    "walkover_away": "vittoria a tavolino (trasferta)",
    "Manager": "Manager",
    "Team": "Squadra",
    "Spent": "Spesi",
    "Previous": "Precedente",
    "Next": "Successiva",
    "of": "di",
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

    // History
    "Review the recent chronology of league actions.": "Rivedi la cronologia recente delle azioni di lega.",

    // Finance
    "Keep track of league fees, prizes and transaction balance.": "Tieni traccia di quote, premi e bilancio delle transazioni della lega.",
    "credits": "crediti",
    "Registration fee": "Quota di iscrizione",
    "Prize payout": "Pagamento premio",
    "Market fee": "Commissione di mercato",
    "Expense": "Uscita",
    "Income": "Entrata",
    "Per participant, paid at season start.": "Per partecipante, versata a inizio stagione.",
    "Fines": "Multe",
    "Missed lineup": "Formazione non inviata",
    "Abandonment": "Abbandono",
    "fee + penalty": "quota + multa",
    "Prizes": "Premi",
    "Based on final standings, fines not deducted.": "In base alla classifica finale, multe non detratte.",
    "End-of-season bonus credits": "Crediti bonus fine stagione",
    "Total fines owed per fantasy team, entered manually.": "Totale multe dovute per fantasquadra, inserite a mano.",
    "Total fines": "Totale multe",
    "Details": "Dettagli",
    "Formazione non inviata": "Formazione non inviata",
    "Abbandono (quota + multa)": "Abbandono (quota + multa)",
    "Altro (importo libero)": "Altro (importo libero)",
    "Select": "Seleziona",
    "Amount": "Importo",
    "Note": "Nota",
    "e.g. Matchday 4": "es. Giornata 4",
    "Add fine": "Aggiungi multa",
    "Delete this transaction?": "Eliminare questa transazione?",
    "Open": "Aperta",
    "Locked": "Chiusa",
    "Market open": "Mercato aperto",
    "Market closed": "Mercato chiuso",
    "Market sessions": "Sessioni di mercato",
    "All auction and repair windows for this season.": "Tutte le finestre di asta e riparazione per questa stagione.",
    "Initial auction": "Asta ufficiale",
    "Summer repair market": "Riparazione estiva",
    "Winter repair market": "Riparazione invernale",
    "Open market": "Mercato aperto",
    "ongoing": "In corso",
    "ended": "Conclusa",
    "Type": "Tipo",
    "Session label": "Nome sessione",
    "Start date": "Data inizio",
    "End date": "Data fine",
    "Create session": "Crea sessione",
    "Delete this market session?": "Eliminare questa sessione di mercato?",

    // Lineups
    "Inspect submitted formations and pending matchday selections.": "Controlla le formazioni inviate e le selezioni di giornata in sospeso.",
    "Formation": "Modulo",

    // Season / Matchday generic
    "Season": "Stagione",
    "Matchday": "Giornata",

    // Fixtures / Scores
    "Scores & Votes": "Punteggi e voti",
    "Review matchday points and vote-based scoring summaries.": "Rivedi i punti di giornata e i riepiloghi basati sui voti.",
    "Fixtures": "Partite",
    "Matches for this matchday.": "Partite di questa giornata.",
    "Remove": "Rimuovi",
    "Home": "Casa",
    "Away": "Trasferta",
    "Select a fantasy team": "Seleziona una fantasquadra",
    "Add fixture": "Aggiungi partita",
    "Player stats": "Statistiche giocatore",
    "Enter raw stats, fantavoto is calculated automatically.": "Inserisci le statistiche grezze, il fantavoto viene calcolato automaticamente.",
    "Fantasy team": "Fantasquadra",
    "Player": "Giocatore",
    "Vote": "Voto",
    "Goals": "Gol",
    "Assists": "Assist",
    "Yellow cards": "Ammonizioni",
    "Red cards": "Espulsioni",
    "Penalties saved": "Rigori parati",
    "Penalties missed": "Rigori sbagliati",
    "Own goals": "Autogol",
    "Clean sheet": "Porta inviolata",
    "Fantavoto": "Fantavoto",
    "Save": "Salva",
    "Import from Fantacalcio.it": "Importa da Fantacalcio.it",
    "Automatically fetch votes and stats for this matchday. Unofficial source.": "Recupera automaticamente voti e statistiche per questa giornata. Fonte non ufficiale.",
    "Fantacalcio.it season": "Stagione Fantacalcio.it",
    "Fantacalcio.it matchday": "Giornata Fantacalcio.it",
    "Importing": "Importazione",
    "Import": "Importa",
    "Import failed": "Import fallito",
    "Imported": "Importati",
    "Not found": "Non trovati",
    "New players created": "Nuovi giocatori creati",
    "Sync results from leghe.fantacalcio.it": "Sincronizza risultati da leghe.fantacalcio.it",
    "Fetch fantapunti, goals and match outcome for all calculated matchdays.": "Recupera fantapunti, gol ed esito per tutte le giornate calcolate.",
    "Competition ID": "ID competizione",
    "Syncing": "Sincronizzazione",
    "Sync": "Sincronizza",
    "Sync failed": "Sincronizzazione fallita",
    "Fixtures updated": "Partite aggiornate",
    "Not matched": "Non abbinate",

    // Standings
    "Monitor the live table and current league positions.": "Monitora la classifica live e le posizioni attuali della lega.",
    "Loading": "Caricamento",
    "Rank": "Posizione",
    "Roster": "Rosa",
    "Played": "Giocate",
    "Won": "Vinte",
    "Drawn": "Pareggiate",
    "Lost": "Perse",
    "Total score": "Punteggio totale",
    "Points": "Punti",
    "Credits": "Crediti",

    // Players
    "Add player": "Aggiungi giocatore",
    "Add a player not present in the imported list.": "Aggiungi un giocatore non presente nel listone importato.",
    "New player": "Nuovo giocatore",
    "Name": "Nome",
    "Position": "Ruolo",
    "GK": "P",
    "DF": "D",
    "MF": "C",
    "FW": "A",
    "Market value": "Valore di mercato",
    "Saving": "Salvataggio",
    "Delete this player?": "Eliminare questo giocatore?",
    "Player not found": "Giocatore non trovato",
    "Player detail": "Dettaglio giocatore",
    "View roster": "Vedi rosa",
    "Initial value": "Valore iniziale",
    "Edit player": "Modifica giocatore",
    "Owned by": "Di",
    "Free agent": "Svincolato",
    "Save changes": "Salva modifiche",
    "Delete player": "Elimina giocatore",
    "Sync from fantaasta": "Sincronizza da fantaasta",
    "Sync summary": "Riepilogo sincronizzazione",
    "Sync players & stats": "Sincronizza giocatori e statistiche",
    "Update the listone from fantaasta and import matchday votes from Fantacalcio.it, in parallel.":
      "Aggiorna il listone da fantaasta e importa i voti della giornata da Fantacalcio.it, in parallelo.",
    "Sync all": "Sincronizza tutto",
    "Show transferred": "Mostra trasferiti",
    "All teams": "Tutte le squadre",
    "Teams": "Squadre",
    "Clear": "Azzera",
    "New": "Nuovi",
    "Updated": "Aggiornati",
    "Transferred out": "Trasferiti fuori",
    "Reactivated": "Riattivati",
    "Transferred": "Trasferito",

    // Market / Trades
    "Track transfer sessions, movement windows and market activity.": "Traccia le sessioni di mercato, le finestre di trasferimento e l'attività di mercato.",
    "Trades": "Scambi",
    "Credits adjustment": "Aggiustamento crediti",
    "Record a trade between two fantasy teams.": "Registra uno scambio tra due fantasquadre.",
    "Team A": "Squadra A",
    "Team B": "Squadra B",
    "Confirm trade": "Conferma scambio",
    "Trade history": "Storico scambi",
    "Trades recorded so far.": "Scambi registrati finora.",

    // Seasons
    "Create Season": "Crea stagione",
    "Add a new league season to the tracker.": "Aggiungi una nuova stagione di lega al tracker.",
    "New season": "Nuova stagione",
    "Year": "Anno",
    "Draft": "Bozza",
    "Finished": "Conclusa",
    "Season active": "Attiva",
    "Season archived": "Archiviata",
    "Close season": "Chiudi stagione",
    "Close this season? Final standings and top scorer/assist-man/goalkeeper awards will be stored.":
      "Chiudere questa stagione? Classifica finale e premi capocannoniere/assist-man/portiere verranno storicizzati.",
    "Closing": "Chiusura",
    "Market history": "Storico mercato",
    "No market sessions recorded yet.": "Nessuna sessione di mercato registrata.",
    "Matchday results": "Risultati per giornata",
    "No matchdays played yet.": "Nessuna giornata giocata ancora.",
    "Final standings": "Classifica finale",
    "Season awards": "Premi di stagione",
    "Top scorer": "Capocannoniere",
    "Top assist-man": "Miglior assist-man",
    "Golden Glove": "Miglior portiere",
    "goals": "gol",
    "assists": "assist",
    "clean sheets": "porte inviolate",
    "Track season status, participants and the current matchday cadence.": "Traccia lo stato della stagione, i partecipanti e il ritmo delle giornate.",

    // Participants
    "Create Participant": "Crea partecipante",
    "Add a new league participant.": "Aggiungi un nuovo partecipante alla lega.",
    "New participant": "Nuovo partecipante",
    "Participant": "Partecipante",
    "Delete this participant?": "Eliminare questo partecipante?",
    "Participant not found": "Partecipante non trovato",
    "Participant detail": "Dettaglio partecipante",
    "Credits left": "Crediti rimasti",
    "Edit participant": "Modifica partecipante",
    "Delete participant": "Elimina partecipante",

    // Rosters
    "Create Roster": "Crea rosa",
    "New roster": "Nuova rosa",
    "Create the roster and define starting budget.": "Crea la rosa e definisci il budget iniziale.",
    "Roster name": "Nome rosa",
    "Budget": "Budget",
    "Could not add player": "Impossibile aggiungere il giocatore",
    "Remove this player from the roster?": "Rimuovere questo giocatore dalla rosa?",
    "Delete this roster?": "Eliminare questa rosa?",
    "Roster not found": "Rosa non trovata",
    "Detail view for": "Vista dettaglio per",
    "Managed by": "Gestita da",
    "Purchase price": "Prezzo d'acquisto",
    "Search player": "Cerca giocatore",
    "Type a player name": "Digita il nome di un giocatore",
    "Add to roster": "Aggiungi alla rosa",
    "Delete roster": "Elimina rosa",
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
