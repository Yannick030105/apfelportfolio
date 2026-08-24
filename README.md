# Apfelportfolio

Ein Simulationsspiel über Bestandsmanagement und Entscheidungsfindung unter Unsicherheit.
Damit soll spielerisch das Portfoliomanagement in der Energiewirtschaft erklärt werden.
Der Spieler bewirtschaftet einen Apfelbestand über eine Woche und trifft täglich Zukauf-Entscheidungen, um Bedarf zu decken und Gewinn zu maximieren.

## 🎮 Das Spiel

**Ziel:** Decke tägliche Nachfrage (Schulessen, Bäckerei) und maximiere Wochenergebnis.

**Täglich verfügbar:**
- **Obstbauer** – 100 Äpfel zu 0,35 €/Stück (fix)
- **Schulessen** – kauft 80 Äpfel zu 0,40 €/Stück (fix)
- **Bäckerei** – nachfrage 10–60 Äpfel (Würfel), Preis tagesabhängig
- **Importeur** – Zukauf Mo–Mi, Preis variabel
- **Wochenmarkt** – Zukauf jederzeit, Preis variabel
- **Mosterei** – Verkauf von Überschuss (Fr: automatisch)

**Freitags-Ausgleich:** Überschuss → Mosterei, Fehlmenge → Wochenmarkt (automatisch).

## 📊 Level

| Level | Beschreibung | Besonderheit |
|-------|--------------|--------------|
| **Level 1** | Bedarf decken | Reine Bestandsverwaltung, stabile Märkte |
| **Level 2** | Ereignisse meistern | Tägliche Zufallsereignisse ändern Preise, Mengen, Verfügbarkeiten |

## 🏗️ Architektur

```
apfelportfolio
│   .gitignore
│   app.py
│   pyproject.toml
│   README.md
│   tasks.py
│   
├───.idea
│           
├───.streamlit
│       config.toml
│       
├───.venv
│           
├───build
│                   
├───config
│       config.json
│       
├───data_store
│       spiellog.csv
│       
├───src
│   │   
│   ├───apfelportfolio
│   │   │   version.py
│   │   │   
│   │   ├───content
│   │   │   │   translations.py
│   │   │           
│   │   ├───dashboard
│   │   │   │   kpis.py
│   │   │           
│   │   ├───data
│   │   │   │   repository.py
│   │   │   │   schema.py
│   │   │   │   specs_repository.py
│   │   │           
│   │   ├───domain
│   │   │   │   models.py
│   │   │           
│   │   ├───levels
│   │   │   │   base.py
│   │   │   │   level1_grundlast.py
│   │   │   │   level2_ereignisse.py
│   │   │           
│   │   ├───ui
│   │   │   │   components.py
│   │   │   │   
│   │   │   ├───pages
│   │   │   │       0_home.py
│   │   │   │       1_spielen.py
│   │   │   │       2_dashboard.py
│   │   │   │       3_ranking.py
│   │   │   │       4_tutorial.py
│   │   │   │       5_wiki.py
│   │   │   │       6_regelwerk.py
│   │   │   │       level_2.py
│           
└───test
```

**Prinzip:** UI-Code ist frei von Geschäftslogik. Alle Berechnungen, Limits und Regeln liegen in `levels/` und `domain/`.

## 🚀 Start

```bash
# Installation
pip install streamlit

# App starten
streamlit run src/apfelportfolio/ui/app.py
```

Die App öffnet sich im Browser. Navigiere zu **Level 1** oder **Level 2** zum Spielen.

## 📁 Wichtigste Module

### `levels/level1_grundlast.py`
- **`Level1Grundlast`** – Klasse für Level 1 Logik
  - `erzeuge_tagesmarkt()` – Würfelt Tagespreise
  - `erzeuge_tagesnachfrage()` – Würfelt Bäckerei-Menge
  - `rechne_tag_ab(...)` – Berechnet Tagesabrechnung: Lieferungen, Kosten, Ergebnis, Portfolio-Update
- **Preisberechnung:** Alle vier Marktpreise leiten sich von einem Würfelwurf W1 (1–6) ab
- **Limits:**
  - Wochenmarkt: max. 140 Äpfel/Tag
  - Importeur: max. 200 Äpfel insgesamt Mo–Mi
  - Bäckerei-Nachfrage: wird IMMER vollständig beliefert

### `levels/level2_ereignisse.py`
- **`Ereignis`** – Datenstruktur: Titel, Beschreibung, Effekte, optionale Entscheidung
- **`Tageskontext`** – Alle pro Tag veränderbaren Parameter (Preise, Mengen, Verfügbarkeiten)
- **`EFFEKT_FUNKTIONEN`** – Modular: jeder Effekt-Typ (z. B. Preis skalieren, Menge ändern) ist eine Funktion
- **`STANDARD_EREIGNISSE`** – Vordefinierte Ereignisse (Streik, Ernteausfall, Rabatt, etc.)
- **`wende_ereignis_an(...)`** – Wendet Ereignis-Effekte auf den Kontext an

**Neue Ereignisse hinzufügen:** Nur `STANDARD_EREIGNISSE` erweitern – keine Code-Änderungen nötig.

### `domain/models.py`
Zentrale Datenstrukturen:
- `Tagesmarkt` – Preise (Importeur, Wochenmarkt, Bäckerei-Verkauf, Mosterei)
- `Tagesnachfrage` – Mengen (Schulessen, Bäckerei-Bestellung)
- `Tageseinkauf` – Spieler-Entscheidungen (Zukauf Importeur, Wochenmarkt, Mosterei-Verkauf)
- `Tagesabrechnung` – Ergebnis eines Tages: Lieferungen, Kosten, Ergebnis, Portfolio-Stand
- `Wochenverlauf` – Sammlung der Tagesabrechnungen einer Woche

## 🔧 Entwicklung

### Neue Ereignisse (Level 2)
1. Öffne `levels/level2_ereignisse.py`
2. Füge ein `Ereignis`-Objekt zu `STANDARD_EREIGNISSE` hinzu
3. Nutze existierende `EFFEKT_FUNKTIONEN` oder füge neue hinzu (z. B. für neue Wirkungsarten)

Beispiel:
```python
Ereignis(
    key="mein_ereignis",
    titel="Titel",
    beschreibung="Beschreibung",
    effekte=(Effekt("importeur_preis", 0.8),),  # 20 % Rabatt
    hinweis="Optionaler Tipp für den Spieler"
)
```

### Neue Level
1. Erstelle `levels/level3_xyz.py` mit einer Klasse `Level3XYZ`
2. Erstelle `pages/level_3.py` mit der UI (orientiere dich an `level_2.py`)
3. Registriere die Seite in `app.py`

## 📝 Lizenz & Kontakt

Projekt: Apfelportfolio  
Kontakt: yannick.dammann@netzhalle.de
