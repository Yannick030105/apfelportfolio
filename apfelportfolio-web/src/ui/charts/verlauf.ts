/**
 * Diagramm "Dein persoenlicher Verlauf" (Ranking).
 *
 * Quelle (Python): _render_verlaufschart in ui/pages/3_ranking.py (Plotly):
 *   go.Scatter(mode="lines+markers", line=dict(color=AKZENT, width=3),
 *              marker=dict(size=8, color=GOLD), fill="tozeroy",
 *              fillcolor="rgba(192, 57, 43, 0.08)")
 *   height=260, weisser Hintergrund, keine x-Achsenbeschriftung,
 *   y-Achse "Endergebnis (€)", keine Legende.
 * Umsetzung mit Vega-Lite (erlaubte Abhaengigkeit statt Plotly).
 */
import type { TopLevelSpec } from "vega-lite";

export const AKZENT = "#C0392B";
export const GOLD = "#E8A33D";

export function verlauf_spec(punkte: readonly { datum: string; endergebnis: number }[]): TopLevelSpec {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height: 260,
    background: "white",
    padding: 10,
    data: { values: punkte.map((p) => ({ ...p })) },
    encoding: {
      // Datum ohne Uhrzeit: als UTC-Tag lesen und anzeigen (keine Verschiebung durch die Zeitzone),
      // Achsenmarken nur an ganzen Tagen wie bei Plotly.
      x: {
        field: "datum",
        type: "temporal",
        timeUnit: "utcyearmonthdate",
        title: null,
        scale: { type: "utc" },
        axis: { format: "%b %-d", formatType: "utc", tickCount: { interval: "day", step: 1 }, labelOverlap: true, grid: true },
      },
      y: { field: "endergebnis", type: "quantitative", title: "Endergebnis (€)" },
      tooltip: [
        { field: "datum", type: "temporal", timeUnit: "utcyearmonthdate", title: "Datum", format: "%d.%m.%Y", formatType: "utc" },
        { field: "endergebnis", type: "quantitative", title: "Endergebnis (€)", format: ".2f" },
      ],
    },
    layer: [
      // fill="tozeroy"
      { mark: { type: "area", color: "rgba(192, 57, 43, 0.08)" }, encoding: { y2: { datum: 0 } } },
      { mark: { type: "line", color: AKZENT, strokeWidth: 3 } },
      { mark: { type: "point", filled: true, color: GOLD, size: 64, opacity: 1 } },
    ],
    config: { view: { stroke: null } },
  };
}
