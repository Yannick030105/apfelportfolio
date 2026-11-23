/**
 * Dashboard-Berechnungen gegen Soll-Werte aus den Ausdruecken von
 * ui/pages/2_dashboard.py und den Original-KPIs (tools/dashboard_referenz_erzeugen.py).
 */
import { describe, expect, it } from "vitest";
import daten from "./daten/dashboard_referenz.json";
import ranking from "./daten/ranking_referenz.json";
import { balkenfarben, daten_fuer_level, DASHBOARD_LEVEL, histogramm_klassen, profil } from "../src/dashboard/dashboard";
import {
  bestes_ergebnis,
  durchschnittsergebnis,
  ergebnis_streuung,
  ermittele_badges,
  hat_genug_daten_fuer_verlauf,
  schlechtestes_ergebnis,
} from "../src/dashboard/kpis";
import type { LogZeile } from "../src/storage/schema";
import { fix } from "../src/ui/format";

interface Ref {
  faelle: {
    spieler: string;
    profil: { level_text: string; bestes_text: string; wochen_text: string };
    level: Record<
      string,
      {
        kpis: string[];
        lernkurve: boolean;
        lernkurve_hinweis: string;
        verlauf: number[];
        balkenfarben: string[];
        nbinsx: number;
        badges: unknown[];
      } | null
    >;
  }[];
  histogramm_klassen: Record<string, number>;
}
const d = daten as unknown as Ref;
const zeilen: LogZeile[] = (ranking as unknown as { zeilen: { spieler: string; datum: string; level: number; endergebnis: number }[] }).zeilen.map(
  (z) => ({ ...z, rest_long_short: 0, anteil_spot: 0, anteil_grundlast: 1, prognosefehler: null, referenzergebnis_nichthandeln: 0 }),
);

describe("Dashboard – Soll aus 2_dashboard.py", () => {
  it("Level-Auswahl wie im Original fest 1-4", () => {
    expect(DASHBOARD_LEVEL).toEqual([1, 2, 3, 4]);
  });

  it.each(d.faelle.map((f) => [f.spieler, f] as const))("%s", (spieler, fall) => {
    const p = profil(zeilen, spieler);
    expect({
      level_text: p.hoechstes_level !== 0 ? String(p.hoechstes_level) : "–",
      bestes_text: `${fix(p.bestes, 2)} €`,
      wochen_text: String(p.anzahl_wochen),
    }).toEqual(fall.profil);

    for (const level of DASHBOARD_LEVEL) {
      const soll = fall.level[String(level)];
      const df = daten_fuer_level(zeilen, spieler, level);
      if (soll === null || soll === undefined) {
        expect(df.length, `Level ${level}`).toBe(0);
        continue;
      }
      const streuung = ergebnis_streuung(df);
      const werte = df.map((z) => z.endergebnis);
      expect({
        kpis: [
          `${fix(durchschnittsergebnis(df) as number, 2)} €`,
          `${fix(bestes_ergebnis(df) as number, 2)} €`,
          `${fix(schlechtestes_ergebnis(df) as number, 2)} €`,
          streuung !== null ? `${fix(streuung, 2)} €` : "–",
        ],
        lernkurve: hat_genug_daten_fuer_verlauf(df),
        lernkurve_hinweis: `Noch zu wenige Durchläufe (mind. 5) für eine aussagekräftige Lernkurve. Bisher: ${df.length}`,
        verlauf: werte,
        balkenfarben: balkenfarben(werte),
        nbinsx: histogramm_klassen(df.length),
        badges: ermittele_badges(df),
      }, `${spieler} Level ${level}`).toEqual(soll);
    }
  });

  it("Histogramm-Klassenzahl fuer 0-40 Durchlaeufe", () => {
    for (const [n, soll] of Object.entries(d.histogramm_klassen)) expect(histogramm_klassen(Number(n)), n).toBe(soll);
  });

  it("Balkenfarbe: 0 ist golden, negativ und NaN rot", () => {
    expect(balkenfarben([0, -0.01, Number.NaN, 5])).toEqual(["#E8A33D", "#C0392B", "#C0392B", "#E8A33D"]);
  });
});
