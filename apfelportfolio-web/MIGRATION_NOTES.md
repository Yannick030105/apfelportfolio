# MIGRATION_NOTES – Apfelportfolio Python/Streamlit → TypeScript

Stand: Phase 4 abgeschlossen (Dashboard-KPIs ohne pandas). Wird je Phase fortgeschrieben.

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
| `src/apfelportfolio/data/repository.py`, `data/schema.py`, `data/players.py`, `data_store/spiellog.csv` | `src/storage/*`, `tools/spiellog_migrieren.py` | offen (Phase 5) |
| `src/apfelportfolio/data/specs_repository.py`, `config/config.json` | `src/config/laden.ts`, `src/config/pruefung.ts`, `config/config.json` | offen |
| `src/apfelportfolio/content/translations.py` | `src/content/translations.ts` | offen (Phase 6) |
| `src/apfelportfolio/ui/pages/*.py`, `ui/components.py`, `app.py` | `src/ui/**`, `src/main.tsx` | offen (Phase 6) |
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

---

## 6. Offene Fragen

1. **Fehlertexte:** ~~offen~~ In Phase 2 gemäß „Verhalten exakt erhalten“ wörtlich
   übernommen (inkl. Python-Zahlenformat wie `301.0` und `:.0f`-Rundung); durch die
   Referenztests abgesichert. Bitte widersprechen, falls freundlichere Texte gewünscht sind.
2. **Level-2-Mosterei-Fehler (Auffälligkeit 4):** In Streamlit führt das zu einer
   Traceback-Seite, die Eingaben bleiben erhalten. Vorschlag für Phase 6: Fehlermeldung
   anzeigen, Tageszustand unverändert lassen. Die Logik bleibt unverändert.
3. **Speichern nach jedem Spieltag** ist neu (bisher wurde nur die fertige Woche ins Log
   geschrieben). Sollen unvollständige Wochen in Ranking/Dashboard auftauchen? Vorschlag:
   nein, nur komplette Wochen zählen (wie bisher).
4. **Regelwerk-Seite:** Bisher schreibt sie `config/config.json` neben die EXE. Wohin speichert
   die HTML-Version – in den gewählten Spielstand-Ordner? (Klärung bis Phase 5/6.)
5. **Auflösen des Unterordners:** Die Zielstruktur kollidiert mit dem Legacy-Code im
   Wurzelverzeichnis (`config/`, `src/`, `tests/`, `README.md`). Vorschlag: Legacy-Code beim
   Auflösen nach `legacy/` verschieben (Pfad für `tools/referenz_erzeugen.py --legacy`
   anpassen), danach Inhalt von `apfelportfolio-web/` in die Wurzel.
6. **GitLab:** Das Repo liegt derzeit auf GitHub. Wird es nach GitLab gespiegelt/umgezogen?
   Bis dahin läuft `.gitlab-ci.yml` nirgends automatisch; lokal sind alle Jobschritte geprüft.
7. **Python-Version der alten Anwendung:** Mit welcher Python-Version wurde die EXE gebaut
   (siehe Auffälligkeit 16)? Relevant nur für den Vergleich alter Log-Werte in Phase 5.
8. **Spiellog-Migration (Phase 5) – welcher Zahlenwert gilt?** Wegen Auffälligkeit 19 gibt es
   für ein Wochenergebnis zwei Lesarten: der exakte Wert im CSV-Text (Python `float()`,
   `round_trip`) oder der Wert, den die alte App nach `read_csv` sah (`high`). Vorschlag: der
   exakte Text-Wert (= tatsächliches Spielergebnis); die Migration weist aus, bei wie vielen
   Zeilen sich das in der letzten Binärstelle vom alten Anzeigewert unterscheidet.
