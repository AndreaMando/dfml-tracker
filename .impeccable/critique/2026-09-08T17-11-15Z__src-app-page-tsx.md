---
target: il sito (dashboard + pagine principali)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:D:\\Documenti\\VSCode\\Progetti\\dfml-tracker\\src\\app\\page.tsx"
target_fingerprint: "sha256:50e3858febbb0d61cc6b92bd846b7a36b9501ac6da2311b18636fbc59b622ae3"
target_path: "D:\\Documenti\\VSCode\\Progetti\\dfml-tracker\\src\\app\\page.tsx"
timestamp: 2026-09-08T17-11-15Z
slug: src-app-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Euristica | Punteggio | Problema chiave |
|---|---|---|---|
| 1 | Visibilità stato sistema | 2/4 | Ticker in testa (stagione/giornata/mercato) tagliato su mobile 375px, zero indizio di scroll |
| 2 | Corrispondenza sistema/mondo reale | 2/4 | Icona "Risultati" nella sidebar è un simbolo di valuta (`BadgeDollarSign`); campo "Giornate pianificate" su /seasons mostra in realtà solo l'intervallo di anni |
| 3 | Controllo e libertà utente | 3/4 | Annulla presente nel modal vendita; chiusura stagione/eliminazioni senza undo, ma coerente con l'irreversibilità reale dell'azione |
| 4 | Coerenza e standard | 2/4 | Vendita giocatore ha modal su misura; 6 punti di eliminazione/chiusura stagione usano il confirm() nativo del browser |
| 5 | Prevenzione errori | 2/4 | Input numerici voto/gol senza validazione (solo su blur, niente min/max); chiusura stagione stesso peso visivo di un'azione qualsiasi |
| 6 | Riconoscimento vs ricordo | 2/4 | Campi voto/gol/FV su /scores sono bg-transparent senza bordo — indistinguibili da testo statico finché non ci clicchi |
| 7 | Flessibilità ed efficienza | 3/4 | "Sync all" in parallelo, default sensati su selettori, tabelle ordinabili — proporzionato a un tool da 8 utenti |
| 8 | Estetica e minimalismo | 2/4 | Palette coerente, buon ritmo card — ma badge ruolo su /players falliscono WCAG AA (contrasto 2.1:1-3.8:1 su 4.5:1 richiesto, confermato dal detector su tutta la pagina) |
| 9 | Aiuto riconoscere/recuperare errori | 2/4 | Banner d'errore reali su sync/import; PATCH voto/prezzo/vendita spesso falliscono in silenzio |
| 10 | Aiuto e documentazione | 1/4 | Nessun hint inline per formula rimborso, asterisco priceUncertain, regole bonus crediti |
| **Totale** | | **21/40** | **Accettabile — miglioramenti significativi necessari** |

(Punteggio 8 rivisto da 3 a 2 rispetto alla sola valutazione umana: il detector ha trovato fallimenti WCAG concreti e ripetuti su tutta la pagina Players, non solo un'impressione soggettiva.)

## Design Specificity Verdict

**Valutazione LLM**: non è admin-CRUD generico. Badge ruolo P/D/C/A rispettano la convenzione colore di fantacalcio.it, il tabellone Coppa ricalcola gli accoppiamenti dall'ordine reale delle API (non hardcoded), Finanza ha le regole vere di questa lega (quota 40€, multa 5€, premi 200/80/40€), il sistema badge campione (stella/coppa) crea continuità storica reale tra le pagine. Ma alcune superfici scivolano verso il generico: input risultati invisibili, 6 azioni distruttive su confirm() nativo invece del linguaggio visivo del prodotto.

**Scansione deterministica**: scan statico (detect --json src/app src/components) → 1 solo finding (gray-on-color, history/page.tsx:90, testo slate-800 su sfondo amber-400 — probabile badge RANK_STYLES oro). Scan runtime via overlay browser su 5 pagine → molti più finding: dashboard 11, /scores 5, /standings 4, **/players 1190** (dominato da low-contrast sui badge ruolo, stesso pattern ripetuto per ogni giocatore), /settings 3-4. I due scanner coprono route e meccanismi diversi (sorgente statica vs DOM renderizzato), quindi i conteggi non sono sommabili.

**Overlay visivi**: niente overlay persistente nel browser dell'utente in questa run (agente ha usato tab temporanee, chiuse a fine lavoro) — i finding sopra sono il log console catturato, non un overlay ancora visibile.

**Falsi positivi noti**: overused-font (Inter 60-91% del testo) è probabilmente intenzionale, non un difetto — one-font system è una scelta di design legittima già lodata sopra. dark-glow su /settings (#ffba00) da verificare a mano, causa non chiara. nested-cards (11-600+ occorrenze) è in parte struttura SectionCard-dentro-container intenzionale, non necessariamente un difetto — ma il volume alto su /players merita un occhio.

## Overall Impression

Prodotto con carattere reale (badge campione, tabellone Coppa, regole di lega vere) ma il compito più frequente — inserire risultati ogni giornata — ha l'affordance peggiore di tutto il sito (input invisibili). Il problema più grosso in assoluto: su mobile la colonna Punti della classifica è nascosta di default, cioè il dato che l'utente cerca per primo su /standings richiede uno swipe alla cieca per apparire.

## What's Working

1. **Modal vendita giocatore** — prezzo pagato, quotazione attuale, rimborso calcolato in un colpo d'occhio, più spiegazione asterisco priceUncertain. Reassurance vera in un momento a rischio.
2. **Tabellone Coppa + badge campione** — connettori SVG che ricalcolano gli accoppiamenti dall'ordine reale delle API invece di hardcodare la struttura; badge stella/coppa che danno storia reale alla lega attraverso le pagine.
3. **Badge ruolo P/D/C/A** — stessa convenzione colore di fantacalcio.it, riduce carico di riconoscimento per chi già conosce quel sistema.

## Priority Issues

**[P0] Input voto/gol/FV invisibili**
Perché conta: è il compito più frequente dell'admin (inserire risultati ogni giornata), e non c'è alcun segnale visivo che quei campi siano editabili — verificato dal vivo desktop e mobile.
Fix: bordo/sfondo visibile a riposo (border border-line bg-surface-alt), coerente con lo stile già usato per l'input prezzo nel roster; stato borderless solo su :focus.
Comando suggerito: /impeccable polish

**[P0] Colonna Punti nascosta su mobile in /standings**
Perché conta: confermato con misure concrete dal detector (tabella scrollWidth 734 dentro un contenitore clientWidth 299, overflow-x-auto) — a 375px si vedono solo Posizione/Rosa/Giocate, Punti richiede uno swipe non segnalato da nessuna freccia o ombra. È il dato che l'utente cerca per primo su questa pagina.
Fix: vista minima fissa Posizione+Rosa+Punti su schermi stretti, resto sotto un toggle "dettagli", oppure indizio visivo di scroll (ombra/freccia a bordo destro).
Comando suggerito: /impeccable adapt

**[P1] Badge ruolo su /players falliscono il contrasto WCAG AA**
Perché conta: trovato dal detector, non dalla sola valutazione umana — contrasto reale 2.1:1-3.8:1 contro il 4.5:1 richiesto, ripetuto su ogni singola card giocatore dell'intera pagina (il pattern si ripete centinaia di volte). Colpisce direttamente utenti con bassa vista.
Fix: scurire i colori di sfondo bg-{sky,rose,emerald,amber}-500 di uno step, o passare a testo scuro su quegli sfondi chiari.
Comando suggerito: /impeccable audit

**[P1] Azioni distruttive incoerenti — modal su misura vs confirm() nativo**
Perché conta: vendere un giocatore ha un modal completo; eliminare rosa/partecipante/giocatore/transazione/penalità/sessione mercato E **chiudere una stagione** (6 punti di codice, confermati) usano il dialogo nativo del browser. Chiudere una stagione è l'azione più irreversibile del prodotto (blocca classifica finale, calcola premi, disattiva partecipanti/rose) ma ha meno peso visivo della vendita di un singolo giocatore.
Fix: portare chiusura stagione (e eliminazione rosa/partecipante) sullo stesso pattern modal della vendita, elencando le conseguenze concrete prima di confermare.
Comando suggerito: /impeccable harden

**[P2] Lingua di default è inglese, non italiano**
Perché conta: src/lib/i18n.tsx — DEFAULT_LANG: Lang = "en". Una lega privata di 8 amici italiani vede l'app in inglese ad ogni sessione senza localStorage pregresso (incognito, cache pulita, primo accesso). Fix da una riga, impatto reale su ogni nuovo utente.
Fix: DEFAULT_LANG = "it".
Comando suggerito: /impeccable harden

## Persona Red Flags

**Alex (power user, routine settimanale)**: apre /scores e non capisce che i campi voto siano editabili (P0) — deve cliccare a tentativi. La sezione "Serie A live" dice sempre "live" nel titolo anche a zero partite in corso, solo un toggle "mostra tutte" senza riga in evidenza — piccola discrepanza fra promessa dell'etichetta e contenuto.

**Sam (utente con disabilità visiva)**: input voto invisibili (P0) non danno alcun segnale a chi si affida a bordi/focus visibili. I badge ruolo su /players (P1 contrasto) sono sotto soglia WCAG su ogni card della pagina. Nota positiva involontaria: i confirm() nativi (P1 sopra) hanno supporto screen-reader migliore di un modal custom non verificato per accessibilità — ma questo non si estende al modal vendita, ben fatto ma presumibilmente non testato con screen reader.

**Casey (utente mobile, controlla classifica dal telefono)**: apre /standings dal telefono per vedere chi vince e la colonna Punti è fuori schermo di default (P0), col ticker di stato in alto anche lui tagliato senza indizio di scroll — due casi confermati di "il numero per cui sono venuto qui è a uno swipe di distanza, non scoperto".

## Minor Observations

- Nomi lunghi (es. "Benito Amilcare Andrea Mussolini") vanno a capo su due righe nella griglia Partecipanti, altezze card disomogenee.
- Nomi squadra troncati aggressivamente nel tabellone Coppa ("FC San Patri..."ehm) — accettabile ma stretto, un tooltip aiuterebbe.
- Icona elimina "×" su Mercato senza hover/focus visibile coerente con gli altri pulsanti distruttivi a pillola.
- Ticker in app-shell.tsx rifà fetch ad ogni cambio pagina più poll ogni 60s — 3 fetch paralleli solo per una barra di stato, basso rischio con 8 utenti.
- "Sync all" su Players lancia due operazioni di rete indipendenti con due banner di esito separati — funziona ma visivamente affollato per un solo click.
- Campo "Giornate pianificate" su /seasons mostra solo l'intervallo di anni, non un conteggio giornate — etichetta fuorviante.
- Icona "Risultati" in sidebar è un simbolo di valuta, non un'icona da tabellone.
- gray-on-color confermato dal detector su history/page.tsx:90 — probabile badge oro RANK_STYLES, testo slate-800 su sfondo amber-400, da verificare a vista.

## Questions to Consider

1. Cosa succederebbe se chiudere una stagione avesse lo stesso trattamento a modal della vendita giocatore, mostrando in anteprima esattamente quali rose/partecipanti si disattiveranno?
2. Cosa succederebbe se i campi risultati sembrassero vere caselle da tabellone (bordate, tabulari) invece di input numerici nudi — trasformando il compito settimanale in qualcosa che sembra "compilare una giornata" invece di "editare testo invisibile"?
3. Cosa succederebbe se "Serie A live" mostrasse la cornice live (puntino rosso pulsante) solo quando c'è davvero qualcosa in corso, e una cornice "prossime partite" più calma altrimenti?
