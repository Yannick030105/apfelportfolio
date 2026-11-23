"""
Durchgaengige Apfel-zu-Energie-Uebersetzung (Konzept Abschnitt 2).

Wird in der UI als Begleitspalte/Tooltip verwendet, damit der fachliche
Transfer waehrend des Spielens passiert.
"""

from __future__ import annotations

UEBERSETZUNG: list[dict[str, str]] = [
    {"spielwelt": "Aepfel", "energiewirtschaft": "Energie / Menge"},
    {"spielwelt": "Wochenmarkt", "energiewirtschaft": "Spotmarkt"},
    {"spielwelt": "Obstbauer (Grundlieferung)", "energiewirtschaft": "Grundlastvertrag"},
    {"spielwelt": "Importeur (Bestellung mit Vorlauf)", "energiewirtschaft": "Terminbeschaffung / Forward"},
    {"spielwelt": "Schulessen / Baeckerei / Mosterei", "energiewirtschaft": "Absatz / Lastgang der Kunden"},
    {"spielwelt": "Baeckerei-Menge vorab schaetzen", "energiewirtschaft": "Prognose / Fahrplan"},
    {"spielwelt": "Rest-Bestand Long/Short", "energiewirtschaft": "Bilanzkreisabweichung"},
    {"spielwelt": "Ausgleichskosten auf Restmenge", "energiewirtschaft": "Ausgleichsenergie"},
]

LEVEL_TITEL: dict[int, str] = {
    1: "Level 1 - Bedarf decken",
    2: "Level 2 - Spothandel",
    3: "Level 3 - Prognose",
    4: "Level 4 - Bilanzkreis",
}
