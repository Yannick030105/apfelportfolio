/**
 * Ergaenzende Level-1-Tests fuer Faelle, die in den (eingefrorenen)
 * Referenzdaten nicht vorkommen - v. a. halbzahlige Bestaende in
 * Fehlermeldungen (":.0f" rundet half-to-even, auch "-0").
 *
 * Alle Soll-Werte stammen aus einem Lauf des alten Python-Codes
 * (Level1Grundlast mit Regelwerk(obstbauer_menge=200), W1=3, Montag),
 * siehe MIGRATION_NOTES Phase 2.
 */
import { describe, expect, it } from "vitest";
import { ValueError } from "../src/domain/fehler";
import { Regelwerk, Tageseinkauf, Tagesnachfrage } from "../src/domain/models";
import { Level1Grundlast, eingabegrenzen_level1 } from "../src/levels/level1Grundlast";

function montag(schulessen: number, baeckerei: number, mosterei: number, stand: number) {
  const level = new Level1Grundlast(new Regelwerk({ obstbauer_menge: 200 }));
  level.portfoliostand = stand;
  const markt = level.erzeuge_tagesmarkt(3);
  const nachfrage = new Tagesnachfrage({ schulessen, baeckerei_bestellt: baeckerei });
  return () => level.rechne_tag_ab("Montag", 0, markt, nachfrage, new Tageseinkauf({ mosterei_menge: mosterei }));
}

describe("Level 1 – Fehlermeldungen mit halbzahligen Werten (Soll aus Python)", () => {
  it.each([
    [67.5, 10, 500, 0.0, "Verkauf an Mosterei (500) uebersteigt den verfuegbaren Bestand (122)."],
    [68.5, 10, 500, 0.0, "Verkauf an Mosterei (500) uebersteigt den verfuegbaren Bestand (122)."],
    [90, 10, 2.5, -197.5, "Verkauf an Mosterei (2) uebersteigt den verfuegbaren Bestand (-98)."],
    [90, 10, 1, -100.5, "Verkauf an Mosterei (1) uebersteigt den verfuegbaren Bestand (-0)."],
    [90.5, 10, 0.5, -100.0, "Verkauf an Mosterei (0) uebersteigt den verfuegbaren Bestand (-0)."],
  ])("Schulessen %s, Bäckerei %s, Mosterei %s, Stand %s", (schulessen, baeckerei, mosterei, stand, meldung) => {
    const aufruf = montag(schulessen, baeckerei, mosterei, stand);
    expect(aufruf).toThrow(ValueError);
    expect(aufruf).toThrow(meldung);
  });

  it("Mosterei exakt am halbzahligen Bestand ist erlaubt (Python: Saldo -122.5)", () => {
    // Original-Regel: Verkauf an die Mosterei wird Mo-Do doppelt abgezogen
    const level = new Level1Grundlast(new Regelwerk({ obstbauer_menge: 200 }), {
      original_mosterei_doppelabzug: true,
    });
    const a = level.rechne_tag_ab(
      "Montag",
      0,
      level.erzeuge_tagesmarkt(3),
      new Tagesnachfrage({ schulessen: 67.5, baeckerei_bestellt: 10 }),
      new Tageseinkauf({ mosterei_menge: 122.5 }),
    );
    expect(a.bilanzkreis_saldo).toBe(-122.5);
    expect(level.portfoliostand).toBe(-122.5);
  });

  it("korrigierte Regel: Mosterei-Verkauf wird nur einmal abgezogen (Saldo 0)", () => {
    const level = new Level1Grundlast(new Regelwerk({ obstbauer_menge: 200 }));
    const a = level.rechne_tag_ab(
      "Montag",
      0,
      level.erzeuge_tagesmarkt(3),
      new Tagesnachfrage({ schulessen: 67.5, baeckerei_bestellt: 10 }),
      new Tageseinkauf({ mosterei_menge: 122.5 }),
    );
    expect(a.an_mosterei_geliefert).toBe(122.5);
    expect(a.bilanzkreis_saldo).toBe(0);
    expect(level.portfoliostand).toBe(0);
  });

  it("Wochenmarkt-Meldung mit nicht ganzzahligem Limit (Python: repr beider Werte)", () => {
    const level = new Level1Grundlast(new Regelwerk({ wochenmarkt_limit_tag: 150.5 }));
    expect(() =>
      level.rechne_tag_ab(
        "Montag",
        0,
        level.erzeuge_tagesmarkt(1),
        level.erzeuge_tagesnachfrage(10),
        new Tageseinkauf({ wochenmarkt_menge: 151.25 }),
      ),
    ).toThrow("Wochenmarkt-Menge 151.25 ueberschreitet das Tageslimit von 150.5 Stueck.");
  });
});

describe("Level 1 – Slider-Grenzen", () => {
  it("negativer Bestand zwischen -1 und 0 ergibt Mosterei-Maximum 0 (keine negative Null)", () => {
    const level = new Level1Grundlast(new Regelwerk({ obstbauer_menge: 100 }));
    level.portfoliostand = -20.5;
    const nachfrage = new Tagesnachfrage({ schulessen: 70, baeckerei_bestellt: 10 });
    const grenzen = eingabegrenzen_level1(level, nachfrage, 1, 0, 0);
    expect(Object.is(grenzen.mosterei_max, 0)).toBe(true);
  });

  it("Freitag: kein Mosterei-Slider, Donnerstag: kein Importeur-Slider", () => {
    const level = new Level1Grundlast();
    const nachfrage = level.erzeuge_tagesnachfrage(10);
    expect(eingabegrenzen_level1(level, nachfrage, 4, 0, 0).mosterei_max).toBeNull();
    expect(eingabegrenzen_level1(level, nachfrage, 3, 0, 0).importeur_max).toBeNull();
    expect(eingabegrenzen_level1(level, nachfrage, 2, 0, 0).importeur_max).toBe(200);
  });
});
