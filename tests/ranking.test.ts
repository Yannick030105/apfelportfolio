/**
 * Ranking-Berechnungen gegen Soll-Werte aus den ORIGINAL-Funktionen von
 * ui/pages/3_ranking.py (tools/ranking_referenz_erzeugen.py).
 */
import { describe, expect, it } from "vitest";
import daten from "./daten/ranking_referenz.json";
import { badge_icons, eigene_statistik, highscores_je_level, verlauf } from "../src/dashboard/ranking";
import type { LogZeile } from "../src/storage/schema";
import { fix } from "../src/ui/format";

interface Ref {
  zeilen: { spieler: string; datum: string; level: number; endergebnis: number }[];
  level: {
    level: number;
    bestenliste: { rang: number; spieler: string; endergebnis: number; podium_text: string; karten_text: string }[];
    badges: Record<string, string>;
    statistik: Record<string, { eigener_rang: number; bestes_ergebnis: number; gesamt: number; meldung: string; abstand_text: string; bestes_text: string }>;
    verlauf: Record<string, { datum: string; endergebnis: number }[] | null>;
  }[];
}
const d = daten as unknown as Ref;

const zeilen: LogZeile[] = d.zeilen.map((z) => ({
  ...z,
  rest_long_short: 0,
  anteil_spot: 0,
  anteil_grundlast: 1,
  prognosefehler: null,
  referenzergebnis_nichthandeln: 0,
}));

/** Meldungstext wie _render_eigene_statistik */
function meldung(level: number, s: NonNullable<ReturnType<typeof eigene_statistik>>): string {
  return s.abstand === null
    ? `🏆 Du führst die Bestenliste in Level ${level} an!`
    : `Du stehst auf Platz ${s.eigener_rang} von ${s.gesamt}. Nur ${fix(s.abstand, 2)} € fehlen dir zu Platz 1 – weiterspielen lohnt sich!`;
}

describe("Ranking – Soll aus 3_ranking.py", () => {
  for (const ref of d.level) {
    describe(`Level ${ref.level}`, () => {
      const bestenliste = highscores_je_level(zeilen, ref.level);
      const df_level = zeilen.filter((z) => z.level === ref.level);

      it("Bestenliste (Rang, Spieler, Ergebnis, Anzeige)", () => {
        expect(bestenliste.length).toBeGreaterThan(8);
        expect(
          bestenliste.map((b) => ({
            rang: b.rang,
            spieler: b.spieler,
            endergebnis: b.endergebnis,
            podium_text: `${fix(b.endergebnis, 0)} €`,
            karten_text: `${fix(b.endergebnis, 2)} €`,
          })),
        ).toEqual(ref.bestenliste);
      });

      it("Badges je Spieler", () => {
        for (const b of bestenliste) expect(badge_icons(df_level, b.spieler), b.spieler).toBe(ref.badges[b.spieler]);
      });

      it("eigene Statistik je Spieler", () => {
        for (const [spieler, soll] of Object.entries(ref.statistik)) {
          const s = eigene_statistik(bestenliste, spieler);
          expect(s, spieler).not.toBeNull();
          if (s === null) continue;
          expect({
            eigener_rang: s.eigener_rang,
            bestes_ergebnis: s.bestes_ergebnis,
            gesamt: s.gesamt,
            meldung: meldung(ref.level, s),
            abstand_text: s.abstand === null ? "0.00 €" : `${fix(s.abstand, 2)} €`,
            bestes_text: `${fix(s.bestes_ergebnis, 2)} €`,
          }).toEqual(soll);
        }
      });

      it("Verlauf je Spieler (nach Datum, < 2 Durchlaeufe -> kein Diagramm)", () => {
        for (const [spieler, soll] of Object.entries(ref.verlauf)) {
          const v = verlauf(zeilen, ref.level, spieler);
          expect(v.length < 2 ? null : v.map((z) => ({ datum: z.datum, endergebnis: z.endergebnis })), spieler).toEqual(soll);
        }
      });
    });
  }
});

describe("Ranking – Gleichstaende und Randfaelle (feste Regel der TS-Version)", () => {
  const z = (spieler: string, endergebnis: number, datum: string | null = "2026-01-01", level = 1): LogZeile => ({
    spieler, datum, level, endergebnis, rest_long_short: 0, anteil_spot: 0, anteil_grundlast: 1, prognosefehler: null, referenzergebnis_nichthandeln: 0,
  });

  it("gleiche Bestwerte: alphabetisch (Gruppenreihenfolge), Raenge fortlaufend", () => {
    const b = highscores_je_level([z("Ben", 5), z("anna", 7), z("Cem", 7), z("Anna", 7), z("Ben", 1)], 1);
    expect(b.map((x) => [x.rang, x.spieler, x.endergebnis])).toEqual([
      [1, "Anna", 7], [2, "Cem", 7], [3, "anna", 7], [4, "Ben", 5],
    ]);
  });

  it("idxmax: bei gleichem Bestwert eines Spielers zaehlt der erste Durchlauf", () => {
    const erste = z("Anna", 7, "2026-01-01");
    const b = highscores_je_level([erste, z("Anna", 7, "2026-02-01")], 1);
    expect(b[0]?.zeile).toBe(erste);
  });

  it("leeres Level, unbekannter Spieler", () => {
    expect(highscores_je_level([z("A", 1)], 2)).toEqual([]);
    expect(eigene_statistik(highscores_je_level([z("A", 1)], 1), "B")).toBeNull();
  });

  it("Verlauf: fehlendes Datum zuletzt, gleiche Daten in Log-Reihenfolge", () => {
    const v = verlauf([z("A", 1, null), z("A", 2, "2026-03-01"), z("A", 3, "2026-01-01"), z("A", 4, "2026-01-01")], 1, "A");
    expect(v.map((x) => x.endergebnis)).toEqual([3, 4, 2, 1]);
  });
});
