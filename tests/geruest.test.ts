/**
 * Phase 1: Gerüsttests. Prüfen nur Infrastruktur (Version, Lesbarkeit der
 * Referenzdaten), keine Spiellogik.
 */
import { describe, expect, it } from "vitest";
import paket from "../package.json";
import { APP_VERSION } from "../src/version";

interface ReferenzDokument {
  format: string;
  formatVersion: number;
  level: number;
  anzahl_faelle: number;
  faelle: unknown[];
}

const referenzen = import.meta.glob<ReferenzDokument>("./referenz/*.json", {
  eager: true,
  import: "default",
});

describe("Gerüst", () => {
  it("übernimmt die Version aus package.json", () => {
    expect(APP_VERSION).toBe(paket.version);
  });

  it("findet alle Referenzdateien mit bekanntem Format", () => {
    const namen = Object.keys(referenzen).sort();
    expect(namen).toEqual([
      "./referenz/level1_grenzfaelle.json",
      "./referenz/level1_wochen.json",
      "./referenz/level1_wochen_standardregelwerk.json",
      "./referenz/level2_grenzfaelle.json",
      "./referenz/level2_wochen.json",
      "./referenz/level2_wochen_standardregelwerk.json",
    ]);
    for (const [name, doc] of Object.entries(referenzen)) {
      expect(doc.format).toBe("apfelportfolio-referenz");
      expect(doc.formatVersion).toBe(1);
      expect(doc.level).toBe(name.includes("level1") ? 1 : 2);
      expect(doc.faelle.length).toBe(doc.anzahl_faelle);
      if (name.endsWith("level1_wochen.json") || name.endsWith("level2_wochen.json")) {
        expect(doc.anzahl_faelle).toBe(300);
      }
    }
  });
});
