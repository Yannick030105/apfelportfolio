/**
 * KPIs gegen Soll-Werte aus dem alten Python-Code (pandas), erzeugt aus den
 * Referenzwochen mit tools/kpi_referenz_erzeugen.py -> tests/daten/kpi_referenz.json.
 * Vergleich exakt (Object.is), keine Toleranz.
 */
import { describe, expect, it } from "vitest";
import daten from "./daten/kpi_referenz.json";
import {
  bestes_ergebnis,
  durchschnittsergebnis,
  ergebnis_streuung,
  ermittele_badges,
  hat_genug_daten_fuer_verlauf,
  MIN_DURCHLAEUFE_FUER_VERLAUF,
  schlechtestes_ergebnis,
  type ErgebnisZeile,
} from "../src/dashboard/kpis";
import { numpySumme } from "../src/domain/summe";

type Zahl = number | "NaN" | null;
interface KpiFall {
  name: string;
  anzahl_zeilen: number;
  endergebnisse: (number | null)[];
  durchschnittsergebnis: Zahl;
  bestes_ergebnis: Zahl;
  schlechtestes_ergebnis: Zahl;
  ergebnis_streuung: Zahl;
  hat_genug_daten_fuer_verlauf: boolean;
  badges: { icon: string; titel: string; beschreibung: string; freigeschaltet: boolean }[];
}
const d = daten as unknown as { faelle: KpiFall[]; csv_umweg_geaenderte_werte: number };

function soll(x: Zahl): number | null {
  return x === "NaN" ? Number.NaN : x;
}

function zeilen(fall: KpiFall): ErgebnisZeile[] {
  return fall.endergebnisse.map((e) => ({ endergebnis: e === null ? Number.NaN : e }));
}

describe("KPIs – Referenz aus Python/pandas", () => {
  it("deckt die geplanten Szenarien ab", () => {
    expect(d.faelle.length).toBe(66);
    const namen = d.faelle.map((f) => f.name);
    for (const n of ["leer", "alle", "level1", "level2", "level1_erste_129", "spieler_Nina_level1", "spieler_Otto"]) {
      expect(namen).toContain(n);
    }
    expect(Math.max(...d.faelle.map((f) => f.anzahl_zeilen))).toBeGreaterThan(700); // > 128: paarweise Rekursion
    expect(d.faelle.some((f) => f.endergebnisse.includes(null))).toBe(true); // NaN-Faelle
  });

  it.each(d.faelle.map((f) => [f.name, f] as const))("%s", (_name, fall) => {
    const df = zeilen(fall);
    expect(df.length).toBe(fall.anzahl_zeilen);
    expect(durchschnittsergebnis(df), "durchschnittsergebnis").toEqual(soll(fall.durchschnittsergebnis));
    expect(bestes_ergebnis(df), "bestes_ergebnis").toEqual(soll(fall.bestes_ergebnis));
    expect(schlechtestes_ergebnis(df), "schlechtestes_ergebnis").toEqual(soll(fall.schlechtestes_ergebnis));
    expect(ergebnis_streuung(df), "ergebnis_streuung").toEqual(soll(fall.ergebnis_streuung));
    expect(hat_genug_daten_fuer_verlauf(df)).toBe(fall.hat_genug_daten_fuer_verlauf);
    expect(ermittele_badges(df)).toEqual(fall.badges);
  });
});

describe("KPIs – Einzelheiten", () => {
  it("Schwelle fuer den Verlauf", () => {
    expect(MIN_DURCHLAEUFE_FUER_VERLAUF).toBe(5);
  });

  it("Streuung: NaN-Zeilen zaehlen fuer len(df), aber nicht fuer std", () => {
    expect(ergebnis_streuung([{ endergebnis: 1 }, { endergebnis: Number.NaN }])).toBeNaN();
    expect(ergebnis_streuung([{ endergebnis: 1 }])).toBeNull();
  });

  it("numpySumme: Startwert 0, paarweise ab 8 Werten (anders als einfache Schleife)", () => {
    const werte = [1e16, 1, 1, 1, 1, 1, 1, 1, 1];
    let schleife = 0;
    for (const w of werte) schleife += w;
    expect(numpySumme(werte)).not.toBe(schleife);
    expect(numpySumme([])).toBe(0);
  });
});
