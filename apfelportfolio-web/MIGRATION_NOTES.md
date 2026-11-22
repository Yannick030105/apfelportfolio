# MIGRATION_NOTES – Apfelportfolio Python/Streamlit → TypeScript

Stand: Phase 6, Durchlauf 5 von 7 abgeschlossen (Seiten „Spielen“, „Ranking“, „Dashboard“, „Home“, „Tutorial“). Wird je Phase fortgeschrieben.

---

## 1. Zuordnung alt → neu

| Alt (Python, Repo-Wurzel) | Neu (`apfelportfolio-web/`) | Status |
|---|---|---|
| `src/apfelportfolio/domain/models.py` | `src/domain/models.ts` | **erledigt (Phase 2)** |
| – (Zufall war in den Level-Klassen) | `src/domain/wuerfel.ts` | **erledigt (Phase 2)** |
| Python-Builtins `round()`, `int()`, `f"{x:.Nf}"` | `src/domain/runden.ts` | **erledigt (Phase 2)** |
| Python-Builtin `sum()` (≥ 3.12) | `src/domain/summe.ts` | **erledigt (Phase 2)** |
| Python `repr(float)` / `str(int)` in Fehlermeldungen | `src/domain/pythonText.ts` | **erledigt (Phase 2)** |
| `ValueError` u. a. | `src/domain/fehler.ts` | **erledigt (Phase 2)** |
| `src/apfelportfolio/levels/base.py` | `src/levels/base.ts` | **erledigt (Phase 2)** |
| `src/apfelportfolio/levels/level1_grundlast.py` | `src/levels/level1Grundlast.ts` | **erledigt (Phase 2)** |
| Slider-Grenzen aus `ui/pages/1_spielen.py` (`main()`) | `eingabegrenzen_level1` in `src/levels/level1Grundlast.ts` | **erledigt (Phase 2)** |
| Tagesablauf aus `1_spielen.py` / `level_2.py` (welche Level-Methode wann) | `src/levels/registry.ts` (`SpielLevel`, Adapter, `LEVEL_REGISTRY`) | **erledigt (Phase 3)** |
| `src/apfelportfolio/levels/level2_ereignisse.py` (Level-Klasse, `Ereignis`, `Effekt`, `waehle_ereignis`) | `src/levels/level2Ereignisse.ts` | **erledigt (Phase 3)** |
| `Tageskontext`, `_skaliere_*`, `EFFEKT_FUNKTIONEN`, `IMPORTEUR_SLIDER_MAX` | `src/levels/effekte.ts` | **erledigt (Phase 3)** |
| `STANDARD_EREIGNISSE` | `config/ereignisse.json` (exportiert mit `tools/ereignisse_exportieren.py`) | **erledigt (Phase 3)** |
| Slider-Grenzen aus `ui/pages/level_2.py` (`main()`) | `eingabegrenzen_level2` in `src/levels/level2Ereignisse.ts` | **erledigt (Phase 3)** |
| `src/apfelportfolio/dashboard/kpis.py` | `src/dashboard/kpis.ts` | **erledigt (Phase 4)** |
| pandas `mean()`/`std()` (intern numpy `sum`) | `numpySumme` in `src/domain/summe.ts` + Hilfsfunktionen in `kpis.ts` | **erledigt (Phase 4)** |
| `src/apfelportfolio/data/schema.py` (`LogZeile`, `LOG_SPALTEN`) + Aufbau der LogZeile in `1_spielen.py`/`level_2.py` | `src/storage/schema.ts` (+ Spielstand-Format) | **erledigt (Phase 5)** |
| `src/apfelportfolio/data/repository.py` (`LogRepository`) | `src/storage/repository.ts` (Auswertung) + `src/storage/speicher.ts`/`ordnerSpeicher.ts`/`dateiSpeicher.ts` (Ablage) | **erledigt (Phase 5)** |
| `src/apfelportfolio/data/players.py` | `src/storage/spieler.ts` | **erledigt (Phase 5)** |
| – (Ordner merken) | `src/storage/ordnerMerken.ts` | **erledigt (Phase 5)** |
| `data_store/spiellog.csv` | `spielstaende/*.json` im gemeinsamen Ordner; einmalig `tools/spiellog_migrieren.py` | **erledigt (Phase 5)** |
| `src/apfelportfolio/data/specs_repository.py` (`RegelwerkRepository`) | `src/config/laden.ts`, `src/config/pruefung.ts` | **erledigt (Phase 5)** |
| Python `str.strip/lower`, `len(str)`, `sorted(str)` | `src/domain/pythonString.ts` | **erledigt (Phase 5)** |
| `src/apfelportfolio/content/translations.py` | `src/content/translations.ts` | **erledigt (Phase 6/1)** |
| `app.py` (Navigation, `set_page_config`) | `src/ui/App.tsx`, `src/main.tsx` | **erledigt (Phase 6/1)** |
| `ui/pages/1_spielen.py` + `ui/pages/level_2.py` | `src/ui/pages/Spielen.tsx` (eine Seite für alle Level) | **erledigt (Phase 6/1)** |
| `st.session_state` (Spielseiten) | `src/state/spielzustand.ts`, Widget-Verhalten `src/state/widgetZustand.ts` | **erledigt (Phase 6/1)** |
| `ui/components.py` (`zeige_kopfzeile`, `zeige_uebersetzungstabelle`) | `src/ui/components/allgemein.tsx` | **erledigt (Phase 6/1)** |
| Streamlit-Grundelemente (`st.title`, `st.expander`, `st.slider`, …) | `src/ui/components/streamlit.tsx`, `src/ui/styles.css` | **erledigt (Phase 6/1)** |
| `ui/components.py` (`render_player_selector`, im Original ungenutzt) | – (nicht übernommen; die vorläufige Auswahl aus Durchlauf 1 ist durch die echte Startseite ersetzt) | entfällt |
| – (Speicherort wählen) | `src/ui/components/SpeicherLeiste.tsx`, `src/ui/speicherVerbindung.ts` | **erledigt (Phase 6/1)** |
| `ui/pages/3_ranking.py` (Anzeige) | `src/ui/pages/Ranking.tsx`, Diagramm `src/ui/charts/verlauf.ts` | **erledigt (Phase 6/2)** |
| `ui/pages/3_ranking.py` (`_highscores_je_level`, `_badge_icons`, Statistik, Verlauf) | `src/dashboard/ranking.ts` | **erledigt (Phase 6/2)** |
| Plotly (`st.plotly_chart`) | Vega-Lite über `src/ui/components/VegaDiagramm.tsx` | **erledigt (Phase 6/2)** |
| `ui/pages/2_dashboard.py` (Anzeige) | `src/ui/pages/Dashboard.tsx`, Diagramme `src/ui/charts/dashboard.ts` | **erledigt (Phase 6/3)** |
| `ui/pages/2_dashboard.py` (Profil, Level-Auswahl, Balkenfarben, Klassenzahl) | `src/dashboard/dashboard.ts` | **erledigt (Phase 6/3)** |
| `ui/pages/home.py` (Anzeige) | `src/ui/pages/Home.tsx` | **erledigt (Phase 6/4)** |
| `ui/pages/home.py` (`_spieler_kennzahlen`) | `src/dashboard/spielerKennzahlen.ts` | **erledigt (Phase 6/4)** |
| `ui/pages/4_tutorial.py` (Anzeige, Ablauf) | `src/ui/pages/Tutorial.tsx` | **erledigt (Phase 6/5)** |
| `ui/pages/4_tutorial.py` (`SCHRITTE`) | `src/content/texte/tutorial.md` (exportiert mit `tools/texte_exportieren.py`), gelesen von `src/content/tutorial.ts` | **erledigt (Phase 6/5)** |
| `st.switch_page` | `src/ui/navigation.ts` | **erledigt (Phase 6/5)** |
| `ui/pages/5_wiki.py`, `6_regelwerk.py` | `Wiki.tsx`, `Regelwerk.tsx`, `src/content/texte/*.md` | offen (Phase 6/6–7) |
| `tasks.py`, `spec/*` (PyInstaller) | `package.json`, `vite.config.ts`, `.gitlab-ci.yml` | **erledigt (Phase 1)** |
| `src/apfelportfolio/version.py` (leer) | `src/version.ts` (aus `package.json`) | **erledigt (Phase 1)** |
| `config/config.json` | `config/config.json` (Kopie, eingebaute Standardwerte) | kopiert (Phase 1), Laden in Phase 5 |
| – | `tools/referenz_erzeugen.py`, `tests/referenz/*.json` | **erledigt (Phase 0)** |

---

## 2. Phase 0 – Änderungen am Python-Code (Legacy)

Einzige Eingriffe in den alten Code, alle verhaltensneutral:

- `levels/level1_grundlast.py`
  - `erzeuge_tagesmarkt(self, w1: int | None = None)`
  - `erzeuge_tagesnachfrage(self, baeckerei_menge: int | None = None)`
- `levels/level2_ereignisse.py`
  - `waehle_ereignis(ereignisse=..., ereignis_index: int | None = None)`
  - `Level2Ereignisse.erzeuge_tagesmarkt(w1=None)`, `erzeuge_tagesnachfrage(baeckerei_menge=None)`,
    `erzeuge_ereignis(ereignis_index=None)` reichen durch.
- Ohne Parameter läuft exakt der alte Code-Pfad (`random.randint` / `random.choice`, gleiche
  Reihenfolge, gleicher Zufallsverbrauch). Geprüft durch `tests/test_wuerfel_parameter.py`
  (neu, 10 Tests): Seed-Vergleich gegen einen Nachbau der alten Logik, unveränderter
  `random`-Zustand bei vorgegebenen Werten, ganze Woche gewürfelt == vorgegeben.
- **Tests / `testpaths`:** Vor Phase 0 gab es keinen Ordner `tests/` – `testpaths = ["tests"]`
  in `pyproject.toml` zeigte ins Leere, pytest fand 0 Tests. Im Wurzelverzeichnis liegt eine
  Datei `test` (nur ein Zeilenumbruch, vermutlich Überbleibsel aus dem Commit „Create test“).
  Mit dem neuen Ordner `tests/` passt `testpaths` jetzt; `pyproject.toml` blieb unverändert.

### Referenzdaten (`tests/referenz/`)

Erzeugt mit `python3 tools/referenz_erzeugen.py` (Python 3.13). Format siehe Docstring des Skripts.

| Datei | Fälle | Schritte | Fehlerschritte |
|---|---|---|---|
| `level1_wochen.json` (Regelwerk aus `config/config.json`, Seed 1000001) | 300 | 1500 | 0 |
| `level1_wochen_standardregelwerk.json` (`Regelwerk()`-Defaults) | 50 | 250 | 0 |
| `level1_grenzfaelle.json` | 30 | 156 | 6 |
| `level2_wochen.json` (Regelwerk aus `config/config.json`, Seed 2000002) | 300 | 1518 | 18 |
| `level2_wochen_standardregelwerk.json` | 50 | 251 | 1 |
| `level2_grenzfaelle.json` | 42 | 222 | 12 |

- Ein „Schritt“ = ein Klick auf „Handel abschließen“. Schlägt er mit `ValueError` fehl, folgt
  ein weiterer Schritt für denselben Tag mit denselben Würfelwerten (wie in Streamlit, wo die
  Session nach dem Fehler erhalten bleibt). `zustand_danach` hält den Level-Zustand auch nach
  Fehlern fest.
- Spielerentscheidungen in den Zufallswochen halten die Slider-Grenzen der Oberfläche exakt ein
  (`ui_grenzen` je Schritt; `null` = Slider ausgeblendet).
- Ausgabe ist deterministisch (kein Zeitstempel, SHA-256 der Legacy-Quellen statt Commit-Hash).
  `python3 tools/referenz_erzeugen.py --pruefen` vergleicht die eingecheckten Dateien mit einer
  Neuberechnung; ohne `--pruefen` verweigert das Skript das Überschreiben vorhandener Dateien.
- Zahlen sind als Python-`repr` gespeichert (exakter Round-Trip nach IEEE-754-double). Es kommen
  keine negativen Nullen, NaN oder Infinity vor. Ganzzahlige Regelwerkswerte aus `config.json`
  (z. B. `schulessen_menge: 90`) bleiben in Python `int` und erscheinen als `90`, nicht `90.0` –
  für TypeScript ohne Bedeutung.

---

## 3. Phase 1 – Gerüst

- **Abhängigkeiten** (exakt gepinnt, jeweils die neueste mindestens zwei Wochen alte
  Version): preact 11.1.1, vega 6.4.0, vega-lite 6.5.0, vega-embed 7.3.0, marked 18.1.3,
  vite 8.3.5, vite-plugin-singlefile 2.3.4, typescript 7.0.2, vitest **5.1.1**.
  Ausnahme vitest: 5.1.0 (und 4.1.12) lassen sich mit npm 10 nicht installieren
  (interner npm-Fehler `Cannot read properties of null (reading 'edgesOut')` bei der
  Peer-Auflösung); 5.1.1 (18.11.2026) behebt das.
- **JSX ohne Preact-Plugin:** `@preact/preset-vite` ist nicht erlaubt; Vite 8 transformiert
  JSX mit Oxc (`oxc.jsx.importSource = "preact"`), TypeScript mit `jsxImportSource`.
  Folge: kein Hot-Reload auf Komponentenebene im Dev-Server (voller Reload) – für den
  Build ohne Bedeutung.
- **Keine Node-Typen:** `@types/node` ist nicht erlaubt. Tests und `vite.config.ts` nutzen
  deshalb keine `node:`-Module, sondern JSON-Import und `import.meta.glob` (Vite-Typen).
  Einzige Node-Skripte sind `tools/*.mjs` (reines JavaScript, nicht typgeprüft).
- **Build:** `dist/index.html` mit allem eingebettet (geprüft: eine Datei, keine externen
  Verweise, startet per `file://` aus beliebigem Ordner ohne Konsolenfehler und ohne
  Netzwerkanfragen).
- **Referenzschutz:** `tools/referenz.sha256` (außerhalb von `tests/referenz/`) +
  `tools/referenz_pruefen.mjs`. Prüft Prüfsummen in beide Richtungen und – mit
  `REFERENZ_BASIS_SHA` (in CI: Basis des Merge Requests bzw. vorheriger Commit) – dass seit
  diesem Commit weder Referenzdateien noch die Prüfsummenliste geändert, gelöscht oder
  umbenannt wurden. Getestet: geänderte, neue, fehlende Datei sowie gemeinsame
  Manipulation von Referenzdatei und Prüfsummenliste werden erkannt.
- **Pipeline aus dem Unterordner:** GitLab liest `.gitlab-ci.yml` nur aus dem
  Repo-Wurzelverzeichnis, außer der Pfad wird in den Projekteinstellungen umgestellt.
  Die Jobs wechseln per Variable `WEB_DIR` ins richtige Verzeichnis (Standard `.`).
- **Leere Module:** Jede Datei der Zielstruktur existiert mit Kopfkommentar (Zweck,
  Python-Quelle, Phase). Zusätzlich `src/levels/registry.ts` (Architektur-Vorgabe).
  `config/ereignisse.json` folgt in Phase 3, die Level-/KPI-/Storage-Tests in ihren Phasen
  (eine leere Testdatei würde Vitest scheitern lassen). `tests/geruest.test.ts` prüft
  Version und Lesbarkeit der Referenzdaten.

---

## 3a. Phase 2 – Modelle und Level 1

- **Ergebnis:** Alle 380 Level-1-Referenzfälle (1.906 Schritte inkl. 6 Fehlerschritten)
  stimmen exakt überein – Tagesmarkt, Nachfrage, Slider-Grenzen, jede Tagesabrechnung,
  Fehlermeldungen (wörtlich), Level-Zustand nach jedem Schritt (auch nach Fehlern) und
  Wochenergebnis. Vergleich ohne Toleranz (`toEqual`, Object.is-Semantik).
- **Gegenprobe (Mutationstests, nicht eingecheckt):** Eingebaute Fehler werden erkannt –
  „reparierter“ Mosterei-Doppelabzug (374 rote Tests), naive Summe im Wochenergebnis (110),
  vertauschte Summanden im Erlös (139), `Math.round` statt `:.0f` in der Fehlermeldung (5,
  erst durch die Zusatztests in `tests/level1Zusatz.test.ts`).
- **Python-Bausteine** mit eigenen Soll-Daten aus Python (`tools/python_builtins_erzeugen.py`
  → `tests/daten/python_builtins.json`, ~17.700 Fälle, liegt bewusst nicht unter
  `tests/referenz/`): `round(x)`, `round(x, n)` (inkl. Gleichstände wie 0.125 → 0.12,
  2.675 → 2.67, Überlauf), `int()`, `f"{x:.Nf}"` (inkl. `-0`), `repr(float)`, `sum()`.
- **`sum()` ist nicht trivial:** Seit Python 3.12 summiert CPython floats kompensiert
  (Neumaier). Eine einfache Schleife ergäbe bei 196 von 680 Referenzwochen ein
  abweichendes Wochenergebnis (letzte Binärstellen). Alle `sum()`-Stellen nutzen daher
  `pythonSumme`.
- **Zusatztests mit Python-Soll** (`tests/level1Zusatz.test.ts`): halbzahlige Bestände in
  Fehlermeldungen (`122.5` → „122“, `-0.5` → „-0“), nicht ganzzahliges Wochenmarkt-Limit,
  Slider-Grenze ohne negative Null. Soll-Werte aus einem Lauf des alten Python-Codes.

## 3b. Phase 3 – Level 2 und Level-Registry

- **Ergebnis:** Alle 392 Level-2-Referenzfälle (1.991 Schritte inkl. 31 Fehlerschritten)
  stimmen exakt – zusätzlich zu Level 1 auch Ereignis und Tageskontext je Schritt.
  Außerdem laufen alle 772 Referenzfälle beider Level ein zweites Mal über die gemeinsame
  Schnittstelle `SpielLevel` (`tests/registry.test.ts`). 841 Tests insgesamt.
- **Gegenprobe (Mutationstests, nicht eingecheckt):** int/float-Typ im Limit ignoriert
  („150“ statt „150.0“): 1 roter Test; Mosterei-Slider mit ereignisbereinigter Nachfrage
  „repariert“: 212; Zustimmung ignoriert: 91; Effekt `wochenmarkt_limit` wirkungslos: 156;
  Obstbauer-Menge nicht an Level 1 durchgereicht: 156.
- **`config/ereignisse.json`** wird per `tools/ereignisse_exportieren.py` aus
  `STANDARD_EREIGNISSE` erzeugt (`--pruefen` vergleicht). Reihenfolge = Würfel-Index, Texte
  wörtlich (inkl. „ae/oe/ue“-Schreibweise des Originals), `wert` immer ausgeschrieben.
- **Gemeinsame Schnittstelle (`src/levels/registry.ts`):** `SpielLevel` mit
  `wuerfle_tag` → `bereite_tag_vor` (bei jedem Umschalten der JA/NEIN-Entscheidung neu) →
  `eingabegrenzen` (bei jeder Slider-Bewegung neu) → `rechne_tag_ab`, dazu `neue_woche` und
  `setze_zustand` (für Spielstände, Phase 5). Die Adapter rufen die Level-Methoden in
  derselben Reihenfolge auf wie die Original-Seiten, ohne eigene Logik. Neue Level: Klasse +
  Adapter + Eintrag in `LEVEL_REGISTRY`, die Spielseite bleibt gleich.

## 3c. Phase 4 – Dashboard-KPIs

- **Ergebnis:** Alle 66 KPI-Szenarien stimmen exakt mit pandas überein (Durchschnitt, bestes/
  schlechtestes Ergebnis, Streuung, Verlaufsschwelle, Badges).
- **Soll-Werte** (`tools/kpi_referenz_erzeugen.py` → `tests/daten/kpi_referenz.json`) über die
  echte Kette der alten App: Log-Zeilen aus den 773 kompletten Referenzwochen (+4 Zeilen ohne
  Endergebnis, +1 Zusatzzeile) → altes `LogRepository.anhaengen` (CSV) → `alle_laden` /
  `fuer_level` / `fuer_spieler` → alte `kpis.py`. Szenarien: leer, alle (777 Zeilen),
  je Level, die ersten 0–12 sowie 127/128/129/136/200/257 Zeilen (Grenzen der paarweisen
  Summation), je Spieler und Spieler×Level, Fälle mit NaN. Die Datei liegt in `tests/daten/`,
  weil `tests/referenz/` eingefroren ist.
- **Was pandas wirklich rechnet** (pandas 3.0.5, numpy 2.5.3, ohne bottleneck), jeweils empirisch
  bestätigt:
  - `mean()`: numpy-Summe (Startwert 0, *paarweise* Summation in 8er-Blöcken, Rekursion ab 129
    Werten; NaN als 0 mitsummiert) / Anzahl gültiger Werte – 20.000 von 20.000 Fällen gleich.
  - `std()`: Zwei-Pass-Verfahren aus `nanvar` mit `(avg - x)**2`, das numpy als `x*x` rechnet –
    40.000 von 40.000 Fällen gleich. (Pythons `x**2` nutzt `pow()` und weicht davon ab;
    deshalb in TypeScript bewusst Multiplikation statt `Math.pow`/`**`.)
  - numpy summiert auch lange Arrays ohne Puffern paarweise (geprüft bis 50.000 Werte).
- **Gegenprobe (Mutationstests):** Python-`sum` statt numpy-Summe: 25 rote Tests; einfache
  Schleife: 34; NaN-Zeilen entfernt statt als 0 mitsummiert: 2. `Math.pow(x, 2)` statt `x*x`
  bleibt grün – in V8 ist das bitgleich (5 Mio. Stichproben); der JS-Standard erlaubt aber
  ungenaues `Math.pow`, daher bleibt die Multiplikation.
- **API:** Statt DataFrame bekommen die Funktionen ein Array von Zeilen mit `endergebnis`
  (`ErgebnisTabelle`); `len(df)`/`df.empty` zählen alle Zeilen (auch NaN), `mean/max/min/std`
  überspringen NaN – wie pandas.

## 3d. Phase 5 – Speicherung und Migration

- **Ablage im gemeinsamen Ordner** (vom Spielleiter einmal gewählt):
  ```
  <Ordner>/config.json                     Regelwerk (optional, sonst eingebaut)
  <Ordner>/spielstaende/<eine Datei je Spielwoche>.json
  ```
  Jede Woche ist eine eigene Datei (`<Startzeit>_<levelId>_<Spieler>_<id>.json`), geschrieben
  nur von der Sitzung, die sie angelegt hat – mehrere Azubis können gleichzeitig vom
  Netzlaufwerk spielen, ohne sich zu überschreiben (eine gemeinsame CSV/JSON wäre hier
  fehleranfällig). Gespeichert wird nach jedem Spieltag (`status: "laufend"`, mit Level-Zustand
  zum Fortsetzen) und nach dem Freitag mit Log-Zeile (`status: "abgeschlossen"`).
  `offener_tag` hält bereits gewürfelte Werte des laufenden Tages fest (Nutzung entscheidet
  Phase 6). Pflichtfelder laut Vorgabe: `formatVersion`, `levelId`, `appVersion`.
- **Laden prüft streng** (`pruefe_spielstand`) und meldet je Datei verständlich, was nicht stimmt
  (fremdes Format, neuere Formatversion, fehlende/falsche Felder, Widersprüche wie „laufend mit
  Log-Zeile“, doppelte Kennung). Eine kaputte Datei blockiert die anderen nicht.
- **Log-Auswertung** (`repository.ts`) liefert dieselbe Tabelle wie `LogRepository.alle_laden()`:
  nur abgeschlossene Wochen; Reihenfolge = migrierte Zeilen in CSV-Folge, danach nach
  Abschlusszeit. Leere Zahlen-Zellen werden wie in pandas zu NaN.
- **Wege:** `ordnerSpeicher` (File System Access API, Chrome/Edge) mit `ordnerMerken` (Ordner in
  IndexedDB, Schreibrecht bei Bedarf neu erbitten); `dateiSpeicher` als Rückfallebene (Dateien
  wählen; eine Sammeldatei mit allen Ständen + config.json herunterladen).
- **Geprüft:**
  - Alle 772 Referenzwochen werden über die Registry gespielt, nach jedem Tag gespeichert, nach
    Tag 2 aus der Datei in einer frischen Level-Instanz fortgesetzt; danach ist jede gespeicherte
    Tagesabrechnung bitgleich mit der Python-Referenz, die Log-Zeile ebenfalls (damit ist auch
    `log_zeile` aus Phase 0 jetzt abgedeckt).
  - In echtem Chromium (Origin Private File System, gleiche Schnittstelle wie ein gewählter
    Ordner): Speichern/Laden einer Woche bitgleich, Umlaut im Dateinamen, config.json.
  - Per `file://` geöffnet (Doppelklick): `isSecureContext = true`, `showDirectoryPicker` und
    IndexedDB vorhanden.
  - Gegenprobe: Zustand beim Fortsetzen nicht wiederhergestellt (3 rote Tests), migrierte
    Zeilen nicht zuerst (1), naive Summe für `rest_long_short` (1, Zusatzfall mit Python-Soll).
  - **Nicht prüfbar in dieser Umgebung:** der echte Ordner-Dialog, ein Windows-Netzlaufwerk
    und ob der gemerkte Ordner unter `file://` einen Browser-Neustart übersteht → in Phase 6
    auf einem echten Rechner prüfen.
- **Spiellog-Migration** (`tools/spiellog_migrieren.py`): je CSV-Zeile eine Datei
  `migriert_<zeile>_<levelId>_<Spieler>.json` (ohne Tagesdetails, mit Log-Zeile und den
  unveränderten Zelltexten). Zahlen = exakter Wert des CSV-Textes (Entscheidung zu offener
  Frage 8). Ungültige Zeilen werden übersprungen und begründet; nichts wird überschrieben;
  nach dem Schreiben wird alles zurückgelesen und gegen den CSV-Text geprüft. Bericht:
  Zeilenanzahl, Summen je Spieler alt/neu, 5 Stichproben nebeneinander (Beispiele:
  `tests/daten/migration/bericht_*.txt`). Echte `spiellog.csv`: 20/20 Zeilen, 0 Abweichungen,
  1 Endergebnis las die alte App eine Binärstelle anders, Summen je Spieler identisch.

## 3e. Phase 6, Durchlauf 1 – Seite „Spielen“ (Level 1 und 2)

- **Umfang:** Rahmen mit Reitern (Gruppen und Symbole wie `st.navigation` in `app.py`), Leiste für
  den Speicherort, Spielzustand, Spielseite für beide Level, vorläufige Spielerauswahl auf
  „Home“ (bis zu deren Durchlauf). Übrige Seiten zeigen einen Platzhalter.
- **Eine Seite für alle Level:** `Spielen.tsx` spricht die Level nur über `SpielLevel`
  (`registry.ts`) an. Unterschiede der Original-Seiten hängen an `hat_ereignisse`:
  Ereigniskarte, JA/NEIN-Schalter, Wetterkarte, „gesperrt“-Anzeige, „heute“- statt
  „fix“-Werte, Ereignistitel in der Wochenübersicht. Texte wörtlich aus beiden Seiten.
- **Geprüft:** Alle 772 Referenzwochen laufen über die Aktionen der Spielseite
  (`Spielzustand.schliesse_tag_ab` usw.) bitgleich (`tests/spielzustand.test.ts`). Im Browser
  (Chromium, per `file://`): Spieler anlegen inkl. Namensprüfung, komplette Level-1-Woche mit
  Ende-Meldung, Level 2 mit Ereignis-, Wetter- und Bedarfskarte, Seitentitel je Level, keine
  Konsolenfehler, keine Netzwerkzugriffe, keine horizontale Überlänge auf Handybreite.

### Nachgebildetes Streamlit-Verhalten (Spielseite)

| Streamlit | Nachbildung |
|---|---|
| Jede Eingabe startet das Skript neu (Rerun) | Jede Eingabe zeichnet die Seite neu; Tageskontext (Ereigniswirkung) und Slider-Grenzen werden dabei wie in `level_2.py` jedes Mal neu berechnet. |
| Slider ohne `key`: Wert bleibt, solange Beschriftung und Parameter (min/max/value) gleich sind | `WidgetZustand` bildet die Widget-ID aus Beschriftung + Parametern. Folge wie im Original: Importeur- und Wochenmarkt-Wert bleiben über „Handel abschließen“ hinweg stehen (auch über „Neue Woche starten“ mitten in der Woche). |
| Neue ID (z. B. anderes Maximum) → neues Widget mit Startwert | Mosterei-Slider springt auf 0, sobald sich sein Maximum ändert – also bei jeder Änderung von Importeur/Wochenmarkt (geprüft im Browser). Gleiches für den Importeur-Slider am Rabatt-Tag (Maximum 450). |
| Nicht angezeigte Widgets verlieren ihren Zustand | Am Donnerstag (kein Importeur-Slider), bei „Kein Überschuss“ (kein Mosterei-Slider) und am Wochenende (gar keine Slider) wird der Wert verworfen; danach beginnt der Slider bei 0. Seitenwechsel verwirft alle Slider-Werte (Seite wird neu aufgebaut). |
| `st.toggle(text, value=ereignis_zugestimmt)` | Schalter zeigt `ereignis_zugestimmt`; wird je neuem Tag auf „aus“ gesetzt. |
| `if tagesmarkt is None` → würfeln | Gewürfelt wird genau einmal je Tag (beim ersten Anzeigen bzw. nach „Handel abschließen“), Werte bleiben bis zum Abschluss – auch nach Neuladen (gespeichert als `offener_tag`). |
| Ausnahme (`ValueError`) in `_tag_abschliessen` → roter Fehlerkasten, Skript endet | Fehlerkasten „ValueError: …“ unter dem Handelstisch, Wochenübersicht entfällt wie bei abgebrochenem Skript; Tag bleibt offen, Slider behalten ihre Werte; nächste Eingabe blendet den Kasten aus. Die Preishistorie wurde wie im Original schon vor der Abrechnung ergänzt. |
| `st.button` + `st.rerun()` | Knopf löst die Aktion aus und zeichnet neu. |
| `st.balloons()` | Ballon-Animation bei nicht-negativem Wochenergebnis (respektiert „reduzierte Bewegung“). |
| `st.slider` mit `min_value >= max_value` → `StreamlitAPIException` | Fehlermeldung an der Stelle des Sliders (z. B. bei Regelwerk-Limit 0). |
| `set_page_config(page_title, page_icon)` | Browser-Titel und -Symbol je Seite („Level 1 – Apfelportfolio“ 🍎, „Level 2 – Apfelportfolio“ 🌩️). |

## 3f. Phase 6, Durchlauf 2 – Seite „Ranking“

- **Berechnungen** (`src/dashboard/ranking.ts`) gegen Soll-Werte aus den ORIGINAL-Funktionen von
  `3_ranking.py` (`tools/ranking_referenz_erzeugen.py` → `tests/daten/ranking_referenz.json`;
  streamlit/plotly werden dafür durch Attrappen ersetzt). Daten: echte `spiellog.csv` + 120
  Referenzwochen auf 8 Spieler verteilt (inkl. „anna“/„Anna“/„Ärne“ für die Sortierung), über
  das alte `LogRepository` geschrieben und gelesen. Geprüft je Level: Bestenliste (Rang,
  Spieler, Ergebnis, Podium-/Kartentext), Badges je Spieler, eigene Statistik inkl.
  Meldungstext für jeden Spieler, Verlauf je Spieler.
- **Browser-Test** über den echten Ordner-Weg: Spielordner (Origin Private File System als
  Ersatz für den Ordnerdialog) mit den 20 migrierten Spielständen der echten `spiellog.csv`
  verbunden, Spieler „Anna“ gewählt: Podium (2.–1.–3.), Rangliste, Hervorhebung, Meldung
  „Platz 4 von 5 … 259.80 €“, Statistik-Kacheln, Diagramm erst beim Aufklappen, Level-2-Reiter;
  keine Fehler, keine Anfragen nach außen; Datumsachse auch in Zeitzone UTC−8 korrekt.
- **Diagramm:** Plotly → Vega-Lite (rote Linie 3 px, goldene Punkte, Fläche bis 0, Höhe 260,
  y-Titel „Endergebnis (€)“). Datum als UTC-Tag (keine Verschiebung durch die Zeitzone),
  Achsenmarken an ganzen Tagen, Tooltip mit Datum/Ergebnis. Die Datei wächst durch Vega auf
  rund 950 kB (gzip 325 kB).

### Nachgebildetes Streamlit-Verhalten (Ranking)

| Streamlit | Nachbildung |
|---|---|
| `repo.alle_laden()` bei jedem Seitenaufruf (Ergebnisse anderer Spieler erscheinen sofort) | Beim Öffnen der Seite werden alle Spielstände neu aus dem Ordner gelesen. |
| `st.tabs(["Level 1", "Level 2"])`: alle Reiter gezeichnet, Umschalten ohne Rerun | `Reiter`: beide Inhalte gezeichnet, nur der gewählte sichtbar; Zustand (z. B. aufgeklappter Verlauf) bleibt beim Umschalten. |
| `st.expander` mit `st.plotly_chart` | Diagramm wird erst beim Aufklappen gezeichnet (sonst Breite 0). |
| `layout="centered"` | schmale Seite (max. 760 px) wie im Original. |
| `set_page_config(page_title="Ranking – Apfelportfolio", page_icon="🥇")` | Browser-Titel/-Symbol. |

## 3g. Phase 6, Durchlauf 3 – Seite „Dashboard“

- **Berechnungen** (`src/dashboard/dashboard.ts` + KPIs aus `kpis.ts`) gegen Soll-Werte aus den
  Ausdrücken von `2_dashboard.py` mit den Original-KPI-Funktionen
  (`tools/dashboard_referenz_erzeugen.py` → `tests/daten/dashboard_referenz.json`; gleiche
  Log-Zeilen wie beim Ranking). Geprüft für 12 Spieler (inkl. einem ohne Durchläufe) und Level
  1–4: Profiltexte, alle vier KPI-Texte, Lernkurven-Schwelle und -Hinweis, Reihenfolge der
  Durchläufe, Balkenfarben, Histogramm-Klassenzahl (auch für 0–40), Achievements.
- **Browser-Test** über den Ordner-Weg mit 140 Spielständen: Profil und KPI-Texte für Level 1
  und 2 identisch mit den Python-Soll-Werten, drei Diagramme, Achievements frei/gesperrt,
  Hinweis für Level 3, Auswahl steht nach Seitenwechsel wieder auf „Level 1“, keine Fehler,
  keine Anfragen nach außen, keine Überbreite auf Handybreite.

### Nachgebildetes Streamlit-Verhalten (Dashboard)

| Streamlit | Nachbildung |
|---|---|
| `repo.alle_laden()` / `repo.fuer_level()` bei jedem Durchlauf | Spielstände werden beim Öffnen der Seite neu gelesen. |
| `st.selectbox("Level", options=[1, 2, 3, 4])` ohne `key`: Wert bleibt bei Reruns, Startwert „Level 1“; Seitenwechsel verwirft ihn | Auswahl lebt im Zustand der Seite; beim Wiederkommen „Level 1“. Level 3 und 4 sind wie im Original wählbar und zeigen „Noch keine Durchläufe …“. |
| `st.columns([3, 1])`, darin `st.columns(4)` bzw. `st.columns(2)` | gleiche Spaltenaufteilung; auf schmalen Bildschirmen untereinander. |
| `st.plotly_chart(use_container_width=True)` | Vega-Lite-Diagramme in voller Spaltenbreite. |
| `set_page_config(page_title="Dashboard – Apfelportfolio", page_icon="📊", layout="wide")` | Browser-Titel/-Symbol, Seitenbreite max. 1180 px wie im Original-CSS. |

## 3h. Phase 6, Durchlauf 4 – Seite „Home“

- **Händler-Kennzahlen** (`src/dashboard/spielerKennzahlen.ts`) gegen die ORIGINAL-Funktion
  `_spieler_kennzahlen` aus `home.py` (`tools/home_referenz_erzeugen.py` →
  `tests/daten/home_referenz.json`; gleiche Log-Zeilen wie beim Ranking, keine mehrdeutigen
  „letzten Zeilen“). Geprüft für 12 Spieler und das leere Log: Level-Anzeige, Bestergebnis,
  letzter Rang, letzter Gewinn, Wochen, Badges sowie die Texte von Karte und Vorschau.
- **Browser-Test:** ohne Ordner Händler gründen (Knopf erst nach Enter, Name bleibt im Feld),
  „Spiel starten“ mit Meldung und Ballons, die bei der nächsten Eingabe verschwinden; mit Ordner
  (140 Spielstände) 11 Karten ohne Abweichung zur Python-Referenz, Namensprüfung („anna “ →
  vergeben), Wechsel des aktiven Händlers samt Vorschau (#9 / 88.30 € / 3), Kartenreihenfolge auf
  Handybreite spaltenweise; keine Fehler, keine Anfragen nach außen.
- Die vorläufige Spielerauswahl aus Durchlauf 1 ist entfernt.

### Nachgebildetes Streamlit-Verhalten (Home)

| Streamlit | Nachbildung |
|---|---|
| `repo.alle_laden()` / `get_existing_players()` bei jedem Durchlauf | Spielstände werden beim Öffnen der Seite neu gelesen. |
| `st.columns(3)`, Karte *i* in Spalte *i* % 3; schmal: Spalten untereinander | drei echte Spalten mit derselben Verteilung; unter 640 px untereinander (Reihenfolge 1, 4, 7, …, 2, 5, … wie in Streamlit). |
| `st.text_input` übernimmt den Text erst bei Enter oder beim Verlassen des Feldes; der Wert bleibt bei Reruns stehen | Entwurf beim Tippen, Übernahme bei Enter/Verlassen; erst dann Prüfung, Warnung bzw. „✅ Gründen und loslegen“. Nach dem Gründen bleibt der Name im Feld. |
| `st.button("▶ Spiel starten", disabled=kein Spieler)` → `st.success` + `st.balloons()` nur in diesem Durchlauf | Meldung und Ballons nach dem Klick, verschwinden bei der nächsten Eingabe (Karte wählen, Name übernehmen). |
| Karten-Knopf → `current_player` setzen + `st.rerun()` | Knopf setzt den aktiven Händler; die Karte wird hervorgehoben, ihr Knopf zeigt „🎮 Aktiver Händler“ und ist deaktiviert. |
| `set_page_config(page_title="Apfelportfolio", page_icon="🍎", layout="centered")` | Browser-Titel/-Symbol, Seitenbreite max. 780 px wie im Original-CSS. |

## 3i. Phase 6, Durchlauf 5 – Seite „Tutorial“

- **Inhalt:** `SCHRITTE` (12 Schritte) wörtlich nach `src/content/texte/tutorial.md` exportiert
  (`tools/texte_exportieren.py`, `--pruefen` vergleicht); `tests/tutorial.test.ts` prüft, dass das
  Einlesen exakt den Python-Abzug ergibt.
- **Vergleich mit dem laufenden Original:** Die alte App lief in einer Hilfsumgebung (Streamlit
  1.67 im Scratchpad, Kopie des Repos, damit Log und Konfiguration unberührt bleiben). Gemessen:
  Der Tutorial-Schritt bleibt beim Seitenwechsel erhalten; berechnete Stile der Elemente.
  Befehl zum Nachstellen: `pip install streamlit pandas pyarrow altair plotly` in einer eigenen
  Umgebung, dann in einer Kopie des Repos `PYTHONPATH=src streamlit run app.py`.
- **Browser-Test** (`file://`): Schritt 1 mit deaktiviertem „Zurück“, Fortschrittspunkte
  (erledigt/aktuell/offen), Schritt bleibt nach Seitenwechsel, letzter Schritt zeigt
  „🚀 Zur Startseite“ → Startseite, Tutorial danach wieder auf Schritt 1; keine Fehler.

### Nachgebildetes Streamlit-Verhalten (Tutorial)

| Streamlit | Nachbildung |
|---|---|
| `st.session_state.tutorial_schritt` (bleibt über Seitenwechsel, im Original gemessen) | `Spielzustand.tutorial_schritt`; auf 0..11 begrenzt. |
| `st.button("⬅ Zurück", disabled=index == 0)` + `st.rerun()` | deaktiviert auf Schritt 1, sonst einen Schritt zurück. |
| letzter Schritt: `st.button("🚀 Zur Startseite")` → Schritt 0 + `st.switch_page(home)` | Schritt 0, Wechsel zur Startseite (`NavigationKontext`). |
| `set_page_config(page_title="Tutorial – Apfelportfolio", page_icon="🎓", layout="centered")` | Browser-Titel/-Symbol, max. 720 px. |

### Darstellung: beabsichtigtes Design statt tatsächlicher Streamlit-Anzeige (Entscheidung)

Der Vergleich mit dem laufenden Original zeigte: Streamlit stellt viele CSS-Absichten der Seiten
nicht dar. (1) Rahmen, die mit einem eigenen `st.markdown('<div class="...">')` geöffnet werden
(`desk-panel`, `console-panel`, `trade-button`, `start-zone`, `nav-row`), schließt der Browser
sofort – sie erscheinen als leere Kästchen (gemessen: 36 px hoch, ohne Inhalt), der Inhalt
steht darunter ohne Rahmen; (2) Schriftgrößen an `<p>`-Elementen überschreibt Streamlit mit
16 px (z. B. „Apfelportfolio“ auf Home statt 3rem, Abschnittsüberschriften, Tutorial-Titel);
(3) goldene Knöpfe („Handel abschließen“, „Spiel starten“, „Weiter ➜“) sind schlichte weiße
Streamlit-Knöpfe. **Auf Rückfrage entschieden:** Die Web-Version zeigt das beabsichtigte Design
(wie das CSS es vorsieht) auf allen Seiten. Spiellogik, Texte und Abläufe bleiben exakt.

---

## 4. Bewusste Abweichungen

Kein abweichendes Spielverhalten. Strukturelle Entscheidungen der Portierung:

1. **Namen wie in Python (snake_case)** für Felder, Methoden und Klassen, damit die
   Portierung Zeile für Zeile prüfbar bleibt und Feldnamen, die als Daten vorkommen
   (`"preis_importeur"` in Ereignis-Effekten, Referenz-JSON), unverändert passen.
2. **Würfelwerte sind Pflichtparameter:** `erzeuge_tagesmarkt(w1)` und
   `erzeuge_tagesnachfrage(baeckerei_menge)` würfeln nicht mehr selbst (CLAUDE.md: Zufall nur
   über `wuerfel.ts`). Gewürfelt wird beim Aufrufer mit `wuerfleW1` /
   `wuerfleBaeckereiMenge` – gleiche Spannen wie im Original (inkl. `int()` der Mengengrenzen).
3. **Slider-Grenzen in der Logikschicht:** Die Berechnung aus `1_spielen.py` liegt als
   `eingabegrenzen_level1` in `level1Grundlast.ts`, damit sie gegen `ui_grenzen` der
   Referenzdaten getestet ist. Formel unverändert (inkl. `int()`-Abschneiden).
4. **int/float-Unterscheidung in Fehlermeldungen:** Python setzt int-Werte ohne, float-Werte
   mit „.0“ ein. TypeScript kennt nur `number`. Mengen aus der Oberfläche sind immer float
   (`float(slider)`) → `pythonRepr`; Regelwerk-Limits sind in Python als int typisiert →
   `pythonIntText` (ganzzahlig ohne „.0“, sonst repr). Einziger theoretischer Unterschied:
   ein in `config.json` als `300.0` geschriebenes Limit erschiene in Python als „300.0“, hier
   als „300“.
5. **Frozen Dataclasses** → `readonly` + `Object.freeze`; `dataclasses.asdict(regelwerk)` →
   `Regelwerk.als_dict()`; `dataclasses.replace(x, ...)` → `x.ersetzt({...})`.
6. **Tageskontext führt den Python-Typ des Wochenmarkt-Limits mit**
   (`wochenmarkt_limit_typ: "int" | "float"`): Python setzt das Limit in die Fehlermeldung als
   „300“ (int aus dem Regelwerk) bzw. „150.0“ (nach `int * 0.5`) ein. Ohne Regelwerk-Wert
   (Dataclass-Default 140.0) ist es float. Reines Hilfsfeld, ändert keine Berechnung.
7. **Ereignis-Index ist Pflichtparameter** (`erzeuge_ereignis(index)`, gewürfelt mit
   `waehleIndex`); negative Indizes zählen wie in Python vom Ende, sonst `IndexError`.
8. **`lade_ereignisse` prüft die Struktur** von `ereignisse.json` beim Laden (Felder, Typen) und
   meldet Fehler verständlich. Unbekannte Effekt-Namen fallen – wie im Original – erst bei der
   Anwendung auf (`KeyError`). Im Original waren die Ereignisse Python-Code, Strukturfehler
   waren dort Syntax-/Typfehler.
9. **Level-2-Ablauf über den Adapter:** Bei Ereignissen ohne Entscheidung erzwingt der Adapter
   `zugestimmt = false` (in `level_2.py` gibt es dann keinen Schalter, der Wert bleibt False).
   Wirkt sich nicht aus, weil solche Effekte ohnehin immer greifen.
10. **KPIs ohne pandas:** Eingabe ist ein Array von Zeilen statt DataFrame; numerisch
    bitgleich (siehe 3c). Die Gruppierungen der Seiten (`groupby("spieler")...idxmax()` in
    `3_ranking.py`, `...max()` in `home.py`, Dashboard-Charts) gehören nicht zu `kpis.py` und
    werden mit den Seiten in Phase 6 portiert.
11. **Spielstand-Dateien statt spiellog.csv** (Vorgabe): eine Datei je Woche, gespeichert nach
    jedem Tag. Im Original ging eine laufende Woche beim Neuladen der Seite verloren; jetzt
    lässt sie sich fortsetzen. Für Ranking/Dashboard/Namensprüfung zählen – wie bisher – nur
    abgeschlossene Wochen.
12. **config.json verständlich prüfen:** Gleiche Rückfall-Regeln wie `RegelwerkRepository.laden()`
    (kaputt/kein Objekt/unbekannter Schlüssel → Standardwerte `Regelwerk()`, fehlende Felder →
    Feld-Default, keine `validiert()`-Prüfung beim Laden), aber mit Meldungen. Abweichungen:
    Nicht-Zahlen (z. B. `"300"`) führen zu den Standardwerten (Original: übernommen, später
    Absturz); eine unlesbare Datei (Netzwerkfehler) führt zum eingebauten Regelwerk statt zum
    Absturz. Ohne config.json im Ordner gilt die eingebaute config/config.json (= Datei neben der
    alten EXE). Die Regelwerk-Seite schreibt config.json in den gemeinsamen Ordner (offene Frage 4).
13. **config.json-Schreibweise:** `JSON.stringify` statt `json.dumps` – gleicher Aufbau, aber
    ganzzahlige Floats erscheinen als `200` statt `200.0`. Beim Wiedereinlesen identisch.
14. **Migration nimmt exakte Zahlenwerte** (offene Frage 8), nicht pandas' leicht verfälschte
    Lesart (Auffälligkeit 19).
15. **Spielernamen wie „NA“, „null“, „None“** las die alte App per pandas als „fehlend“ (Spieler
    verschwand aus Ranking und Namensliste). Die Migration übernimmt den Namen und warnt.
16. **Kennungen und Zeitstempel** (`neue_id`, `toISOString`) sind kein Spielzufall und laufen
    daher nicht über `wuerfel.ts`.
17. **Getrennte Wochen je Spieler und Level** (Phase 6/1): Im Original teilen sich
    `1_spielen.py` und `level_2.py` dieselben Session-Schlüssel (`woche`, `tag_index`,
    `tagesmarkt`, `tagesnachfrage`) – wer mitten in einer Woche das Level wechselt, spielt
    dieselbe Woche mit dem anderen Level-Objekt weiter (Mischergebnis wird als neues Level
    geloggt); wer den Spieler wechselt, bekommt die laufende Woche unter neuem Namen
    geloggt. Das lässt sich im Spielstand-Format (eine Woche = ein Level, ein Spieler; Vorgabe
    `levelId`) nicht abbilden und ist kein Verhalten, das jemand bewusst nutzt. Jetzt hat jede
    Kombination aus Spieler und Level ihre eigene Woche.
18. **Navigation über Reiter** statt Streamlit-Seitenleiste (Vorgabe), gleiche Gruppen,
    Reihenfolge, Titel und Symbole; „Level 1“ und „Level 2“ zeigen dieselbe Spielseite.
19. **Fehlerkasten statt Python-Traceback** bei `ValueError` (Text der Meldung unverändert).
20. **Ersatzschriften** statt Google Fonts (Baloo 2, Nunito, JetBrains Mono): externe Quellen sind
    verboten, die Datei muss offline vom Netzlaufwerk laufen.
21. **Speicherort-Leiste** (neu): zeigt, wohin gespeichert wird, und bietet Ordner wählen /
    wieder verbinden bzw. die Rückfallebene. Ohne gewählten Ordner läuft das Spiel trotzdem,
    mit deutlichem Hinweis, dass nichts gespeichert wird.
22. **Mosterei-Slider in Level 1** rechnet mit der Obstbauer-Menge des Level-Objekts
    (`eingabegrenzen_level1`); das Original nimmt `st.session_state.regelwerk`. Beide sind
    gleich, solange das Regelwerk nicht während der Sitzung geändert wird (siehe
    Auffälligkeit 20) – endgültig zu klären im Durchlauf „Regelwerk“.
23. **Reihenfolge bei gleichen Bestwerten (Ranking) ist festgelegt:** pandas sortiert mit
    numpy-`quicksort`, der auf x86 mit SIMD (AVX-512/AVX2) nicht stabil ist – schon bei
    5 Spielern weicht die Reihenfolge gleicher Werte in 79 von 350 Stichproben von einer stabilen
    Sortierung ab, und sie hängt vom Prozessor ab. Eine exakte Nachbildung ist daher nicht
    möglich. Hier gilt: gleiche Bestwerte in Gruppenreihenfolge (alphabetisch nach Codepoints),
    Ränge fortlaufend. Gleiches für gleiche Daten im Verlauf (Log-Reihenfolge).
24. **Ranking-Reiter aus der Level-Registry** statt fest „Level 1“/„Level 2“ – heute identisch,
    ein neues Level erscheint automatisch.
25. **Plotly → Vega-Lite** (erlaubte Abhängigkeit); Aussehen nachgebildet, Achsenbeschriftung
    im Vega-Stil („Aug 01, 2026“).
26. **Klassengrenzen der Gewinnverteilung:** Plotly nutzt `nbinsx` nur als Obergrenze und wählt
    „schöne“ Grenzen nach eigenem Verfahren (in plotly.js, im Browser); Vega-Lite macht mit
    `maxbins` dasselbe nach eigenem Verfahren. Die Klassenzahl-Vorgabe ist identisch und
    getestet, die konkreten Grenzen können abweichen (reine Darstellung, nicht prüfbar ohne
    Plotly).
27. **Dashboard-Level-Auswahl bleibt fest 1–4** wie im Original (nicht aus der Level-Registry),
    weil das Original bewusst Level 3/4 anbietet.
28. **„Letzte Zeile“ auf der Startseite festgelegt:** `_spieler_kennzahlen` nimmt
    `sort_values("datum").iloc[-1]`; bei mehreren Wochen am selben letzten Tag (im Unterricht
    üblich) entscheidet numpys nicht stabile Sortierung (prozessorabhängig), welche als „letzte“
    gilt – und damit „Letzter Gewinn“ und das Level für „Letzter Rang“. Hier: die zuletzt
    abgeschlossene Woche (stabile Sortierung). Fehlendes Datum gilt wie bei pandas als letzte
    Zeile.
29. **Beabsichtigtes Design statt tatsächlicher Streamlit-Anzeige** (auf Rückfrage entschieden,
    siehe 3i): Rahmen, Schriftgrößen und goldene Knöpfe wie im CSS vorgesehen.

---

## 5. Auffälligkeiten im Originalcode (unverändert portieren!)

1. **Mosterei-Verkauf Mo–Do wird doppelt vom Bestand abgezogen.** In
   `Level1Grundlast.rechne_tag_ab` enthält `lieferung` bereits `an_mosterei`, danach wird
   `saldo = zukauf - lieferung - an_mosterei` gerechnet. Beleg: `level1_grenzfaelle.json`,
   Fall `mosterei_maximal_mo_bis_do`, Montag: 200 − 90 − 10 − 100 ergibt Saldo −100 statt 0.
   Erlös wird nur einmal gutgeschrieben. Am Freitag tritt der Effekt nicht auf (dort ist
   `an_mosterei` beim Berechnen von `lieferung` noch 0).
2. **`importeur_limit` ist keine Wochengrenze.** Laut Kommentar „max. Äpfel Mo–Mi“, genutzt wird
   es aber nur als Slider-Maximum *pro Tag*. `_importeur_menge_woche` wird hochgezählt, aber nie
   geprüft. Die Logik akzeptiert auch Mengen über dem Slider-Maximum (Fall
   `importeur_ueber_slider_max`).
3. **Teil-Mutation bei Fehler:** `_importeur_menge_woche` wird *vor* der Mosterei-Prüfung erhöht;
   schlägt diese fehl, bleibt die Erhöhung stehen (Fall `fehler_mosterei_nach_importeur`).
   Wirkt sich mangels Prüfung (Punkt 2) nicht aus.
4. **Level 2: Mosterei-Slider rechnet mit der Nachfrage *vor* dem Ereignis** (`level_2.py` nutzt
   `nachfrage` statt `kontext.nachfrage`), die Logik prüft gegen `kontext.nachfrage`.
   - Bei „Großauftrag der Bäckerei“ erlaubt der Slider zu viel → `ValueError` in der Logik
     (in Streamlit eine Traceback-Seite). Kommt in den Zufallswochen 18-mal vor.
   - Bei „Projektwoche“ ist das Slider-Maximum zu niedrig.
   - Die Obstbauer-Menge nimmt der Slider dagegen *nach* dem Ereignis (`kontext.obstbauer_menge`).
5. **Freitags-Ausgleich kauft am Wochenmarkt auch dann, wenn er per Ereignis geschlossen ist**,
   und ohne Rücksicht auf das Tageslimit (Fall `freitag_feiertag_fehlmenge`).
6. **Mosterei-Eingabe am Freitag wird ignoriert** (die Oberfläche setzt 0, die Logik überschreibt
   ohnehin; Fall `mosterei_eingabe_am_freitag_ignoriert`).
7. **Tote Konstanten und Default-Werte:** In `level1_grundlast.py` werden `OBSTBAUER_MENGE`,
   `OBSTBAUER_PREIS`, `SCHULESSEN_MENGE`, `SCHULESSEN_PREIS`, `WUERFEL_MIN/MAX`,
   `BAECKEREI_MENGE_FAKTOR`, `WOCHENMARKT_MAX_PRO_TAG`, `IMPORTEUR_MAX_GESAMT_MO_MI` nicht mehr
   benutzt (das Regelwerk hat sie abgelöst). Die Defaults von `Tageskontext`
   (`obstbauer_menge=100`, `wochenmarkt_limit=140`, `importeur_slider_max=IMPORTEUR_SLIDER_MAX=100`)
   werden in `wende_ereignis_an` immer mit Regelwerkswerten überschrieben. Docstrings beschreiben
   teils alte Regeln (80 Stück Schulessen, Bäckerei = 10 × W2).
8. **Level 2 `importeur_slider_max`** startet bei `regelwerk.importeur_limit` (config: 300); mit
   angenommenem Rabatt × 1,5 = 450, nicht „150“ wie im Kommentar.
9. **`config/config.json` weicht stark von den `Regelwerk`-Defaults ab** (Importeur 300 statt
   200, Wochenmarkt 300 statt 140, Schulessen 90 statt 80, Obstbauer 200 statt 100). Mit der
   Config gibt es ohne Mosterei-Verkäufe praktisch nie Fehlmengen. `Regelwerk.validiert()` wird
   beim Laden nicht aufgerufen; `wochenmarkt_limit_tag` wird auch in `validiert()` nicht geprüft.
   `RegelwerkRepository.laden()` fällt bei defekter Datei stillschweigend auf die Defaults zurück.
10. **Doppelter Modul-Import:** `app.py`, `data/repository.py` und `data/specs_repository.py`
    importieren `src.apfelportfolio...`, die Seiten und Level dagegen `apfelportfolio...`. Dadurch
    gibt es zwei verschiedene `Regelwerk`-Klassen. Funktional ohne Wirkung.
11. **Fehlermeldungen nutzen Python-Formatierung:** `f"{einkauf.wochenmarkt_menge}"` → `301.0`,
    `f"{x:.0f}"` rundet half-to-even (Banker's Rounding), bei negativem Bestand z. B. `(-120)`.
12. **Rundung der Slider-Grenzen:** Die Oberfläche nutzt `int(...)` (Abschneiden Richtung 0),
    nicht `round()`. Die Logik prüft gegen den ungerundeten Float-Wert `max(bestand, 0.0)`.
13. **Log-Zeile:** `anteil_spot=0.0`, `anteil_grundlast=1.0`, `referenzergebnis_nichthandeln=0.0`
    sind fest verdrahtet; `rest_long_short` ist die Summe der Tagessalden (nicht der Endbestand).
    `Tagesabrechnung.ausgleichskosten` ist immer 0.
14. **`data_store/spiellog.csv`** enthält gemischte Zahlenformate (`436.71999999999997` neben
    `120.50`) – relevant für Phase 5.
15. **`levels/base.py` wird nicht benutzt:** `Level1Grundlast` und `Level2Ereignisse` erben
    nicht von `Level` und haben eine eigene, tageweise Schnittstelle. `base.py`,
    `Rundenergebnis`, `Spieldurchlauf`, `Marktpreise`, `Beschaffungsentscheidung`, `Bedarf`,
    `Kostenaufstellung`, `TagesBedarf`, `Tagesergebnis`, `Wochenergebnis` und `Quellentyp`
    sind toter Code. Trotzdem 1:1 portiert.
16. **Ergebnis hängt von der Python-Version ab:** `sum()` rechnet erst ab Python 3.12
    kompensiert. Lief die alte Anwendung mit Python 3.10/3.11 (laut `pyproject.toml` erlaubt),
    können dort gespeicherte Wochenergebnisse in den letzten Binärstellen von den
    Referenzwerten (Python 3.13) abweichen. Angezeigt wird ohnehin auf 2 Nachkommastellen.
17. **Level 2 prüft das Wochenmarkt-Limit doppelt:** zuerst gegen das heutige Limit
    (`_pruefe_verfuegbarkeit`, Meldung „heutige Limit“), danach in Level 1 gegen
    `regelwerk.wochenmarkt_limit_tag` (Meldung „Tageslimit“). Die Level-1-Meldung kann in
    Level 2 nur kommen, wenn ein Ereignis das Limit *erhöht* – das tut keines der
    Standard-Ereignisse.
18. **Beschreibung eines Referenzfalls ist ungenau** (Fehler in Phase 0, Daten korrekt):
    `level2_grenzfaelle.json` → `fehler_wochenmarkt_ueber_regelwerk_limit` sagt
    „Level-1-Pruefung zuerst“; tatsächlich greift die Level-2-Prüfung zuerst (siehe 17), die
    gespeicherte Meldung „...das heutige Limit von 300 Stueck.“ stammt aus Python und ist
    richtig. Da `tests/referenz/` nicht geändert werden darf, bleibt der Text stehen.
19. **Die alte App liest ihr eigenes Log ungenau ein:** `to_csv` schreibt Wochenergebnisse
    exakt (Python-`repr`), aber `pd.read_csv` nutzt standardmäßig `float_precision="high"`, das
    nicht immer korrekt rundet: Aus `-478.05999999999995` wird `-478.06` (eine Binärstelle
    daneben). Betroffen: 193 von 773 Werten der KPI-Referenz (76 von 300 bei
    `level1_wochen`); mit `float_precision="round_trip"` wären es 0. Ranking, Dashboard und
    KPIs der alten App rechneten also mit minimal verfälschten Werten (bei 2 Nachkommastellen
    unsichtbar). Die KPI-Soll-Werte enthalten genau diese eingelesenen Werte als Eingabe.
20. **Regelwerk-Änderung erreicht laufende Level nicht:** `st.session_state.level1/level2`
    werden einmal je Sitzung mit dem damaligen Regelwerk erzeugt; speichert die
    Regelwerk-Seite ein neues, rechnen die Level weiter mit dem alten, während die Texte der
    Spielseite (und in Level 1 die Mosterei-Slider-Grenze) schon das neue zeigen. Bis zum
    Durchlauf „Regelwerk“ unverändert nachgebildet (Level-Objekt je Sitzung); siehe
    Abweichung 22.
21. **`render_player_selector()`** in `ui/components.py` wird nirgends aufgerufen (die Startseite hat
    eigene Händler-Karten); `zeige_rundenergebnis_karten()` ebenso.
22. **Gemeinsame Session-Schlüssel der beiden Level-Seiten** – siehe Abweichung 17.
23. **Ranking bei Gleichstand prozessorabhängig** (numpy-SIMD-Sortierung) – siehe Abweichung 23.
24. **`groupby().idxmax()` mit nur fehlenden Endergebnissen** würfe in pandas 3 einen Fehler
    (Seite stürzt ab). Kann mit Spielständen dieser App nicht auftreten (Endergebnis ist immer
    gesetzt, die Migration verwirft Zeilen ohne Endergebnis); die TS-Version überspringt solche
    Spieler.
25. **„Wähle links dein Level“** (Meldung nach „Spiel starten“) verweist auf die
    Streamlit-Seitenleiste. In der Web-Version liegt die Navigation oben; der Text ist trotzdem
    wörtlich übernommen (siehe offene Frage 11).
26. **Neu gegründeter Händler hat noch keine Karte:** Namen kommen nur aus abgeschlossenen
    Wochen; bis zur ersten fertigen Woche erscheint der Händler nur in der Vorschau – und sein
    Name gilt noch nicht als vergeben (ein zweiter Spieler könnte ihn ebenfalls gründen).
    Unverändert übernommen.
27. **Tutorial-Texte widersprechen dem Spiel** (wörtlich übernommen): „100 Äpfel täglich“ beim
    Obstbauer und „80 Äpfel“ beim Schulessen sind die Regelwerk-Standardwerte, gespielt wird mit
    `config.json` (200 bzw. 90); „eine Obergrenze für die gesamte Woche“ beim Importeur stimmt
    nicht – das Limit gilt nur als Slider-Maximum pro Tag (Auffälligkeit 2).
28. **CSS-Absichten werden von Streamlit nicht dargestellt** (leere Rahmen, 16-px-Überschriften,
    schlichte Knöpfe) – im laufenden Original gemessen, siehe 3i und Abweichung 29.

---

## 6. Offene Fragen

1. **Fehlertexte:** ~~offen~~ In Phase 2 gemäß „Verhalten exakt erhalten“ wörtlich
   übernommen (inkl. Python-Zahlenformat wie `301.0` und `:.0f`-Rundung); durch die
   Referenztests abgesichert. Bitte widersprechen, falls freundlichere Texte gewünscht sind.
2. **Level-2-Mosterei-Fehler (Auffälligkeit 4):** ~~offen~~ Phase 6/1: Fehlerkasten mit der
   Originalmeldung, Tag bleibt offen, Eingaben bleiben erhalten (wie in Streamlit). Logik
   unverändert.
3. **Speichern nach jedem Spieltag:** ~~offen~~ Umgesetzt in Phase 5: Unvollständige Wochen
   zählen nicht für Ranking/Dashboard/Namensprüfung (wie bisher).
4. **Regelwerk-Seite:** ~~offen~~ Phase 5: `config.json` im gemeinsamen Ordner (neben
   `spielstaende/`); ohne Datei gilt das eingebaute Regelwerk. Bitte widersprechen, falls das
   Regelwerk z. B. nur vom Spielleiter änderbar sein soll (dann Schutz in Phase 6).
5. **Auflösen des Unterordners:** Die Zielstruktur kollidiert mit dem Legacy-Code im
   Wurzelverzeichnis (`config/`, `src/`, `tests/`, `README.md`). Vorschlag: Legacy-Code beim
   Auflösen nach `legacy/` verschieben (Pfad für `tools/referenz_erzeugen.py --legacy`
   anpassen), danach Inhalt von `apfelportfolio-web/` in die Wurzel.
6. **GitLab:** Das Repo liegt derzeit auf GitHub. Wird es nach GitLab gespiegelt/umgezogen?
   Bis dahin läuft `.gitlab-ci.yml` nirgends automatisch; lokal sind alle Jobschritte geprüft.
7. **Python-Version der alten Anwendung:** Mit welcher Python-Version wurde die EXE gebaut
   (siehe Auffälligkeit 16)? Relevant nur für den Vergleich alter Log-Werte in Phase 5.
8. ~~offen~~ **Spiellog-Migration – welcher Zahlenwert gilt?** Phase 5: exakter Text-Wert. Wegen Auffälligkeit 19 gibt es
   für ein Wochenergebnis zwei Lesarten: der exakte Wert im CSV-Text (Python `float()`,
   `round_trip`) oder der Wert, den die alte App nach `read_csv` sah (`high`). Vorschlag: der
   exakte Text-Wert (= tatsächliches Spielergebnis); die Migration weist aus, bei wie vielen
   Zeilen sich das in der letzten Binärstelle vom alten Anzeigewert unterscheidet.
9. **Rückfallebene (Firefox/Safari):** Soll nach jedem Spieltag automatisch eine Sammeldatei
   heruntergeladen werden (viele Downloads) oder nur per Knopf mit Hinweis „ungesichert“?
   Vorschlag für Phase 6: Knopf + deutlicher Hinweis; Chrome/Edge (Ordnerzugriff) empfehlen.
10. **Test auf einem echten Rechner** (spätestens in Phase 6): Ordner-Dialog auf dem
    Netzlaufwerk, Schreibrechte für mehrere Benutzer, gemerkter Ordner nach Browser-Neustart
    bei Start per Doppelklick.
11. **Text „Wähle links dein Level, um zu starten.“** (Startseite): Die Navigation liegt jetzt
    oben. Wörtlich lassen (aktueller Stand) oder in „Wähle oben dein Level …“ ändern?
