/**
 * Abgleich der Python-Nachbauten (round, :.Nf, repr, sum) mit Soll-Werten,
 * die direkt aus Python erzeugt wurden (tools/python_builtins_erzeugen.py).
 */
import { describe, expect, it } from "vitest";
import daten from "./daten/python_builtins.json";
import { OverflowError, ValueError } from "../src/domain/fehler";
import { pythonIntText, pythonRepr } from "../src/domain/pythonText";
import { formatFixed, pythonRound } from "../src/domain/runden";
import { pythonSumme } from "../src/domain/summe";

interface Builtins {
  round_ohne: [number, number][];
  round_mit: [number, number, number | "OverflowError"][];
  format_fixed: [number, number, string][];
  repr: [number, string][];
  summe: [number[], number][];
}
const d = daten as unknown as Builtins;

/** Vergleich inkl. Vorzeichen der Null (Object.is). */
function abweichungen<T>(faelle: T[], pruefe: (fall: T) => boolean): T[] {
  return faelle.filter((fall) => !pruefe(fall));
}

describe("pythonRound", () => {
  it(`round(x) – ${d.round_ohne.length} Fälle`, () => {
    expect(d.round_ohne.length).toBeGreaterThan(1000);
    expect(abweichungen(d.round_ohne, ([x, soll]) => Object.is(pythonRound(x), soll))).toEqual([]);
  });

  it(`round(x, n) – ${d.round_mit.length} Fälle`, () => {
    expect(d.round_mit.length).toBeGreaterThan(9000);
    const falsch = abweichungen(d.round_mit, ([x, n, soll]) => {
      if (soll === "OverflowError") {
        try {
          pythonRound(x, n);
          return false;
        } catch (e) {
          return e instanceof OverflowError;
        }
      }
      return Object.is(pythonRound(x, n), soll);
    });
    expect(falsch).toEqual([]);
  });

  it("Sonderwerte wie Python", () => {
    expect(() => pythonRound(Number.NaN)).toThrow(ValueError);
    expect(() => pythonRound(Number.POSITIVE_INFINITY)).toThrow(OverflowError);
    expect(pythonRound(Number.POSITIVE_INFINITY, 2)).toBe(Number.POSITIVE_INFINITY);
    expect(pythonRound(Number.NaN, 2)).toBeNaN();
    expect(Object.is(pythonRound(-0.4), 0)).toBe(true); // int: keine negative Null
    expect(Object.is(pythonRound(-0.4, 0), -0)).toBe(true); // float: negative Null
  });
});

describe("formatFixed (f\"{x:.Nf}\")", () => {
  it(`${d.format_fixed.length} Fälle`, () => {
    expect(d.format_fixed.length).toBeGreaterThan(3000);
    expect(abweichungen(d.format_fixed, ([x, n, soll]) => formatFixed(x, n) === soll)).toEqual([]);
  });

  it("Sonderwerte wie Python", () => {
    expect(formatFixed(Number.NaN, 0)).toBe("nan");
    expect(formatFixed(Number.POSITIVE_INFINITY, 2)).toBe("inf");
    expect(formatFixed(Number.NEGATIVE_INFINITY, 2)).toBe("-inf");
  });
});

describe("pythonRepr", () => {
  it(`${d.repr.length} Fälle`, () => {
    expect(d.repr.length).toBeGreaterThan(1000);
    expect(abweichungen(d.repr, ([x, soll]) => pythonRepr(x) === soll)).toEqual([]);
  });

  it("int-typisierte Werte", () => {
    expect(pythonIntText(300)).toBe("300");
    expect(pythonIntText(150.5)).toBe("150.5");
    expect(pythonIntText(-7)).toBe("-7");
  });
});

describe("pythonSumme", () => {
  it(`${d.summe.length} Listen`, () => {
    expect(d.summe.length).toBe(3000);
    expect(abweichungen(d.summe, ([xs, soll]) => Object.is(pythonSumme(xs), soll))).toEqual([]);
  });

  it("leere Liste ergibt 0", () => {
    expect(pythonSumme([])).toBe(0);
  });
});
