/**
 * Zahlenformate der Oberflaeche wie die Python-f-Strings der Streamlit-Seiten.
 *   f"{x:.2f}"  -> fix(x, 2)
 *   f"{x:+.0f}" -> mitVorzeichen(x, 0)
 * Rundung exakt wie Python (half-to-even auf dem exakten Wert, siehe runden.ts).
 */
import { formatFixed } from "../domain/runden";

export function fix(x: number, stellen: number): string {
  return formatFixed(x, stellen);
}

/** Python-Formatangabe "+": positives Vorzeichen immer zeigen ("+0", "-0" bei -0.0/-0.4). */
export function mitVorzeichen(x: number, stellen: number): string {
  const text = formatFixed(x, stellen);
  return text.startsWith("-") ? text : `+${text}`;
}

/**
 * Anzeige in Streamlit-Zahlenfeldern (st.number_input(format="%.2f")).
 * Das formatiert NICHT Python, sondern Streamlits Browser-Oberflaeche (sprintf-js,
 * intern Number.prototype.toFixed): Gleichstaende runden dort aufwaerts
 * (0.125 -> "0.13", im Original gemessen), anders als Pythons f"{x:.2f}" ("0.12").
 * Nur fuer diese Feldanzeige verwenden, nie fuer Spielwerte.
 */
export function streamlitFeldText(x: number, stellen: number | null): string {
  return stellen === null ? String(x) : x.toFixed(stellen);
}
