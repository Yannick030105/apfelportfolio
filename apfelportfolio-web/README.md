# Apfelportfolio (Web-Version)

Lernspiel zum Portfoliomanagement in der Energiewirtschaft – TypeScript-Portierung
der Python/Streamlit-Version. Ergebnis ist **eine einzige HTML-Datei**, die per
Doppelklick (auch vom Netzlaufwerk) im Browser läuft, ohne Server und ohne Internet.

> Stand: Phase 6, Durchlauf 6 (fertig: Home, Level 1 und 2, Ranking, Dashboard, Tutorial, Wiki;
> Regelwerk folgt), siehe
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
Python ≥ 3.12). `tests/daten/kpi_referenz.json` enthält KPI-Soll-Werte aus der alten App
(`python3 tools/kpi_referenz_erzeugen.py`, braucht pandas und das alte Projekt in `../`).

## Spielstände und Einstellungen

Der Spielleiter wählt einmal einen gemeinsamen Ordner (z. B. auf dem Netzlaufwerk;
Chrome oder Edge). Darin legt das Spiel an:

```
<Ordner>/config.json              Regelwerk (optional; sonst gelten die eingebauten Werte)
<Ordner>/spielstaende/*.json      eine Datei je Spielwoche, gespeichert nach jedem Spieltag
```

Andere Browser nutzen die Rückfallebene: Spielstände per Dateidialog laden und als
Sammeldatei herunterladen.

### Einmalige Übernahme der alten `spiellog.csv`

```bash
python3 tools/spiellog_migrieren.py --csv <pfad>/data_store/spiellog.csv --ziel <Ordner>/spielstaende
```

Das Skript überschreibt nichts, überspringt ungültige Zeilen mit Begründung und gibt am Ende
Zeilenanzahl, Summen je Spieler (alt/neu) und 5 Stichproben aus.

## Ereignisse (Level 2)

`config/ereignisse.json` ist aus dem alten Python-Code exportiert
(`python3 tools/ereignisse_exportieren.py`, Prüfung mit `--pruefen`). Neue Szenarien werden
dort ergänzt, neue Wirkungsarten einmalig in `src/levels/effekte.ts`.

## Pipeline (`.gitlab-ci.yml`)

`referenz-unveraendert` → `test` → `build` (Artefakt `dist/apfelportfolio-<version>.html`)
→ `release` (nur bei Tag `v<version>`). Hinweise zum Betrieb aus dem Unterordner
stehen oben in der Datei.
