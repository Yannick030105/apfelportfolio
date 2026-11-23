/**
 * Kapitelspezifische Diagramme des Wikis (Vega-Lite statt Plotly).
 *
 * Quelle (Python): _render_diagramm in ui/pages/5_wiki.py - feste Beispielwerte:
 *   preisbildung: zwei Linien Mo-Fr (Fixpreis 0.35 / variabler Preis), Legende oben, y "€ / Stück"
 *   portfolio:    Ring (hole 0.45) 55/25/20, Beschriftung "Beschaffung" in der Mitte
 *   bilanzkreis:  Balken [8, -4, 12, -10, 0], GOLD wenn >= 0 sonst AKZENT, Titel
 * Hoehe jeweils 260.
 */
import type { TopLevelSpec } from "vega-lite";
import { AKZENT, BRAUN, GOLD } from "../../dashboard/dashboard";

const SCHEMA = "https://vega.github.io/schema/vega-lite/v6.json";
const TAGE = ["Mo", "Di", "Mi", "Do", "Fr"];

function preisbildung(): TopLevelSpec {
  const fix = [0.35, 0.35, 0.35, 0.35, 0.35];
  const variabel = [0.42, 0.51, 0.38, 0.6, 0.47];
  const reihen: [string, number[]][] = [
    ["Fixpreis (Obstbauer)", fix],
    ["Variabler Preis (Wochenmarkt)", variabel],
  ];
  return {
    $schema: SCHEMA,
    width: "container",
    height: 260,
    background: "white",
    padding: 10,
    data: { values: reihen.flatMap(([reihe, werte]) => werte.map((preis, i) => ({ tag: TAGE[i], preis, reihe }))) },
    encoding: {
      x: { field: "tag", type: "ordinal", sort: TAGE, title: null, axis: { labelAngle: 0 } },
      y: { field: "preis", type: "quantitative", title: "€ / Stück", scale: { zero: false } },
      color: {
        field: "reihe",
        type: "nominal",
        scale: { domain: reihen.map((r) => r[0]), range: [BRAUN, AKZENT] },
        legend: { orient: "top", direction: "horizontal", title: null },
      },
      tooltip: [
        { field: "reihe", type: "nominal", title: "Reihe" },
        { field: "tag", type: "ordinal", title: "Tag" },
        { field: "preis", type: "quantitative", title: "€ / Stück", format: ".2f" },
      ],
    },
    layer: [{ mark: { type: "line", strokeWidth: 3 } }, { mark: { type: "point", filled: true, size: 49, opacity: 1 } }],
    config: { view: { stroke: null } },
  };
}

function portfolio(): TopLevelSpec {
  const anteile = [
    { quelle: "Obstbauer (fix)", wert: 55 },
    { quelle: "Importeur", wert: 25 },
    { quelle: "Wochenmarkt", wert: 20 },
  ];
  return {
    $schema: SCHEMA,
    width: "container",
    height: 260,
    background: "white",
    padding: 10,
    data: { values: anteile },
    transform: [
      { joinaggregate: [{ op: "sum", field: "wert", as: "summe" }] },
      { calculate: "datum.wert / datum.summe", as: "anteil" },
    ],
    layer: [
      {
        encoding: {
          theta: { field: "wert", type: "quantitative", stack: true },
          color: {
            field: "quelle",
            type: "nominal",
            sort: anteile.map((a) => a.quelle),
            scale: { domain: anteile.map((a) => a.quelle), range: [BRAUN, GOLD, AKZENT] },
            legend: { orient: "right", title: null },
          },
          order: { field: "wert", type: "quantitative", sort: "descending" },
          tooltip: [
            { field: "quelle", type: "nominal", title: "Quelle" },
            { field: "wert", type: "quantitative", title: "Wert" },
            { field: "anteil", type: "quantitative", title: "Anteil", format: ".0%" },
          ],
        },
        layer: [
          { mark: { type: "arc", innerRadius: { expr: "min(width, height) * 0.45 / 2" }, outerRadius: { expr: "min(width, height) / 2" } } },
          {
            mark: { type: "text", radius: { expr: "min(width, height) * 0.725 / 2" }, fill: "white", fontSize: 12 },
            encoding: { text: { field: "anteil", type: "quantitative", format: ".0%" } },
          },
        ],
      },
      {
        // annotations=[dict(text="Beschaffung", showarrow=False, font_size=13)]
        data: { values: [{ text: "Beschaffung" }] },
        mark: { type: "text", fontSize: 13, color: "#2B2118" },
        encoding: { text: { field: "text", type: "nominal" } },
      },
    ],
    config: { view: { stroke: null } },
  };
}

function bilanzkreis(): TopLevelSpec {
  const salden = [8, -4, 12, -10, 0];
  return {
    $schema: SCHEMA,
    title: { text: "Über-/Unterdeckung im Wochenverlauf", fontSize: 13, anchor: "start" },
    width: "container",
    height: 260,
    background: "white",
    padding: 10,
    data: { values: salden.map((saldo, i) => ({ tag: TAGE[i], saldo, farbe: saldo >= 0 ? GOLD : AKZENT })) },
    mark: { type: "bar" },
    encoding: {
      x: { field: "tag", type: "ordinal", sort: TAGE, title: null, axis: { labelAngle: 0 } },
      y: { field: "saldo", type: "quantitative", title: "Bilanzkreissaldo (Stück)" },
      color: { field: "farbe", type: "nominal", scale: null, legend: null },
      tooltip: [
        { field: "tag", type: "ordinal", title: "Tag" },
        { field: "saldo", type: "quantitative", title: "Bilanzkreissaldo (Stück)" },
      ],
    },
    config: { view: { stroke: null } },
  };
}

/** Diagramm fuer ein Kapitel oder null (nur preisbildung, portfolio, bilanzkreis haben eins). */
export function wiki_diagramm(kapitel_key: string): TopLevelSpec | null {
  if (kapitel_key === "preisbildung") return preisbildung();
  if (kapitel_key === "portfolio") return portfolio();
  if (kapitel_key === "bilanzkreis") return bilanzkreis();
  return null;
}
