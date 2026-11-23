# 🍎 Apfelportfolio

Ein Lernspiel für Azubis: Wer einen kleinen Apfelhandel führt, lernt nebenbei, wie
Portfoliomanagement in der Energiewirtschaft funktioniert. Eine Spielwoche hat fünf Tage;
jeden Tag entscheidest du, wie viele Äpfel du beim Importeur oder auf dem Wochenmarkt
zukaufst oder an die Mosterei verkaufst, um den Bedarf von Schulessen und Bäckerei zu decken
und möglichst viel Gewinn zu machen.

Das Spiel ist **eine einzige HTML-Datei**. Sie läuft per Doppelklick im Browser – auch vom
Netzlaufwerk, ohne Server, ohne Installation und ohne Internet.

## Inhalt

| Seite | Was sie zeigt |
|---|---|
| 🏠 Home | Händler wählen oder neu gründen, Vorschau auf das letzte Ergebnis |
| 1️⃣ Level 1 – Bedarf decken | Handelstisch: Markt, Bedarf, Regler für Importeur, Wochenmarkt, Mosterei |
| 2️⃣ Level 2 – Ereignisse meistern | wie Level 1, plus ein Zufallsereignis pro Tag (z. B. Streik, Feiertag, Großauftrag) |
| 📊 Dashboard | eigene Statistik: Durchschnitt, Bestwert, Stabilität, Lernkurve, Achievements |
| 🥇 Ranking | Bestenliste je Level mit Podium und persönlichem Verlauf |
| 📕 Tutorial | Einführung in zwölf Schritten |
| 📖 Wiki | Begriffe aus Obst- und Energiehandel mit Beispielen |
| ⚙️ Regelwerk | Mengen, Preise und Limits der Spielwelt einstellen |

## Spielen

1. `apfelportfolio.html` (aus dem Build bzw. Release) an einen Ort legen, auf den alle Zugriff
   haben, z. B. das Netzlaufwerk.
2. Per Doppelklick in **Chrome oder Edge** öffnen.
3. Einmalig oben **„📁 Spielordner wählen“** und einen gemeinsamen Ordner auswählen. Darin
   speichert das Spiel alle Spielstände; der Browser merkt sich den Ordner.
4. Auf **Home** einen Händler anlegen oder auswählen und ein Level starten.

Gespeichert wird nach jedem Spieltag; eine angefangene Woche geht beim Schließen nicht
verloren.

### Der Spielordner

```
<Spielordner>/
├── config.json          Regelwerk (optional; ohne Datei gelten die eingebauten Werte)
└── spielstaende/        eine Datei je Spielwoche
```

Jede Woche ist eine eigene Datei, die nur von dem Rechner geschrieben wird, auf dem sie
gespielt wird – so können viele Azubis gleichzeitig spielen. Ranking und Dashboard lesen
alle Dateien. Ein Beispiel mit Dummy-Daten liegt in [`beispiel-spielordner/`](beispiel-spielordner/)
(Aufbau der Dateien in der dortigen README).

**Andere Browser (Firefox, Safari)** können nicht direkt in einen Ordner speichern. Dort
bleiben die Spielstände zunächst im Browser; über **„💾 Spielstände herunterladen“** werden sie
als Datei gesichert und beim nächsten Mal über **„📂 Spielstände laden“** wieder eingelesen. Das Tutorial
weist auf Schritt 1 darauf hin, Chrome oder Edge zu verwenden.

### Alte Ergebnisse übernehmen

Die Ergebnisse der alten Streamlit-Version (`spiellog.csv`) werden einmalig umgewandelt:

```bash
python3 tools/spiellog_migrieren.py --csv <pfad>/data_store/spiellog.csv --ziel <Spielordner>/spielstaende
```

Das Skript überschreibt nichts, überspringt ungültige Zeilen mit Begründung und zeigt am Ende
Zeilenanzahl, Summen je Spieler (alt/neu) und Stichproben.

## Entwicklung

Voraussetzung: Node.js 22 (nur zum Bauen, nicht zum Spielen).

| Befehl | Zweck |
|---|---|
| `npm ci` | Abhängigkeiten exakt nach `package-lock.json` installieren |
| `npm run dev` | Entwicklungsserver mit Live-Reload |
| `npm run build` | Typprüfung + Build nach `dist/index.html` (eine Datei, alles eingebettet) |
| `npm test` | Tests (Vitest) |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run pruefen:referenz` | prüft, dass `tests/referenz/` unverändert ist |
| `npm run beispielordner` | erzeugt `beispiel-spielordner/` neu |

Die Version steht nur in `package.json` und wird beim Build eingesetzt.

### Aufbau

```
src/
├── domain/      Modelle, Würfel, exakte Nachbauten von Python round()/sum()
├── levels/      Level 1, Level 2, Ereignis-Effekte, Level-Registry (neue Level hier eintragen)
├── dashboard/   Kennzahlen für Dashboard, Ranking und Startseite
├── storage/     Spielstand-Format, Ordner-Speicher, Rückfallebene, Log-Auswertung
├── config/      Regelwerk laden und prüfen
├── state/       Spielzustand der Sitzung
├── content/     Texte (Tutorial, Wiki, Übersetzungstabelle)
└── ui/          Oberfläche (Preact), Diagramme (Vega-Lite)
config/          eingebautes Regelwerk (config.json) und Ereignisse (ereignisse.json)
tests/           Tests; tests/referenz/ = eingefrorene Soll-Ergebnisse aus der alten Version
tools/           Generatoren für Soll-Werte, Texte, Beispielordner und die Migration
legacy/          alte Python/Streamlit-Version (unverändert, siehe legacy/README.md)
```

Neue Ereignisse für Level 2 kommen in `config/ereignisse.json`, neue Wirkungsarten einmalig in
`src/levels/effekte.ts`. Ein neues Level: Klasse in `src/levels/`, Adapter und Eintrag in
`src/levels/registry.ts` – die Spielseite bleibt gleich.

### Herkunft und Prüfung

Die Web-Version ist eine 1:1-Portierung der Python/Streamlit-Version in `legacy/`. Die
Spiellogik ist gegen Soll-Ergebnisse geprüft, die aus dem alten Code erzeugt wurden
(`tests/referenz/`, nie ändern; `python3 tools/referenz_erzeugen.py --pruefen` vergleicht mit
`legacy/`). Bewusste Abweichungen, Auffälligkeiten des Originals und offene Fragen stehen in
[`MIGRATION_NOTES.md`](MIGRATION_NOTES.md), Änderungen in [`CHANGELOG.md`](CHANGELOG.md).

### Pipeline (`.gitlab-ci.yml`)

`referenz-unveraendert` → `test` → `build` (Artefakt `dist/apfelportfolio-<version>.html`)
→ `release` (nur bei Tag `v<version>`, passend zu `package.json`).
