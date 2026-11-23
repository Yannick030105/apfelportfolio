/**
 * Beispiel-Spielordner (beispiel-spielordner/): gueltig, vollstaendig und identisch mit
 * dem, was tools/beispielordner/eintrag.ts erzeugt (npm run beispielordner).
 */
import { describe, expect, it } from "vitest";
import { erzeuge_beispielordner } from "../tools/beispielordner/eintrag";
import { festerWuerfel } from "../src/domain/wuerfel";
import { Spielzustand } from "../src/state/spielzustand";
import { bekannte_spieler, log_zeilen } from "../src/storage/repository";
import { lese_spielstaende, arbeitsspeicher } from "../src/storage/speicher";

const dateien = import.meta.glob<string>("../beispiel-spielordner/**/*.json", { eager: true, query: "?raw", import: "default" });
const eingelesen = Object.entries(dateien)
  .filter(([pfad]) => pfad.includes("/spielstaende/"))
  .map(([pfad, text]) => ({ name: pfad.split("/").pop() as string, text }));

describe("Beispiel-Spielordner", () => {
  it("entspricht exakt der Generator-Ausgabe (sonst: npm run beispielordner)", () => {
    const soll = erzeuge_beispielordner();
    const ist = Object.fromEntries(Object.entries(dateien).map(([pfad, text]) => [pfad.replace("../beispiel-spielordner/", ""), text]));
    expect(Object.keys(ist).sort()).toEqual(soll.map((d) => d.pfad).sort());
    for (const d of soll) expect(ist[d.pfad], d.pfad).toBe(d.text);
  });

  it("alle Dateien bestehen die Pruefung der App; 20 abgeschlossene, 2 laufende Wochen, 5 Spieler", () => {
    const { spielstaende, fehlerhaft } = lese_spielstaende(eingelesen);
    expect(fehlerhaft).toEqual([]);
    expect(spielstaende.filter((s) => s.status === "abgeschlossen").length).toBe(20);
    expect(spielstaende.filter((s) => s.status === "laufend").length).toBe(2);
    expect(bekannte_spieler(log_zeilen(spielstaende))).toEqual(["Aylin", "Jonas", "Lena", "Sophie", "Tim"]);
  });

  it("laufende Woche von Lena (Level 2) wird beim Oeffnen an Tag 3 fortgesetzt - ohne neu zu wuerfeln", async () => {
    const speicher = arbeitsspeicher();
    for (const { name, text } of eingelesen) speicher.dateien.set(name, text);
    const z = new Spielzustand({ wuerfel: festerWuerfel([]) });
    await z.verbinde_speicher(speicher);
    z.waehle_spieler("Lena");
    const s = z.sitzung("level2");
    expect([s.tag_index, s.woche.tage.length]).toEqual([2, 2]);
    expect(s.wuerfe).toEqual({ w1: 3, baeckerei_menge: 18, ereignis_index: 8 });
    expect(s.level.portfoliostand).toBe(240.5);
  });
});
