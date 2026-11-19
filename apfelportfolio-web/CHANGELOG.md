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
