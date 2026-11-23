/**
 * Berechnungen der Dashboard-Seite - ohne pandas.
 *
 * Quelle (Python): ui/pages/2_dashboard.py
 *   _render_profil                -> profil
 *   Level-Auswahl (st.selectbox)  -> DASHBOARD_LEVEL
 *   main(): df fuer Spieler/Level -> daten_fuer_level
 *   _render_ergebnisentwicklung   -> balkenfarben
 *   _render_gewinnverteilung      -> histogramm_klassen
 * Die KPIs selbst kommen unveraendert aus kpis.ts.
 */
import type { LogZeile } from "../storage/schema";

export const AKZENT = "#C0392B";
export const GOLD = "#E8A33D";
export const BRAUN = "#8A4B0F";

/** st.selectbox("Level", options=[1, 2, 3, 4]) - im Original fest, auch fuer noch nicht vorhandene Level. */
export const DASHBOARD_LEVEL: readonly number[] = Object.freeze([1, 2, 3, 4]);

export interface Profil {
  /** 0, wenn keine Durchlaeufe (Anzeige dann "–") */
  hoechstes_level: number;
  /** 0.0, wenn keine Durchlaeufe; NaN, wenn alle Endergebnisse fehlen (wie pandas max) */
  bestes: number;
  anzahl_wochen: number;
}

function pandasMax(werte: readonly number[]): number {
  let max = Number.NaN;
  for (const w of werte) {
    if (Number.isNaN(w)) continue;
    if (Number.isNaN(max) || w > max) max = w;
  }
  return max;
}

/** Profil ueber alle Level des Spielers. */
export function profil(df_alle: readonly LogZeile[], spieler: string): Profil {
  const df = df_alle.filter((z) => z.spieler === spieler);
  return {
    hoechstes_level: df.length > 0 ? pandasMax(df.map((z) => z.level)) : 0,
    bestes: df.length > 0 ? pandasMax(df.map((z) => z.endergebnis)) : 0.0,
    anzahl_wochen: df.length,
  };
}

/** Durchlaeufe des Spielers in einem Level, in Log-Reihenfolge (repo.fuer_level + Filter). */
export function daten_fuer_level(df_alle: readonly LogZeile[], spieler: string, level: number): LogZeile[] {
  return df_alle.filter((z) => z.level === level && z.spieler === spieler);
}

/** marker_color=[GOLD if v >= 0 else AKZENT for v in verlauf] (NaN -> AKZENT, weil NaN >= 0 falsch ist) */
export function balkenfarben(werte: readonly number[]): string[] {
  return werte.map((v) => (v >= 0 ? GOLD : AKZENT));
}

/** nbinsx=min(10, max(3, len(df) // 2 or 1)) */
export function histogramm_klassen(anzahl: number): number {
  const haelfte = Math.floor(anzahl / 2);
  return Math.min(10, Math.max(3, haelfte !== 0 ? haelfte : 1));
}
