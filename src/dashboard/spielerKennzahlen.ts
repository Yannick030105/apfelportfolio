/**
 * Kennzahlen je Spieler fuer die Haendler-Karten der Startseite.
 *
 * Quelle (Python): _spieler_kennzahlen in ui/pages/home.py (1:1, ohne pandas).
 * Level-Anzeige, Bestergebnis, letzter Rang, letzter Gewinn, Anzahl Wochen und
 * Badges - ausschliesslich aus dem Log abgeleitet.
 *
 * "Letzte Zeile" = sort_values("datum").iloc[-1]: fehlendes Datum sortiert
 * pandas ans Ende (gilt also als letzte Zeile). Bei mehreren Durchlaeufen am
 * selben letzten Tag ist das Original nicht festgelegt (numpy-quicksort mit SIMD,
 * prozessorabhaengig) - hier stabil: der zuletzt abgeschlossene Durchlauf.
 * Gleiches fuer gleiche Bestwerte beim letzten Rang (wie im Ranking: alphabetisch).
 */
import type { LogZeile } from "../storage/schema";
import { ermittele_badges, type Badge } from "./kpis";
import { highscores_je_level } from "./ranking";

export interface SpielerKennzahlen {
  level_label: string;
  best: number | null;
  letzter_rang: number | null;
  letzter_gewinn: number | null;
  wochen: number;
  badges: Badge[];
}

const LEER: Readonly<SpielerKennzahlen> = Object.freeze({
  level_label: "Neuling",
  best: null,
  letzter_rang: null,
  letzter_gewinn: null,
  wochen: 0,
  badges: [],
});

function pandasMax(werte: readonly number[]): number {
  let max = Number.NaN;
  for (const w of werte) {
    if (Number.isNaN(w)) continue;
    if (Number.isNaN(max) || w > max) max = w;
  }
  return max;
}

/** Python: eigene.sort_values("datum").iloc[-1] (stabil, fehlendes Datum zuletzt) */
function letzteZeile(eigene: readonly LogZeile[]): LogZeile {
  const sortiert = eigene
    .map((zeile, i) => ({ zeile, i }))
    .sort((a, b) => {
      const da = a.zeile.datum;
      const db = b.zeile.datum;
      if (da === db) return a.i - b.i;
      if (da === null) return 1;
      if (db === null) return -1;
      return da < db ? -1 : 1;
    });
  return (sortiert[sortiert.length - 1] as { zeile: LogZeile }).zeile;
}

export function spieler_kennzahlen(df: readonly LogZeile[], spieler: string): SpielerKennzahlen {
  if (df.length === 0) return { ...LEER, badges: [] };
  const eigene = df.filter((z) => z.spieler === spieler);
  if (eigene.length === 0) return { ...LEER, badges: [] };

  const hoechstes_level = pandasMax(eigene.map((z) => z.level));
  const bestes_ergebnis = pandasMax(eigene.map((z) => z.endergebnis));
  const letzte = letzteZeile(eigene);

  // df_level.groupby("spieler")["endergebnis"].max().sort_values(ascending=False); get_loc(spieler) + 1
  const bestenliste = highscores_je_level(df, letzte.level);
  const platz = bestenliste.find((b) => b.spieler === spieler);

  return {
    level_label: `Level ${hoechstes_level}`,
    best: bestes_ergebnis,
    letzter_rang: platz === undefined ? null : platz.rang,
    letzter_gewinn: letzte.endergebnis,
    wochen: eigene.length,
    badges: ermittele_badges(eigene),
  };
}
