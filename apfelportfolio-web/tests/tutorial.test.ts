/** Tutorial-Inhalt: tutorial.md muss exakt SCHRITTE aus 4_tutorial.py ergeben. */
import { describe, expect, it } from "vitest";
import soll from "./daten/tutorial_schritte.json";
import { lies_tutorial, SCHRITTE } from "../src/content/tutorial";

describe("Tutorial", () => {
  it("12 Schritte woertlich wie im Original", () => {
    expect(SCHRITTE.length).toBe(12);
    expect(SCHRITTE.map((s) => ({ ...s }))).toEqual(soll);
  });

  it("unbekanntes Format wird gemeldet", () => {
    expect(() => lies_tutorial("## ohne Trenner\n\nText\n")).toThrow("Schritt 1");
  });
});
