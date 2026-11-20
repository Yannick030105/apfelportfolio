/**
 * Durchgaengige Apfel-zu-Energie-Uebersetzung (Konzept Abschnitt 2).
 *
 * Quelle (Python): src/apfelportfolio/content/translations.py (Texte woertlich).
 * Wird in der UI als Begleitspalte/Tooltip verwendet, damit der fachliche
 * Transfer waehrend des Spielens passiert.
 */

export interface Uebersetzung {
  readonly spielwelt: string;
  readonly energiewirtschaft: string;
}

export const UEBERSETZUNG: readonly Uebersetzung[] = Object.freeze([
  { spielwelt: "Aepfel", energiewirtschaft: "Energie / Menge" },
  { spielwelt: "Wochenmarkt", energiewirtschaft: "Spotmarkt" },
  { spielwelt: "Obstbauer (Grundlieferung)", energiewirtschaft: "Grundlastvertrag" },
  { spielwelt: "Importeur (Bestellung mit Vorlauf)", energiewirtschaft: "Terminbeschaffung / Forward" },
  { spielwelt: "Schulessen / Baeckerei / Mosterei", energiewirtschaft: "Absatz / Lastgang der Kunden" },
  { spielwelt: "Baeckerei-Menge vorab schaetzen", energiewirtschaft: "Prognose / Fahrplan" },
  { spielwelt: "Rest-Bestand Long/Short", energiewirtschaft: "Bilanzkreisabweichung" },
  { spielwelt: "Ausgleichskosten auf Restmenge", energiewirtschaft: "Ausgleichsenergie" },
]);

export const LEVEL_TITEL: Readonly<Record<number, string>> = Object.freeze({
  1: "Level 1 - Bedarf decken",
  2: "Level 2 - Spothandel",
  3: "Level 3 - Prognose",
  4: "Level 4 - Bilanzkreis",
});
