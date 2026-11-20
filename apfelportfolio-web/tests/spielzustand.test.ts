/**
 * Spielzustand (Ersatz fuer st.session_state) und Widget-Zustand (Streamlit-Rerun-Verhalten).
 */
import { describe, expect, it } from "vitest";
import { Regelwerk } from "../src/domain/models";
import { festerWuerfel } from "../src/domain/wuerfel";
import type { LevelId } from "../src/levels/registry";
import { Spielzustand } from "../src/state/spielzustand";
import { WidgetZustand } from "../src/state/widgetZustand";
import { arbeitsspeicher } from "../src/storage/speicher";
import { abrechnung_dict, type FallRef, type ReferenzDokument } from "./hilfen/referenz";

const referenzen = import.meta.glob<ReferenzDokument>("./referenz/level*.json", { eager: true, import: "default" });
const JETZT = () => new Date(2026, 10, 20, 9, 0, 0);

/** Wuerfelfolge eines Falls: je Tag einmal (Wiederholungen nach Fehlern wuerfeln nicht neu). */
function wuerfelfolge(fall: FallRef, mitEreignis: boolean): number[] {
  const folge: number[] = [];
  let letzterTag = -1;
  for (const s of fall.schritte) {
    if (s.tag_index === letzterTag) continue;
    letzterTag = s.tag_index;
    folge.push(s.eingabe.w1, s.eingabe.baeckerei_menge);
    if (mitEreignis) folge.push(s.eingabe.ereignis_index as number);
  }
  return folge;
}

async function spieleUeberZustand(levelId: LevelId, fall: FallRef) {
  const speicher = arbeitsspeicher();
  const z = new Spielzustand({ wuerfel: festerWuerfel(wuerfelfolge(fall, levelId === "level2")), jetzt: JETZT });
  await z.verbinde_speicher(speicher);
  z.regelwerk = new Regelwerk(fall.regelwerk);
  z.waehle_spieler("Anna");
  const sitzung = z.sitzung(levelId);
  for (const s of fall.schritte) {
    const e = s.eingabe;
    const lage = z.lage(sitzung);
    expect(lage?.tag_index, `${fall.name}: Tag`).toBe(s.tag_index);
    if (lage?.ereignis?.entscheidung_text != null) z.setze_zustimmung(levelId, e.zugestimmt ?? false);
    expect(sitzung.level.eingabegrenzen(z.lage(sitzung) as NonNullable<typeof lage>, e.einkauf.importeur_menge, e.einkauf.wochenmarkt_menge)).toEqual(s.ui_grenzen);
    const tageVorher = sitzung.woche.tage.length;
    await z.schliesse_tag_ab(levelId, e.einkauf);
    if (s.fehler !== undefined) {
      expect(sitzung.fehler, fall.name).toBe(s.fehler);
      expect(sitzung.woche.tage.length).toBe(tageVorher);
    } else {
      expect(sitzung.fehler).toBeNull();
      expect(abrechnung_dict(sitzung.woche.tage[tageVorher] as never), `${fall.name} ${s.tag}`).toEqual(s.abrechnung);
    }
    expect({ portfoliostand: sitzung.level.portfoliostand, importeur_menge_woche: sitzung.level.importeur_menge_woche }).toEqual(s.zustand_danach);
  }
  await z.gespeichert();
  return { z, sitzung, speicher };
}

describe("Spielzustand spielt alle Referenzwochen ueber die Aktionen der Spielseite", () => {
  for (const [pfad, doc] of Object.entries(referenzen)) {
    it(`${pfad}: ${doc.anzahl_faelle} Wochen`, async () => {
      const levelId: LevelId = doc.level === 1 ? "level1" : "level2";
      for (const fall of doc.faelle) {
        const { sitzung, speicher } = await spieleUeberZustand(levelId, fall);
        expect(sitzung.woche.wochenergebnis).toBe(fall.woche.wochenergebnis);
        expect(sitzung.tag_index).toBe(5);
        expect(sitzung.wuerfe).toBeNull(); // nach Freitag wird nicht mehr gewuerfelt
        expect(sitzung.spielstand.status).toBe("abgeschlossen");
        const geladen = (await speicher.lade_alle()).spielstaende;
        expect(geladen.length).toBe(1);
        expect(geladen[0]?.log_zeile?.endergebnis).toBe(fall.woche.wochenergebnis);
      }
    });
  }
});

describe("Spielzustand – Einzelheiten", () => {
  it("ohne Spieler: Meldung wie im Original", () => {
    expect(() => new Spielzustand().sitzung("level1")).toThrow("Bitte wähle zuerst auf der Startseite einen Spieler aus.");
  });

  it("Preishistorie wird wie im Original VOR der Abrechnung ergaenzt - auch bei Fehler", async () => {
    const z = new Spielzustand({ wuerfel: festerWuerfel([3, 20, 4, 30]), jetzt: JETZT });
    z.waehle_spieler("Ben");
    const s = z.sitzung("level1");
    await z.schliesse_tag_ab("level1", { importeur_menge: 0, wochenmarkt_menge: 0, mosterei_menge: 99999 });
    expect(s.fehler).toContain("Verkauf an Mosterei");
    expect(s.preishistorie.length).toBe(1);
    z.verwerfe_fehler("level1");
    expect(s.fehler).toBeNull();
    await z.schliesse_tag_ab("level1", { importeur_menge: 0, wochenmarkt_menge: 0, mosterei_menge: 0 });
    expect(s.preishistorie.length).toBe(2);
    expect(s.tag_index).toBe(1);
  });

  it("eigene Sitzung je Spieler und Level", () => {
    const z = new Spielzustand({ wuerfel: festerWuerfel([1, 10, 2, 20, 0, 3, 30]), jetzt: JETZT });
    z.waehle_spieler("Anna");
    const a1 = z.sitzung("level1");
    const a2 = z.sitzung("level2");
    z.waehle_spieler("Ben");
    const b1 = z.sitzung("level1");
    expect(new Set([a1, a2, b1]).size).toBe(3);
    z.waehle_spieler("Anna");
    expect(z.sitzung("level1")).toBe(a1);
    expect(a2.wuerfe).toEqual({ w1: 2, baeckerei_menge: 20, ereignis_index: 0 });
  });

  it("laufende Woche wird nach Neuladen fortgesetzt - mit denselben Wuerfeln fuer den offenen Tag", async () => {
    const speicher = arbeitsspeicher();
    const z1 = new Spielzustand({ wuerfel: festerWuerfel([2, 30, 5, 40]), jetzt: JETZT });
    await z1.verbinde_speicher(speicher);
    z1.waehle_spieler("Cem");
    z1.sitzung("level1");
    await z1.schliesse_tag_ab("level1", { importeur_menge: 50, wochenmarkt_menge: 0, mosterei_menge: 0 });
    await z1.gespeichert();
    const vorher = z1.sitzung("level1");

    const z2 = new Spielzustand({ wuerfel: festerWuerfel([]), jetzt: JETZT }); // wuerfelt nicht neu
    await z2.verbinde_speicher(speicher);
    z2.waehle_spieler("Cem");
    const nachher = z2.sitzung("level1");
    expect(nachher.tag_index).toBe(1);
    expect(nachher.wuerfe).toEqual({ w1: 5, baeckerei_menge: 40, ereignis_index: null });
    expect(nachher.level.portfoliostand).toBe(vorher.level.portfoliostand);
    expect(nachher.level.importeur_menge_woche).toBe(50);
    expect(nachher.woche.wochenergebnis).toBe(vorher.woche.wochenergebnis);
    expect(nachher.preishistorie.map((m) => m.zufallspreis)).toEqual([2]);
  });

  it("Neue Woche: Zustand zurueck, neuer Spielstand, Level-Objekt bleibt (wie session_state.level1)", async () => {
    const speicher = arbeitsspeicher();
    const z = new Spielzustand({ wuerfel: festerWuerfel([2, 30, 5, 40, 1, 10]), jetzt: JETZT });
    await z.verbinde_speicher(speicher);
    z.waehle_spieler("Dana");
    const s = z.sitzung("level1");
    const level = s.level;
    const alteId = s.spielstand.id;
    await z.schliesse_tag_ab("level1", { importeur_menge: 10, wochenmarkt_menge: 0, mosterei_menge: 0 });
    await z.neue_woche("level1");
    expect([s.tag_index, s.woche.tage.length, s.preishistorie.length, s.level.portfoliostand]).toEqual([0, 0, 0, 0]);
    expect(s.level).toBe(level);
    expect(s.spielstand.id).not.toBe(alteId);
    expect(s.wuerfe?.w1).toBe(1);
  });

  it("Speicherfehler wird gemeldet, Spiel laeuft weiter", async () => {
    const speicher = { ...arbeitsspeicher(), speichere: async () => { throw new Error("Laufwerk nicht erreichbar"); } };
    const z = new Spielzustand({ wuerfel: festerWuerfel([2, 30, 5, 40]), jetzt: JETZT });
    await z.verbinde_speicher(speicher);
    z.waehle_spieler("Emil");
    z.sitzung("level1");
    await z.schliesse_tag_ab("level1", { importeur_menge: 0, wochenmarkt_menge: 0, mosterei_menge: 0 });
    expect(z.speicherfehler).toBe("Spielstand konnte nicht gespeichert werden: Laufwerk nicht erreichbar");
    expect(z.sitzung("level1").tag_index).toBe(1);
  });
});

describe("WidgetZustand (Streamlit-Widget-IDs)", () => {
  it("gleiche ID behaelt den Wert, neue ID startet neu, nicht angezeigte werden verworfen", () => {
    const w = new WidgetZustand();
    const imp = WidgetZustand.id("slider", "Zukauf beim Importeur (Äpfel)", [0, 300, 0]);
    w.beginneDurchlauf();
    expect(w.wert(imp, 0)).toBe(0);
    w.setze(imp, 50);
    w.beendeDurchlauf();

    w.beginneDurchlauf(); // naechster Tag, gleiche Parameter
    expect(w.wert(imp, 0)).toBe(50);
    w.beendeDurchlauf();

    const anderesMax = WidgetZustand.id("slider", "Zukauf beim Importeur (Äpfel)", [0, 450, 0]);
    w.beginneDurchlauf();
    expect(w.wert(anderesMax, 0)).toBe(0);
    w.beendeDurchlauf(); // alte ID nicht angezeigt -> weg

    w.beginneDurchlauf();
    expect(w.wert(imp, 0)).toBe(0);
    w.beendeDurchlauf();
  });
});
