/**
 * Diagramme der Dashboard-Seite (Vega-Lite statt Plotly).
 *
 * Quelle (Python): ui/pages/2_dashboard.py
 *   _render_lernkurve          go.Scatter(lines+markers, fill="tozeroy"), height 320
 *   _render_ergebnisentwicklung go.Bar, Farbe je Balken, Titel, height 260
 *   _render_gewinnverteilung   go.Histogram(nbinsx=...), bargap 0.1, Titel, height 260
 * x-Achse "Durchlauf" = 1..n in Log-Reihenfolge.
 */
import type { TopLevelSpec } from "vega-lite";
import { AKZENT, BRAUN, GOLD, balkenfarben } from "../../dashboard/dashboard";

const SCHEMA = "https://vega.github.io/schema/vega-lite/v6.json";

function durchlaeufe(werte: readonly number[]) {
  const farben = balkenfarben(werte);
  return werte.map((endergebnis, i) => ({ durchlauf: i + 1, endergebnis, farbe: farben[i] as string }));
}

export function lernkurve_spec(werte: readonly number[]): TopLevelSpec {
  return {
    $schema: SCHEMA,
    width: "container",
    height: 320,
    background: "white",
    padding: 10,
    data: { values: durchlaeufe(werte) },
    encoding: {
      x: { field: "durchlauf", type: "quantitative", title: "Durchlauf", axis: { tickMinStep: 1, format: "d" } },
      y: { field: "endergebnis", type: "quantitative", title: "Endergebnis (€)" },
      tooltip: [
        { field: "durchlauf", type: "quantitative", title: "Durchlauf" },
        { field: "endergebnis", type: "quantitative", title: "Endergebnis (€)", format: ".2f" },
      ],
    },
    layer: [
      { mark: { type: "area", color: "rgba(192, 57, 43, 0.08)" }, encoding: { y2: { datum: 0 } } },
      { mark: { type: "line", color: AKZENT, strokeWidth: 3 } },
      { mark: { type: "point", filled: true, color: GOLD, size: 64, opacity: 1 } },
    ],
    config: { view: { stroke: null } },
  };
}

export function ergebnisentwicklung_spec(werte: readonly number[]): TopLevelSpec {
  return {
    $schema: SCHEMA,
    title: { text: "Ergebnisentwicklung", fontSize: 14, anchor: "start" },
    width: "container",
    height: 260,
    background: "white",
    padding: 10,
    data: { values: durchlaeufe(werte) },
    mark: { type: "bar" },
    encoding: {
      x: { field: "durchlauf", type: "ordinal", title: "Durchlauf", axis: { labelAngle: 0, labelOverlap: true } },
      y: { field: "endergebnis", type: "quantitative", title: "Endergebnis (€)" },
      color: { field: "farbe", type: "nominal", scale: null, legend: null },
      tooltip: [
        { field: "durchlauf", type: "ordinal", title: "Durchlauf" },
        { field: "endergebnis", type: "quantitative", title: "Endergebnis (€)", format: ".2f" },
      ],
    },
    config: { view: { stroke: null } },
  };
}

/**
 * Plotly nimmt nbinsx als Obergrenze und waehlt "schoene" Klassengrenzen selbst;
 * Vega-Lite macht mit maxbins dasselbe, die Grenzen koennen aber abweichen.
 */
export function gewinnverteilung_spec(werte: readonly number[], nbinsx: number): TopLevelSpec {
  return {
    $schema: SCHEMA,
    title: { text: "Gewinnverteilung", fontSize: 14, anchor: "start" },
    width: "container",
    height: 260,
    background: "white",
    padding: 10,
    data: { values: werte.map((endergebnis) => ({ endergebnis })) },
    mark: { type: "bar", color: BRAUN, binSpacing: 3 },
    encoding: {
      x: { field: "endergebnis", type: "quantitative", bin: { maxbins: nbinsx }, title: "Endergebnis (€)" },
      y: { aggregate: "count", type: "quantitative", title: "Anzahl Durchläufe", axis: { tickMinStep: 1 } },
      tooltip: [
        { field: "endergebnis", type: "quantitative", bin: { maxbins: nbinsx }, title: "Endergebnis (€)" },
        { aggregate: "count", type: "quantitative", title: "Anzahl Durchläufe" },
      ],
    },
    config: { view: { stroke: null } },
  };
}
