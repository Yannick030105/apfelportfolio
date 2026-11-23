# Changelog

## [Unveröffentlicht]

### Geändert
- Projektaufbau: Web-Version liegt jetzt in der Repo-Wurzel, der alte Python/Streamlit-Code
  unverändert unter `legacy/`; neue README.
- **Regel:** Ein Verkauf an die Mosterei (Montag bis Donnerstag) wird nur noch einmal vom
  Bestand abgezogen (im Original doppelt).
- Fehlermeldungen sind freundlich formuliert (keine Python-Meldungen mehr in der Oberfläche).
- Startseite: „Wähle oben dein Level, um zu starten.“
- Texte zum Importeur nennen die tägliche Obergrenze (Regelwerk-Seite, Tutorial).
- Tutorial: Hinweis auf Schritt 1, das Spiel in Chrome oder Edge zu öffnen.

### Hinzugefügt
- Phase 0: Referenzdaten aus dem Python-Spiel (`tests/referenz/`) und Generator
  `tools/referenz_erzeugen.py`.
- Phase 1: Projektgerüst – Vite-Build zu einer einzelnen HTML-Datei, Vitest,
  TypeScript, leere Module gemäß Zielstruktur, GitLab-Pipeline mit Test-, Build-,
  Release-Job und Prüfung auf unveränderte Referenzdaten.
- Phase 2: Fachmodelle (`src/domain/models.ts`) und Level 1 (`src/levels/level1Grundlast.ts`)
  portiert; exakte Nachbauten von Pythons `round()`, `int()`, `sum()`, `repr()` und
  `:.Nf`-Formatierung; Würfelquelle `src/domain/wuerfel.ts`. Alle Level-1-Referenzfälle
  bestehen.
- Phase 3: Level 2 (`src/levels/level2Ereignisse.ts`), Effekt-Bausteine
  (`src/levels/effekte.ts`), Ereignisse als `config/ereignisse.json` und gemeinsame
  Level-Schnittstelle mit Registry (`src/levels/registry.ts`). Alle Level-2-Referenzfälle
  bestehen, alle Referenzfälle beider Level zusätzlich über die Registry.
- Phase 4: Dashboard-KPIs ohne pandas (`src/dashboard/kpis.ts`) inkl. exaktem Nachbau der
  numpy-Summation (`numpySumme`); Soll-Werte aus der alten App
  (`tools/kpi_referenz_erzeugen.py`).
- Phase 5: Speicherung (`src/storage/`): eine JSON-Datei je Spielwoche im gemeinsamen Ordner,
  gespeichert nach jedem Spieltag; Ordnerzugriff (File System Access API) mit gemerktem Ordner,
  Rückfallebene per Dateidialog; Regelwerk laden/prüfen (`src/config/`); Spielernamen und
  Log-Auswertung wie im Original; einmalige Migration `tools/spiellog_migrieren.py`.
- Phase 6, Durchlauf 1: Oberfläche mit Reiter-Navigation, Speicherort-Leiste und der
  Spielseite für Level 1 und 2 (`src/ui/pages/Spielen.tsx`) inkl. Nachbildung des
  Streamlit-Verhaltens; Spielzustand (`src/state/`); vorläufige Spielerauswahl.
- Phase 6, Durchlauf 2: Ranking-Seite (`src/ui/pages/Ranking.tsx`, Berechnungen in
  `src/dashboard/ranking.ts`) mit Podium, Rangliste, eigener Statistik und Verlaufsdiagramm
  (Vega-Lite); Soll-Werte aus der Original-Seite (`tools/ranking_referenz_erzeugen.py`).
- Phase 6, Durchlauf 3: Dashboard-Seite (`src/ui/pages/Dashboard.tsx`, Berechnungen in
  `src/dashboard/dashboard.ts`) mit Profil, Level-Auswahl, KPIs, Lernkurve,
  Ergebnisentwicklung, Gewinnverteilung und Achievements; Soll-Werte aus
  `tools/dashboard_referenz_erzeugen.py`.
- Phase 6, Durchlauf 4: Startseite (`src/ui/pages/Home.tsx`, Kennzahlen in
  `src/dashboard/spielerKennzahlen.ts`) mit Händler-Karten, Neugründung, „Spiel starten“ und
  Vorschau; ersetzt die vorläufige Spielerauswahl. Soll-Werte aus `tools/home_referenz_erzeugen.py`.
- Phase 6, Durchlauf 5: Tutorial (`src/ui/pages/Tutorial.tsx`) mit 12 Schritten, Inhalt
  wörtlich in `src/content/texte/tutorial.md` (`tools/texte_exportieren.py`); Seitenwechsel per
  `src/ui/navigation.ts`.
- Phase 6, Durchlauf 6: Wiki (`src/ui/pages/Wiki.tsx`) mit 6 Kapiteln, Register zur Kapitelwahl
  und drei Beispieldiagrammen (Vega-Lite); Inhalt wörtlich in `src/content/texte/wiki.md`.
- Phase 6, Durchlauf 7: Regelwerk-Seite (`src/ui/pages/Regelwerk.tsx`) mit 11 Zahlenfeldern
  (Streamlit-Verhalten inkl. `key`-Feldern nachgebildet), Speichern in `config.json` des
  Spielordners; Mosterei-Grenze in Level 1 nutzt wie im Original das Sitzungs-Regelwerk.
  Phase 6 abgeschlossen: alle Seiten portiert.
- Beispiel-Spielordner `beispiel-spielordner/` mit Dummy-Daten (mit echter Spiellogik erzeugt,
  `npm run beispielordner`), inkl. Beschreibung des Dateiaufbaus.
