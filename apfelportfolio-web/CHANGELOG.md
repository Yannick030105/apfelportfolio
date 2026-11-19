# Changelog

## [Unveröffentlicht]

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
