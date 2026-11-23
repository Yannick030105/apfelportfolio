/** Wiki-Inhalt: wiki.md muss exakt KAPITEL/REIHENFOLGE aus 5_wiki.py ergeben; Diagramme je Kapitel. */
import { describe, expect, it } from "vitest";
import soll from "./daten/wiki_kapitel.json";
import { lies_wiki, WIKI } from "../src/content/wiki";
import { wiki_diagramm } from "../src/ui/charts/wiki";

describe("Wiki", () => {
  it("Kapitel und Begriffe woertlich wie im Original", () => {
    expect([...WIKI.reihenfolge]).toEqual(soll.reihenfolge);
    expect(JSON.parse(JSON.stringify(WIKI.kapitel))).toEqual(soll.kapitel);
    expect(Object.values(WIKI.kapitel).reduce((n, k) => n + k.begriffe.length, 0)).toBe(20);
  });

  it("Diagramm nur fuer Preisbildung, Portfolio und Bilanzkreis (wie _render_diagramm)", () => {
    expect(WIKI.reihenfolge.filter((k) => wiki_diagramm(k) !== null)).toEqual(["preisbildung", "portfolio", "bilanzkreis"]);
  });

  it("Formatfehler werden gemeldet", () => {
    expect(() => lies_wiki("# a | b\n\nIntro\n")).toThrow("Kapitelkopf");
    expect(() => lies_wiki("# a | 🍎 | A\n\nIntro\n\n## X\n\nDef\n\nObst: o\n")).toThrow('Begriff "X"');
  });
});
