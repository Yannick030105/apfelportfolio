/** Einheitstests fuer Modelle und Wuerfelquelle (Verhalten wie models.py / random). */
import { describe, expect, it } from "vitest";
import { PythonTypeError, ValueError } from "../src/domain/fehler";
import {
  Bilanzkreis,
  Regelwerk,
  REGELWERK_STANDARD,
  Tagesmarkt,
  Wochenverlauf,
} from "../src/domain/models";
import { festerWuerfel, waehleIndex, wuerfleBaeckereiMenge, wuerfleW1, zufallsWuerfel } from "../src/domain/wuerfel";

describe("Regelwerk", () => {
  it("hat die Python-Defaults (nicht config.json)", () => {
    expect(new Regelwerk().als_dict()).toEqual({
      importeur_limit: 200,
      wochenmarkt_limit_tag: 140,
      schulessen_menge: 80,
      schulessen_preis: 0.4,
      obstbauer_menge: 100.0,
      obstbauer_preis: 0.35,
      baeckerei_preis_aufschlag: 0.2,
      baeckerei_preis_min: 1,
      baeckerei_preis_max: 6,
      baeckerei_menge_min: 10,
      baeckerei_menge_max: 60,
    });
    expect(Object.isFrozen(REGELWERK_STANDARD)).toBe(true);
  });

  it.each([
    [{ importeur_limit: -1 }, "Importeur-Obergrenze darf nicht negativ sein."],
    [{ schulessen_menge: -1 }, "Schulessen-Menge darf nicht negativ sein."],
    [{ schulessen_preis: -0.1 }, "Schulessen-Preis darf nicht negativ sein."],
    [{ obstbauer_menge: -1 }, "Obstbauer-Menge darf nicht negativ sein."],
    [{ obstbauer_preis: -1 }, "Obstbauer-Preis darf nicht negativ sein."],
    [{ baeckerei_preis_aufschlag: -1 }, "Baeckerei-Preisaufschlag darf nicht negativ sein."],
    [{ baeckerei_preis_min: 7 }, "W1-Minimum darf nicht groesser als W1-Maximum sein."],
    [{ baeckerei_menge_min: 61 }, "Baeckerei-Mengenminimum darf nicht groesser als das Maximum sein."],
  ])("validiert() meldet %o", (werte, meldung) => {
    expect(() => new Regelwerk(werte).validiert()).toThrow(ValueError);
    expect(() => new Regelwerk(werte).validiert()).toThrow(meldung);
  });

  it("validiert() prueft wochenmarkt_limit_tag nicht (wie im Original)", () => {
    const rw = new Regelwerk({ wochenmarkt_limit_tag: -5 });
    expect(rw.validiert()).toBe(rw);
  });
});

describe("Tagesmarkt", () => {
  it("leitet Preise aus W1 ab, Mosterei aus dem (ggf. ueberschriebenen) Wochenmarktpreis", () => {
    const m = new Tagesmarkt({ zufallspreis: 3 });
    expect(m.preis_importeur).toBe(3 / 10);
    expect(m.preis_wochenmarkt).toBe(3 / 10 + 0.1);
    expect(m.preis_baeckerei).toBe(3 / 10 + 0.2);
    expect(m.preis_mosterei).toBe(0.8 * (3 / 10 + 0.1));
    const o = new Tagesmarkt({ zufallspreis: 3, preis_overrides: { preis_wochenmarkt: 1 } });
    expect(o.preis_mosterei).toBe(0.8);
  });

  it("ist unveraenderlich (frozen dataclass)", () => {
    const m = new Tagesmarkt({ zufallspreis: 1, preis_overrides: { preis_baeckerei: 0.3 } });
    expect(Object.isFrozen(m)).toBe(true);
    expect(Object.isFrozen(m.preis_overrides)).toBe(true);
  });
});

describe("Kleinteile", () => {
  it("Bilanzkreis-Eigenschaften", () => {
    expect(new Bilanzkreis({ saldo: 1 }).ist_long).toBe(true);
    expect(new Bilanzkreis({ saldo: -1 }).ist_short).toBe(true);
    expect(new Bilanzkreis({ saldo: 0 }).ist_ausgeglichen).toBe(true);
  });

  it("Wochenverlauf: leer = Ergebnis 0, komplett ab 5 Tagen", () => {
    const w = new Wochenverlauf({ level: 1 });
    expect(w.wochenergebnis).toBe(0);
    expect(w.ist_komplett).toBe(false);
  });
});

describe("Wuerfel", () => {
  it("festerWuerfel liefert die Folge und prueft Grenzen", () => {
    const rw = new Regelwerk();
    const q = festerWuerfel([6, 60, 1]);
    expect(wuerfleW1(rw, q)).toBe(6);
    expect(wuerfleBaeckereiMenge(rw, q)).toBe(60);
    expect(() => wuerfleBaeckereiMenge(rw, q)).toThrow("ausserhalb");
  });

  it("zufallsWuerfel bleibt in den Grenzen und trifft beide Raender", () => {
    const gesehen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const w = zufallsWuerfel.randint(1, 6);
      expect(Number.isInteger(w)).toBe(true);
      gesehen.add(w);
    }
    expect([...gesehen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("wie Python: TypeError bei nicht-ganzzahligen Grenzen, ValueError bei leerer Spanne", () => {
    expect(() => zufallsWuerfel.randint(1.5, 6)).toThrow(PythonTypeError);
    expect(() => zufallsWuerfel.randint(6, 1)).toThrow(ValueError);
    expect(() => waehleIndex(0)).toThrow("empty sequence");
  });

  it("Baeckerei-Menge nutzt int() der Regelwerk-Grenzen", () => {
    const rw = new Regelwerk({ baeckerei_menge_min: 10.9, baeckerei_menge_max: 12.7 });
    expect(wuerfleBaeckereiMenge(rw, festerWuerfel([10]))).toBe(10);
    expect(() => wuerfleBaeckereiMenge(rw, festerWuerfel([13]))).toThrow("ausserhalb von [10, 12]");
  });
});
