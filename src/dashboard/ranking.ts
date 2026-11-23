/**
 * Berechnungen der Ranking-Seite - ohne pandas.
 *
 * Quelle (Python): ui/pages/3_ranking.py
 *   _highscores_je_level  -> highscores_je_level
 *   _badge_icons          -> badge_icons
 *   _render_eigene_statistik (Rang, Abstand, Bestes) -> eigene_statistik
 *   _render_verlaufschart (Datenauswahl)             -> verlauf
 *
 * pandas-Verhalten:
 *   - groupby("spieler"): Gruppen alphabetisch (Codepoints), idxmax = erste Zeile
 *     mit dem hoechsten Endergebnis (NaN uebersprungen).
 *   - sort_values(..., ascending=False) nutzt numpy-quicksort; der ist auf x86
 *     mit SIMD nicht stabil und prozessorabhaengig. Bei gleichen Bestwerten ist
 *     die Reihenfolge im Original daher nicht festgelegt - hier bewusst stabil
 *     (gleiche Werte in Gruppenreihenfolge, also alphabetisch). MIGRATION_NOTES.
 */
import { pythonStringVergleich } from "../domain/pythonString";
import type { LogZeile } from "../storage/schema";
import { ermittele_badges } from "./kpis";

export interface Bestenplatz {
  readonly rang: number;
  readonly spieler: string;
  readonly endergebnis: number;
  /** die ganze Log-Zeile des besten Durchlaufs */
  readonly zeile: LogZeile;
}

/** Bester Durchlauf je Spieler, gefiltert auf ein Level, absteigend sortiert. */
export function highscores_je_level(zeilen: readonly LogZeile[], level: number): Bestenplatz[] {
  const df_level = zeilen.filter((z) => z.level === level);
  if (df_level.length === 0) return [];

  // groupby("spieler")["endergebnis"].idxmax()
  const beste = new Map<string, LogZeile>();
  for (const z of df_level) {
    if (Number.isNaN(z.endergebnis)) continue;
    const bisher = beste.get(z.spieler);
    if (bisher === undefined || z.endergebnis > bisher.endergebnis) beste.set(z.spieler, z);
  }
  const gruppen = [...beste.keys()].sort(pythonStringVergleich).map((s) => beste.get(s) as LogZeile);

  // sort_values("endergebnis", ascending=False) - stabil (siehe Kopfkommentar)
  const sortiert = gruppen
    .map((zeile, i) => ({ zeile, i }))
    .sort((a, b) => (b.zeile.endergebnis !== a.zeile.endergebnis ? (b.zeile.endergebnis > a.zeile.endergebnis ? 1 : -1) : a.i - b.i));
  return sortiert.map(({ zeile }, i) => ({ rang: i + 1, spieler: zeile.spieler, endergebnis: zeile.endergebnis, zeile }));
}

/** Icons aller freigeschalteten Badges eines Spielers innerhalb eines Levels. */
export function badge_icons(df_level: readonly LogZeile[], spieler: string): string {
  const df_spieler = df_level.filter((z) => z.spieler === spieler);
  return ermittele_badges(df_spieler)
    .filter((b) => b.freigeschaltet)
    .map((b) => b.icon)
    .join("");
}

export interface EigeneStatistik {
  eigener_rang: number;
  bestes_ergebnis: number;
  gesamt: number;
  /** Abstand zu Platz 1; null fuer Platz 1 (dort zeigt das Original "0.00 €") */
  abstand: number | null;
}

/** Rang, Abstand zu Platz 1 und bestes Ergebnis (nur fuer Spieler in der Bestenliste). */
export function eigene_statistik(bestenliste: readonly Bestenplatz[], spieler: string): EigeneStatistik | null {
  const eigener = bestenliste.find((b) => b.spieler === spieler);
  const erster = bestenliste.find((b) => b.rang === 1);
  if (eigener === undefined || erster === undefined) return null;
  return {
    eigener_rang: eigener.rang,
    bestes_ergebnis: eigener.endergebnis,
    gesamt: bestenliste.length,
    abstand: eigener.rang === 1 ? null : erster.endergebnis - eigener.endergebnis,
  };
}

/**
 * Durchlaeufe eines Spielers in einem Level nach Datum (sort_values("datum")),
 * fehlendes Datum zuletzt; gleiche Daten stabil in Log-Reihenfolge (siehe oben).
 */
export function verlauf(zeilen: readonly LogZeile[], level: number, spieler: string): LogZeile[] {
  return zeilen
    .filter((z) => z.level === level && z.spieler === spieler)
    .map((zeile, i) => ({ zeile, i }))
    .sort((a, b) => {
      const da = a.zeile.datum;
      const db = b.zeile.datum;
      if (da === db) return a.i - b.i;
      if (da === null) return 1;
      if (db === null) return -1;
      return da < db ? -1 : 1;
    })
    .map(({ zeile }) => zeile);
}
