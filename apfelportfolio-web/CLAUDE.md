# Projekt: Apfelportfolio – Migration Python/Streamlit → TypeScript (Single-File-HTML)

## Arbeitsort
Die neue Anwendung entsteht vollständig im Unterordner `apfelportfolio-web/` des
bestehenden Repos. Das alte Python-Projekt (Repo-Wurzel, `../` von hier aus) bleibt
als Legacy-Code bestehen und wird nicht gelöscht. Am Ende wird der Unterordner
"aufgelöst" (Inhalte an die Zielstelle verschoben) – erst nach ausdrücklicher Freigabe.

## Ziel
Das bestehende Spiel (Python/Streamlit, `../`) wird funktional
1:1 nach TypeScript übertragen. Ergebnis ist eine einzige HTML-Datei, die per
Doppelklick vom Netzlaufwerk läuft und Spielstände über die File System Access API
in einen Ordner schreibt (Fallback: Laden/Speichern per Dateidialog).

## Oberstes Prinzip
Verhalten exakt erhalten. Keine Verbesserungen, keine Regeländerungen, keine
"offensichtlichen" Bugfixes. Wenn dir etwas falsch vorkommt: unverändert portieren
und in MIGRATION_NOTES.md unter "Auffälligkeiten" dokumentieren.

## Harte Regeln
- Dateien unter tests/referenz/ niemals ändern, löschen oder neu erzeugen.
- Bestehende Tests niemals abschwächen, überspringen oder Toleranzen erhöhen.
- Wenn ein Referenztest fehlschlägt, ist der TypeScript-Code falsch, nicht der Test.
- Rundung: Pythons round() (Banker's Rounding) exakt nachbilden; Hilfsfunktion
  in src/domain/runden.ts, überall verwenden. Kein Math.round für Spielwerte.
- Python-Truthiness explizit übersetzen (leere Listen/0/None prüfen).
- Zufall nur über src/domain/wuerfel.ts; Logikfunktionen bekommen Würfelwerte
  als Parameter.
- Keine neuen Abhängigkeiten außer: preact, vega, vega-lite, vega-embed,
  marked, vite, vite-plugin-singlefile, vitest, typescript.
- Keine Netzwerkzugriffe, keine CDNs.
- Arbeite nur an der aktuellen Phase. Am Ende jeder Phase: stoppen, Zusammenfassung
  ausgeben, auf Freigabe warten.

## Zielstruktur
```
apfelportfolio-web/
│   .gitlab-ci.yml          Pipeline: Tests, Build, Release
│   .gitignore
│   package.json            Abhängigkeiten, Version, Befehle (ersetzt tasks.py)
│   tsconfig.json
│   vite.config.ts          baut alles in eine einzige HTML-Datei
│   index.html              Einstiegsseite
│   README.md
│   CHANGELOG.md
│
├───config/                 Standardwerte, werden ins Spiel eingebaut
│       config.json
│       ereignisse.json     bisher STANDARD_EREIGNISSE
│
├───src/
│   │   main.tsx            Start der App
│   │   version.ts          Version kommt beim Build aus package.json
│   │
│   ├───domain/
│   │       models.ts       Tagesmarkt, Tagesnachfrage, Tageseinkauf, ...
│   │       wuerfel.ts      Würfel als austauschbare Quelle (für Tests)
│   │
│   ├───levels/
│   │       base.ts
│   │       level1Grundlast.ts
│   │       level2Ereignisse.ts
│   │       effekte.ts      bisher EFFEKT_FUNKTIONEN
│   │
│   ├───dashboard/
│   │       kpis.ts
│   │
│   ├───config/
│   │       laden.ts        liest Einstellungen: eingebaut oder vom Laufwerk
│   │       pruefung.ts     prüft JSON, meldet Fehler verständlich
│   │
│   ├───storage/            ersetzt data/repository.py und spiellog.csv
│   │       speicher.ts     gemeinsame Schnittstelle
│   │       ordnerSpeicher.ts   schreibt direkt in den Ordner (getesteter Weg)
│   │       dateiSpeicher.ts    Rückfallebene: Laden/Speichern per Dialog
│   │       ordnerMerken.ts     merkt sich den gewählten Ordner
│   │       schema.ts       Format der Spielstand-Dateien inkl. Versionsnummer
│   │
│   ├───state/
│   │       spielzustand.ts ersetzt st.session_state
│   │
│   ├───content/
│   │   │   translations.ts
│   │   └───texte/
│   │           tutorial.md
│   │           wiki.md
│   │           regelwerk.md
│   │
│   └───ui/
│       │   App.tsx         Navigation über Reiter
│       ├───components/     Buttons, Tabellen, Würfelanzeige, ...
│       ├───charts/         Diagramm-Definitionen (Vega-Lite)
│       └───pages/
│               Home.tsx
│               Spielen.tsx     Level 1 und 2 auf einer Seite
│               Dashboard.tsx
│               Ranking.tsx
│               Tutorial.tsx
│               Wiki.tsx
│               Regelwerk.tsx
│
├───tests/
│   │   level1.test.ts
│   │   level2.test.ts
│   │   kpis.test.ts
│   │   storage.test.ts
│   └───referenz/           Soll-Ergebnisse, einmalig aus Python erzeugt
│           level1_*.json
│           level2_*.json
│
└───tools/
        referenz_erzeugen.py    läuft gegen das alte Python-Projekt
        spiellog_migrieren.py   wandelt spiellog.csv einmalig in JSON-Dateien um
```

## Architektur-Vorgaben für Erweiterbarkeit
- Level implementieren eine gemeinsame Schnittstelle und werden in
  src/levels/registry.ts registriert; die Spielseite ist für alle Level gleich.
- Spielstand-Dateien enthalten formatVersion, levelId, appVersion.
- Speichern nach jedem Spieltag.

## Dokumentation
MIGRATION_NOTES.md pflegen mit: Zuordnung alt → neu je Datei, bewusste
Abweichungen (mit Begründung), Auffälligkeiten im Originalcode, offene Fragen.

## Phasen
- **Phase 0** (im Python-Repo): Würfelwerte in level1_grundlast.py und
  level2_ereignisse.py als Parameter übergebbar machen, ohne das Spielverhalten zu
  ändern. Bestehende Tests müssen weiter bestehen; prüfen, ob testpaths in
  pyproject.toml zum Testordner passt. Dann tools/referenz_erzeugen.py: 300 Wochen je
  Level mit festen Würfelfolgen plus Grenzfälle (Limits exakt erreicht, null Zukauf,
  maximale Nachfrage, jedes Ereignis einzeln). Eingaben und vollständige
  Tagesabrechnungen als JSON speichern. Stoppen.
- **Phase 1**: Gerüst anlegen (Build zu einer HTML-Datei, Vitest, leere Module,
  .gitlab-ci.yml mit Test- und Build-Job und einer Prüfung, dass tests/referenz/
  unverändert ist). Noch keine Spiellogik. Stoppen.
- **Phase 2**: domain/models.py und levels/level1_grundlast.py portieren. Tests, die
  alle Level-1-Referenzfälle prüfen. Alle müssen bestehen. Stoppen.
- **Phase 3**: Wie Phase 2 für Level 2 inkl. Ereignisse als config/ereignisse.json.
- **Phase 4**: dashboard/kpis.py ohne pandas portieren. Vorher in Python
  Referenzwerte für die KPIs aus den Referenzwochen erzeugen und dagegen testen.
- **Phase 5**: Speicherung (storage/) und tools/spiellog_migrieren.py. Die Migration
  gibt am Ende Zeilenanzahl, Summen der Ergebnisse je Spieler und 5 Stichproben
  alt/neu nebeneinander aus.
- **Phase 6**: Oberfläche, eine Seite pro Durchlauf, Reihenfolge: Spielen, Ranking,
  Dashboard, Home, Tutorial, Wiki, Regelwerk. Texte wörtlich aus translations.py
  übernehmen. Am Ende jeder Seite beschreiben, welches Streamlit-Verhalten
  (Zurücksetzen von Eingaben, Rerun-Effekte) wie nachgebildet wurde.
