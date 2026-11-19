/**
 * Level 1 gegen ALLE Level-1-Referenzfaelle (tests/referenz/level1_*.json).
 *
 * Jeder Schritt (= ein Klick auf "Handel abschliessen") wird nachgespielt und
 * Feld fuer Feld verglichen - exakt (Object.is-Semantik von toEqual, keine
 * Toleranz): Tagesmarkt, Tagesnachfrage, Slider-Grenzen, Tagesabrechnung bzw.
 * Fehlermeldung, Level-Zustand danach und das Wochenergebnis.
 */
import { describe, expect, it } from "vitest";
import { ValueError } from "../src/domain/fehler";
import { Regelwerk, Tageseinkauf, Wochenverlauf, type Tagesabrechnung } from "../src/domain/models";
import { pythonSumme } from "../src/domain/summe";
import { Level1Grundlast, eingabegrenzen_level1 } from "../src/levels/level1Grundlast";
import {
  abrechnung_dict,
  markt_dict,
  nachfrage_dict,
  type FallRef,
  type ReferenzDokument,
} from "./hilfen/referenz";

const dokumente = import.meta.glob<ReferenzDokument>("./referenz/level1_*.json", {
  eager: true,
  import: "default",
});

/** Spielt einen Referenzfall nach; liefert die Anzahl gepruefter Schritte. */
function spieleFall(fall: FallRef): number {
  const level = new Level1Grundlast(new Regelwerk(fall.regelwerk));
  const woche = new Wochenverlauf({ level: level.nummer });
  let geprueft = 0;

  fall.schritte.forEach((schritt, i) => {
    const ort = `${fall.name}, Schritt ${i} (${schritt.tag})`;
    const e = schritt.eingabe;

    const markt = level.erzeuge_tagesmarkt(e.w1);
    expect(markt_dict(markt), `${ort}: Tagesmarkt`).toEqual(schritt.markt);

    const nachfrage = level.erzeuge_tagesnachfrage(e.baeckerei_menge);
    expect(nachfrage_dict(nachfrage), `${ort}: Tagesnachfrage`).toEqual(schritt.nachfrage);

    const grenzen = eingabegrenzen_level1(
      level,
      nachfrage,
      schritt.tag_index,
      e.einkauf.importeur_menge,
      e.einkauf.wochenmarkt_menge,
    );
    expect(grenzen, `${ort}: Slider-Grenzen`).toEqual(schritt.ui_grenzen);

    const einkauf = new Tageseinkauf(e.einkauf);
    let abrechnung: Tagesabrechnung | null = null;
    let fehler: unknown = null;
    try {
      abrechnung = level.rechne_tag_ab(schritt.tag, schritt.tag_index, markt, nachfrage, einkauf);
    } catch (err) {
      fehler = err;
    }

    if (schritt.fehler !== undefined) {
      expect(abrechnung, `${ort}: Fehler erwartet`).toBeNull();
      expect(fehler, `${ort}: Fehlertyp`).toBeInstanceOf(ValueError);
      expect((fehler as ValueError).message, `${ort}: Fehlermeldung`).toBe(schritt.fehler);
    } else {
      expect(fehler, `${ort}: unerwarteter Fehler`).toBeNull();
      expect(abrechnung).not.toBeNull();
      expect(abrechnung_dict(abrechnung as Tagesabrechnung), `${ort}: Tagesabrechnung`).toEqual(
        schritt.abrechnung,
      );
      woche.tage.push(abrechnung as Tagesabrechnung);
    }

    expect(
      { portfoliostand: level.portfoliostand, importeur_menge_woche: level._importeur_menge_woche },
      `${ort}: Zustand danach`,
    ).toEqual(schritt.zustand_danach);
    geprueft += 1;
  });

  expect(
    {
      anzahl_tage: woche.tage.length,
      ist_komplett: woche.ist_komplett,
      wochenergebnis: woche.wochenergebnis,
      // so berechnet 1_spielen.py rest_long_short fuer die Log-Zeile
      rest_long_short: pythonSumme(woche.tage.map((t) => t.bilanzkreis_saldo)),
    },
    `${fall.name}: Woche`,
  ).toEqual({
    anzahl_tage: fall.woche.anzahl_tage,
    ist_komplett: fall.woche.ist_komplett,
    wochenergebnis: fall.woche.wochenergebnis,
    rest_long_short: fall.woche.rest_long_short,
  });
  return geprueft;
}

describe("Level 1 – Referenzdateien vorhanden", () => {
  it("findet alle drei Level-1-Dateien", () => {
    expect(Object.keys(dokumente).sort()).toEqual([
      "./referenz/level1_grenzfaelle.json",
      "./referenz/level1_wochen.json",
      "./referenz/level1_wochen_standardregelwerk.json",
    ]);
  });
});

for (const [pfad, doc] of Object.entries(dokumente)) {
  describe(`Level 1 – ${pfad}`, () => {
    it("ist ein Level-1-Dokument", () => {
      expect(doc.level).toBe(1);
      expect(doc.faelle.length).toBe(doc.anzahl_faelle);
    });

    it.each(doc.faelle.map((fall) => [fall.name, fall] as const))("%s", (_name, fall) => {
      const geprueft = spieleFall(fall);
      expect(geprueft).toBe(fall.schritte.length);
      expect(geprueft).toBeGreaterThanOrEqual(5);
    });
  });
}
