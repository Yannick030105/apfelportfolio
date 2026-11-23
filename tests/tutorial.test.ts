/**
 * Tutorial-Inhalt: tutorial.md muss SCHRITTE aus 4_tutorial.py ergeben -
 * woertlich, bis auf die ausdruecklich genehmigten Aenderungen in
 * tests/daten/tutorial_abweichungen.json (jede mit Originaltext).
 */
import { describe, expect, it } from "vitest";
import soll from "./daten/tutorial_schritte.json";
import abweichungen from "./daten/tutorial_abweichungen.json";
import { lies_tutorial, SCHRITTE, type TutorialSchritt } from "../src/content/tutorial";

type Feld = "icon" | "titel" | "erklaerung" | "beispiel";

function sollMitAbweichungen(): TutorialSchritt[] {
  const schritte = soll.map((s) => ({ ...s }));
  for (const a of abweichungen.aenderungen) {
    const treffer = schritte.filter((s) => s.titel === a.titel);
    expect(treffer.length, a.titel).toBe(1);
    const schritt = treffer[0]!;
    expect(schritt[a.feld as Feld], `${a.titel}: Originaltext`).toBe(a.alt);
    schritt[a.feld as Feld] = a.neu;
  }
  return schritte;
}

describe("Tutorial", () => {
  it("12 Schritte woertlich wie im Original (plus genehmigte Aenderungen)", () => {
    expect(SCHRITTE.length).toBe(12);
    expect(SCHRITTE.map((s) => ({ ...s }))).toEqual(sollMitAbweichungen());
  });

  it("genehmigte Aenderungen sind genau die Unterschiede zum Original", () => {
    const unterschiede = SCHRITTE.flatMap((s, i) =>
      (["icon", "titel", "erklaerung", "beispiel"] as const)
        .filter((f) => s[f] !== soll[i]![f])
        .map((f) => `${soll[i]!.titel}/${f}`),
    );
    expect(unterschiede).toEqual(abweichungen.aenderungen.map((a) => `${a.titel}/${a.feld}`));
  });

  it("unbekanntes Format wird gemeldet", () => {
    expect(() => lies_tutorial("## ohne Trenner\n\nText\n")).toThrow("Schritt 1");
  });
});
