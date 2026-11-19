# Apfelportfolio (Web-Version)

Lernspiel zum Portfoliomanagement in der Energiewirtschaft – TypeScript-Portierung
der Python/Streamlit-Version. Ergebnis ist **eine einzige HTML-Datei**, die per
Doppelklick (auch vom Netzlaufwerk) im Browser läuft, ohne Server und ohne Internet.

> Stand: Phase 3 (Level 1 und 2 portiert, gemeinsame Level-Registry, noch ohne Oberfläche), siehe
> `CLAUDE.md` und `MIGRATION_NOTES.md`.

## Voraussetzungen

- Node.js 22 (nur für Entwicklung und Build, nicht zum Spielen)

## Befehle (ersetzen `tasks.py`)

| Befehl | Zweck |
|---|---|
| `npm ci` | Abhängigkeiten exakt nach `package-lock.json` installieren |
| `npm run dev` | Entwicklungsserver mit Live-Reload |
| `npm test` | Tests (Vitest) |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run build` | Typprüfung + Build nach `dist/index.html` (eine Datei, alles eingebettet) |
| `npm run pruefen:referenz` | Prüft, dass `tests/referenz/` unverändert ist |

Die Version steht nur in `package.json` und wird beim Build eingesetzt.

## Referenzdaten

`tests/referenz/*.json` sind die Soll-Ergebnisse aus dem alten Python-Code und
werden **nie** geändert. Erzeugt wurden sie einmalig mit
`python3 tools/referenz_erzeugen.py`. Ob sie noch zum Python-Code passen, zeigt
`python3 tools/referenz_erzeugen.py --pruefen` (braucht das alte Projekt in `../`).

`tests/daten/python_builtins.json` enthält Soll-Werte für die Nachbauten von Pythons
`round()`, `sum()`, `repr()` und `:.Nf` (erzeugt mit `python3 tools/python_builtins_erzeugen.py`,
Python ≥ 3.12).

## Ereignisse (Level 2)

`config/ereignisse.json` ist aus dem alten Python-Code exportiert
(`python3 tools/ereignisse_exportieren.py`, Prüfung mit `--pruefen`). Neue Szenarien werden
dort ergänzt, neue Wirkungsarten einmalig in `src/levels/effekte.ts`.

## Pipeline (`.gitlab-ci.yml`)

`referenz-unveraendert` → `test` → `build` (Artefakt `dist/apfelportfolio-<version>.html`)
→ `release` (nur bei Tag `v<version>`). Hinweise zum Betrieb aus dem Unterordner
stehen oben in der Datei.
