/**
 * KPI-Berechnung fuer das Dashboard (Konzept Abschnitt 6) - ohne pandas.
 *
 * Quelle (Python): src/apfelportfolio/dashboard/kpis.py (1:1-Portierung).
 *
 * Statt eines pandas-DataFrames bekommen die Funktionen die Zeilen als Array
 * (mindestens mit dem Feld endergebnis). Nachgebildet wird exakt, was pandas
 * (3.x, ohne bottleneck) rechnet:
 *   - df.empty / len(df)  -> Anzahl ZEILEN (auch Zeilen mit NaN)
 *   - Series.mean()       -> NaN uebersprungen; Summe per numpy-pairwise (NaN als 0), / Anzahl
 *   - Series.max()/min()  -> NaN uebersprungen; nur NaN -> NaN
 *   - Series.std()        -> ddof=1, Zwei-Pass-Verfahren aus pandas.nanvar:
 *                            avg = sum/n; var = sum((avg - x)*(avg - x)) / (n - 1); sqrt
 *                            (Quadrat als Multiplikation wie numpy, nicht pow)
 */
import { numpySumme } from "../domain/summe";

export const MIN_DURCHLAEUFE_FUER_VERLAUF = 5;

/** Eine Log-Zeile, soweit die KPIs sie brauchen (entspricht der Spalte "endergebnis"). */
export interface ErgebnisZeile {
  readonly endergebnis: number;
}

export type ErgebnisTabelle = readonly ErgebnisZeile[];

/** pandas: Werte mit NaN durch 0 ersetzt (np.putmask) und Anzahl gueltiger Werte. */
function ohneNaN(df: ErgebnisTabelle): { werte: number[]; anzahl: number } {
  let anzahl = 0;
  const werte = df.map((z) => {
    if (Number.isNaN(z.endergebnis)) return 0.0;
    anzahl += 1;
    return z.endergebnis;
  });
  return { werte, anzahl };
}

/** pandas Series.mean() (skipna) */
function pandasMittelwert(df: ErgebnisTabelle): number {
  const { werte, anzahl } = ohneNaN(df);
  return anzahl > 0 ? numpySumme(werte) / anzahl : Number.NaN;
}

/** pandas Series.max()/min() (skipna) */
function pandasExtremwert(df: ErgebnisTabelle, art: "max" | "min"): number {
  let ergebnis = Number.NaN;
  for (const z of df) {
    const x = z.endergebnis;
    if (Number.isNaN(x)) continue;
    if (Number.isNaN(ergebnis) || (art === "max" ? x > ergebnis : x < ergebnis)) ergebnis = x;
  }
  return ergebnis;
}

/** pandas Series.std(ddof=1) (skipna) */
function pandasStandardabweichung(df: ErgebnisTabelle): number {
  const ddof = 1;
  const { werte, anzahl } = ohneNaN(df);
  if (anzahl <= ddof) return Number.NaN; // pandas: "always return NaN, never inf"
  const mittel = numpySumme(werte) / anzahl;
  const quadrate = df.map((z, i) => {
    if (Number.isNaN(z.endergebnis)) return 0.0;
    const abstand = mittel - (werte[i] as number);
    return abstand * abstand;
  });
  return Math.sqrt(numpySumme(quadrate) / (anzahl - ddof));
}

export function durchschnittsergebnis(df: ErgebnisTabelle): number | null {
  if (df.length === 0) {
    return null;
  }
  return pandasMittelwert(df);
}

export function bestes_ergebnis(df: ErgebnisTabelle): number | null {
  if (df.length === 0) {
    return null;
  }
  return pandasExtremwert(df, "max");
}

export function schlechtestes_ergebnis(df: ErgebnisTabelle): number | null {
  if (df.length === 0) {
    return null;
  }
  return pandasExtremwert(df, "min");
}

/** Standardabweichung als einfaches Risikomass. */
export function ergebnis_streuung(df: ErgebnisTabelle): number | null {
  if (df.length < 2) {
    return null;
  }
  return pandasStandardabweichung(df);
}

export function hat_genug_daten_fuer_verlauf(df: ErgebnisTabelle): boolean {
  return df.length >= MIN_DURCHLAEUFE_FUER_VERLAUF;
}

export interface Badge {
  icon: string;
  titel: string;
  beschreibung: string;
  freigeschaltet: boolean;
}

export function ermittele_badges(df_spieler_level: ErgebnisTabelle): Badge[] {
  const anzahl_wochen = df_spieler_level.length;
  const bestes = df_spieler_level.length > 0 ? (bestes_ergebnis(df_spieler_level) as number) : 0.0;

  return [
    {
      icon: "🥉",
      titel: "Erste Woche",
      beschreibung: "Spiele deinen ersten Durchlauf.",
      freigeschaltet: anzahl_wochen >= 1,
    },
    {
      icon: "🥈",
      titel: "Vielspieler",
      beschreibung: "Spiele mindestens 10 Durchläufe.",
      freigeschaltet: anzahl_wochen >= 10,
    },
    {
      icon: "🥇",
      titel: "Über 500 €",
      beschreibung: "Erziele ein Ergebnis von mehr als 500 €.",
      freigeschaltet: bestes > 500,
    },
    {
      icon: "💰",
      titel: "Über 1000 €",
      beschreibung: "Erziele ein Ergebnis von mehr als 1000 €.",
      freigeschaltet: bestes > 1000,
    },
  ];
}
