/**
 * Korrigierte Mosterei-Regel (bewusste Abweichung, siehe MIGRATION_NOTES):
 * Im Original wurde ein Verkauf an die Mosterei von Montag bis Donnerstag
 * zweimal vom Bestand abgezogen. Die App (ohne Option) rechnet ihn nur einmal ab.
 *
 * Absicherung gegen ALLE Referenzwochen:
 *  - bis zum ersten Mosterei-Verkauf Mo-Do laeuft jede Woche exakt wie im Original
 *    (Wochen ganz ohne solchen Verkauf also vollstaendig identisch);
 *  - am Tag des ersten Verkaufs ist nur der Bilanzkreis-Saldo genau um die
 *    verkaufte Menge hoeher; Lieferungen und Preise bleiben gleich.
 */
import { describe, expect, it } from "vitest";
import { Regelwerk, Tageseinkauf, type Tagesabrechnung } from "../src/domain/models";
import { finde_level, type LevelId } from "../src/levels/registry";
import { abrechnung_dict, type ReferenzDokument } from "./hilfen/referenz";

const dokumente = import.meta.glob<ReferenzDokument>("./referenz/level*.json", {
  eager: true,
  import: "default",
});

describe("Mosterei-Verkauf wird nur einmal abgezogen", () => {
  for (const [pfad, dok] of Object.entries(dokumente)) {
    const levelId: LevelId = dok.level === 2 ? "level2" : "level1";
    it(`${pfad}: identisch bis zum ersten Mosterei-Verkauf Mo–Do`, () => {
      let wochen_ohne_verkauf = 0;
      let verkaufstage = 0;
      for (const fall of dok.faelle) {
        const level = finde_level(levelId).erzeuge(new Regelwerk(fall.regelwerk));
        let abweichend = false;
        for (const [i, s] of fall.schritte.entries()) {
          const ort = `${fall.name}, Schritt ${i}`;
          const e = s.eingabe;
          const lage = level.bereite_tag_vor(
            s.tag_index,
            { w1: e.w1, baeckerei_menge: e.baeckerei_menge, ereignis_index: e.ereignis_index ?? null },
            e.zugestimmt ?? false,
          );
          let a: Tagesabrechnung;
          try {
            a = level.rechne_tag_ab(lage, new Tageseinkauf(e.einkauf));
          } catch (err) {
            expect(s.fehler, `${ort}: Fehler wie im Original`).toBe((err as Error).message);
            continue;
          }
          expect(s.fehler, `${ort}: kein Fehler`).toBeUndefined();
          const ref = s.abrechnung!;
          const ist = abrechnung_dict(a);
          if (s.tag_index < 4 && e.einkauf.mosterei_menge !== 0) {
            verkaufstage++;
            expect(ist.an_mosterei_geliefert, ort).toBe(ref.an_mosterei_geliefert);
            expect(ist.einkaufskosten, ort).toBe(ref.einkaufskosten);
            expect(ist.erloes, ort).toBe(ref.erloes);
            expect(ist.bilanzkreis_saldo - ref.bilanzkreis_saldo, ort).toBeCloseTo(e.einkauf.mosterei_menge, 9);
            abweichend = true;
            break; // danach weicht der Bestand ab - Vergleich mit dem Original endet hier
          }
          expect(ist, `${ort}: Abrechnung`).toEqual(ref);
          expect(level.portfoliostand, `${ort}: Bestand`).toBe(s.zustand_danach.portfoliostand);
        }
        if (!abweichend) wochen_ohne_verkauf++;
      }
      expect(wochen_ohne_verkauf + verkaufstage).toBeGreaterThan(0);
    });
  }
});
