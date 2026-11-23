/**
 * Haendler-Kennzahlen der Startseite gegen die ORIGINAL-Funktion
 * _spieler_kennzahlen aus ui/pages/home.py (tools/home_referenz_erzeugen.py).
 */
import { describe, expect, it } from "vitest";
import daten from "./daten/home_referenz.json";
import ranking from "./daten/ranking_referenz.json";
import { spieler_kennzahlen } from "../src/dashboard/spielerKennzahlen";
import type { LogZeile } from "../src/storage/schema";
import { fix } from "../src/ui/format";

interface Ref {
  faelle: {
    spieler: string;
    letzte_eindeutig: boolean;
    kennzahlen: Record<string, unknown>;
    texte: { best_text: string; badge_icons: string; rang_text: string; gewinn_text: string; wochen_text: string };
  }[];
  leeres_log: Record<string, unknown>;
}
const d = daten as unknown as Ref;
const zeilen: LogZeile[] = (ranking as unknown as { zeilen: { spieler: string; datum: string; level: number; endergebnis: number }[] }).zeilen.map(
  (z) => ({ ...z, rest_long_short: 0, anteil_spot: 0, anteil_grundlast: 1, prognosefehler: null, referenzergebnis_nichthandeln: 0 }),
);
const z = (spieler: string, endergebnis: number, datum: string | null, level = 1): LogZeile => ({
  spieler, datum, level, endergebnis, rest_long_short: 0, anteil_spot: 0, anteil_grundlast: 1, prognosefehler: null, referenzergebnis_nichthandeln: 0,
});

describe("Startseite – _spieler_kennzahlen (Soll aus home.py)", () => {
  it("Daten ohne mehrdeutige letzte Zeile", () => {
    expect(d.faelle.every((f) => f.letzte_eindeutig)).toBe(true);
  });

  it.each(d.faelle.map((f) => [f.spieler, f] as const))("%s", (spieler, fall) => {
    const k = spieler_kennzahlen(zeilen, spieler);
    expect(k).toEqual(fall.kennzahlen);
    // Texte aus _render_trader_card / _render_vorschau
    expect({
      best_text: k.best !== null ? `${fix(k.best, 2)} €` : "–",
      badge_icons: k.badges.filter((b) => b.freigeschaltet).map((b) => b.icon).join(""),
      rang_text: k.letzter_rang ? `#${k.letzter_rang}` : "–",
      gewinn_text: k.letzter_gewinn !== null ? `${fix(k.letzter_gewinn, 2)} €` : "–",
      wochen_text: k.wochen ? String(k.wochen) : "0",
    }).toEqual(fall.texte);
  });

  it("leeres Log", () => {
    expect(spieler_kennzahlen([], "Anna")).toEqual(d.leeres_log);
  });
});

describe("Startseite – festgelegte Regeln bei Mehrdeutigkeit", () => {
  it("mehrere Durchlaeufe am letzten Tag: der zuletzt abgeschlossene zaehlt", () => {
    expect(spieler_kennzahlen([z("A", 1, "2026-01-02"), z("A", 2, "2026-01-02"), z("A", 3, "2026-01-01")], "A").letzter_gewinn).toBe(2);
  });

  it("fehlendes Datum gilt wie bei pandas als letzte Zeile", () => {
    expect(spieler_kennzahlen([z("A", 1, null), z("A", 2, "2026-01-02")], "A").letzter_gewinn).toBe(1);
  });

  it("letzter Rang bezieht sich auf das Level der letzten Zeile", () => {
    const df = [z("A", 10, "2026-01-01", 1), z("B", 50, "2026-01-01", 2), z("A", 5, "2026-01-03", 2), z("C", 99, "2026-01-01", 1)];
    expect(spieler_kennzahlen(df, "A").letzter_rang).toBe(2); // Level 2: B 50, A 5
  });
});
