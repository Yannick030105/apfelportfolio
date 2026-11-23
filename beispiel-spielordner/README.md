# Beispiel-Spielordner (Dummy-Daten)

So sieht ein Spielordner aus, den die App beschreibt. Zum Ausprobieren diesen Ordner
(oder eine Kopie) in der App über „📁 Spielordner wählen“ auswählen.

```
beispiel-spielordner/
├── config.json          Regelwerk (hier = eingebaute Standardwerte; ohne Datei gelten diese ebenfalls)
└── spielstaende/        eine JSON-Datei je Spielwoche
    ├── 20261116-083000_level1_Lena_beispiel-001.json
    └── …
```

**Inhalt:** 5 Spieler (Lena, Jonas, Aylin, Tim, Sophie), 20 abgeschlossene Wochen an zwei
Unterrichtstagen (16. und 18.11.2026, Level 1 und 2) und 2 laufende Wochen vom 20.11.:

- Lena, Level 2 – nach Dienstag unterbrochen (Mittwoch ist schon gewürfelt)
- Tim, Level 1 – nach Donnerstag unterbrochen

Wer als Lena bzw. Tim das jeweilige Level öffnet, spielt genau an dieser Stelle weiter.

**Dateiname:** `<Startzeit>_<Level>_<Spieler>_<Kennung>.json` – jede Woche hat ihre eigene
Datei und wird nur von der Sitzung geschrieben, die sie angelegt hat (mehrere Spieler können
gleichzeitig spielen).

**Aufbau einer Datei** (Format `apfelportfolio-spielstand`, `formatVersion` 1):

| Feld | Bedeutung |
|---|---|
| `formatVersion`, `appVersion`, `levelId`, `level` | Format, App-Version, gespieltes Level |
| `id`, `spieler`, `gestartet_am`, `abgeschlossen_am` | Kennung, Spieler, Zeitstempel |
| `status` | `laufend` (nach jedem Tag gespeichert) oder `abgeschlossen` (nach Freitag) |
| `regelwerk` | Regelwerk, mit dem die Woche gespielt wurde |
| `tage[]` | je Tag: Würfelwerte, Entscheidung (Ja/Nein), Einkauf und vollständige Tagesabrechnung |
| `zustand` | Portfoliostand nach dem letzten Tag (zum Fortsetzen) |
| `offener_tag` | bereits gewürfelter, noch nicht abgeschlossener Tag |
| `log_zeile` | Wochenergebnis wie früher eine Zeile in `spiellog.csv` – nur bei `abgeschlossen`; zählt für Ranking und Dashboard |

Die Daten sind mit der echten Spiellogik erzeugt (feste Zufallsfolge) und lassen sich mit
`npm run beispielordner` jederzeit identisch neu erzeugen.
