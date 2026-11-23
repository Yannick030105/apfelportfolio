/**
 * Gemeinsame Level-Schnittstelle (src/levels/registry.ts): spielt ALLE
 * Referenzfaelle beider Level ueber die Adapter nach - so, wie die
 * Spielseite die Level spaeter benutzt - und prueft Wuerfel-Reihenfolge,
 * Wochenwechsel und Zustand-Wiederherstellung.
 */
import { describe, expect, it } from "vitest";
import { ValueError } from "../src/domain/fehler";
import { Regelwerk, Tageseinkauf, type Tagesabrechnung } from "../src/domain/models";
import { festerWuerfel } from "../src/domain/wuerfel";
import { finde_level, LEVEL_REGISTRY, type LevelId } from "../src/levels/registry";
import { abrechnung_dict, markt_dict, type FallRef, type ReferenzDokument } from "./hilfen/referenz";

/** Referenzdaten stammen aus dem Original: Mosterei-Verkauf Mo-Do wie dort doppelt abziehen. */
const ORIGINAL = { original_mosterei_doppelabzug: true } as const;

const dokumente = import.meta.glob<ReferenzDokument>("./referenz/level*.json", {
  eager: true,
  import: "default",
});

function spieleUeberAdapter(levelId: LevelId, fall: FallRef): void {
  const level = finde_level(levelId).erzeuge(new Regelwerk(fall.regelwerk), ORIGINAL);
  for (const [i, schritt] of fall.schritte.entries()) {
    const ort = `${fall.name}, Schritt ${i}`;
    const e = schritt.eingabe;
    const lage = level.bereite_tag_vor(
      schritt.tag_index,
      { w1: e.w1, baeckerei_menge: e.baeckerei_menge, ereignis_index: e.ereignis_index ?? null },
      e.zugestimmt ?? false,
    );
    expect(lage.tag, ort).toBe(schritt.tag);
    expect(markt_dict(lage.markt_gewuerfelt), `${ort}: Markt`).toEqual(schritt.markt);
    if (levelId === "level2") {
      expect(lage.ereignis?.key, `${ort}: Ereignis`).toBe(e.ereignis_key);
    }
    expect(level.eingabegrenzen(lage, e.einkauf.importeur_menge, e.einkauf.wochenmarkt_menge), `${ort}: Grenzen`).toEqual(
      schritt.ui_grenzen,
    );
    let abrechnung: Tagesabrechnung | null = null;
    let fehler: unknown = null;
    try {
      abrechnung = level.rechne_tag_ab(lage, new Tageseinkauf(e.einkauf));
    } catch (err) {
      fehler = err;
    }
    if (schritt.fehler !== undefined) {
      expect(fehler, `${ort}: Fehler`).toBeInstanceOf(ValueError);
      expect((fehler as Error).message).toBe(schritt.fehler);
    } else {
      expect(fehler, `${ort}: unerwarteter Fehler`).toBeNull();
      expect(abrechnung_dict(abrechnung as Tagesabrechnung), `${ort}: Abrechnung`).toEqual(schritt.abrechnung);
    }
    expect(
      { portfoliostand: level.portfoliostand, importeur_menge_woche: level.importeur_menge_woche },
      `${ort}: Zustand`,
    ).toEqual(schritt.zustand_danach);
  }
}

describe("Registry", () => {
  it("enthaelt Level 1 und Level 2 mit den Navigationstiteln aus app.py", () => {
    expect(LEVEL_REGISTRY.map((e) => [e.id, e.nummer, e.navigationstitel])).toEqual([
      ["level1", 1, "Level 1"],
      ["level2", 2, "Level 2"],
    ]);
    expect(finde_level("level2").erzeuge(new Regelwerk()).titel).toBe(
      "Level 2 - Ereignisse meistern (tageweise, Mo-Fr)",
    );
  });

  it("wuerfelt in der Reihenfolge des Originals (W1, Menge, Ereignis)", () => {
    const l1 = finde_level("level1").erzeuge(new Regelwerk());
    expect(l1.wuerfle_tag(festerWuerfel([4, 33]))).toEqual({ w1: 4, baeckerei_menge: 33, ereignis_index: null });
    const l2 = finde_level("level2").erzeuge(new Regelwerk());
    expect(l2.wuerfle_tag(festerWuerfel([2, 59, 8]))).toEqual({ w1: 2, baeckerei_menge: 59, ereignis_index: 8 });
  });

  it("Zustimmung wirkt nur bei Entscheidungsereignissen (Schalter existiert sonst nicht)", () => {
    const l2 = finde_level("level2").erzeuge(new Regelwerk());
    const wuerfe = { w1: 3, baeckerei_menge: 20, ereignis_index: 5 }; // importeur_rabatt
    // Python: getattr(markt, "preis_importeur") * 0.7  ->  (3 / 10) * 0.7
    expect(l2.bereite_tag_vor(0, wuerfe, true).markt.preis_importeur).toBe((3 / 10) * 0.7);
    expect(l2.bereite_tag_vor(0, wuerfe, false).markt.preis_importeur).toBe(0.3);
    const ohne = l2.bereite_tag_vor(0, { ...wuerfe, ereignis_index: 0 }, true);
    expect(ohne.zugestimmt).toBe(false);
  });

  it.each(["level1", "level2"] as const)("%s: neue_woche und setze_zustand", (id) => {
    const level = finde_level(id).erzeuge(new Regelwerk());
    level.setze_zustand({ portfoliostand: 42, importeur_menge_woche: 7 });
    expect([level.portfoliostand, level.importeur_menge_woche]).toEqual([42, 7]);
    level.neue_woche();
    expect([level.portfoliostand, level.importeur_menge_woche]).toEqual([0, 0]);
  });
});

for (const [pfad, doc] of Object.entries(dokumente)) {
  const levelId: LevelId = doc.level === 1 ? "level1" : "level2";
  describe(`Adapter ${levelId} – ${pfad}`, () => {
    it(`alle ${doc.anzahl_faelle} Faelle`, () => {
      expect(doc.faelle.length).toBe(doc.anzahl_faelle);
      for (const fall of doc.faelle) spieleUeberAdapter(levelId, fall);
    });
  });
}
