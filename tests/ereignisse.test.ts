/**
 * config/ereignisse.json und Effekt-Bausteine (bisher STANDARD_EREIGNISSE /
 * EFFEKT_FUNKTIONEN in level2_ereignisse.py).
 */
import { describe, expect, it } from "vitest";
import { IndexError, KeyError, ValueError } from "../src/domain/fehler";
import { Regelwerk, Tageseinkauf } from "../src/domain/models";
import { EFFEKT_FUNKTIONEN, effekt_funktion, IMPORTEUR_SLIDER_MAX, Tageskontext } from "../src/levels/effekte";
import { Level1Grundlast } from "../src/levels/level1Grundlast";
import {
  Effekt,
  Ereignis,
  lade_ereignisse,
  Level2Ereignisse,
  STANDARD_EREIGNISSE,
  waehle_ereignis,
} from "../src/levels/level2Ereignisse";
import type { ReferenzDokument } from "./hilfen/referenz";

const dokumente = import.meta.glob<ReferenzDokument>("./referenz/level2_*.json", {
  eager: true,
  import: "default",
});

describe("STANDARD_EREIGNISSE aus config/ereignisse.json", () => {
  it("enthaelt die 9 Ereignisse in Original-Reihenfolge", () => {
    expect(STANDARD_EREIGNISSE.map((e) => e.key)).toEqual([
      "ruhiger_tag",
      "importeur_streik",
      "wochenmarkt_feiertag",
      "ernteausfall",
      "baeckerei_grossauftrag",
      "importeur_rabatt",
      "wochenmarkt_knappheit",
      "mosterei_nachfrage",
      "schulessen_projektwoche",
    ]);
  });

  it("passt zu Index und Key in allen Level-2-Referenzdaten", () => {
    let geprueft = 0;
    for (const doc of Object.values(dokumente)) {
      for (const fall of doc.faelle) {
        for (const s of fall.schritte) {
          expect(STANDARD_EREIGNISSE[s.eingabe.ereignis_index as number]?.key).toBe(s.eingabe.ereignis_key);
          if (s.abrechnung !== undefined) {
            expect(s.abrechnung.ereignis_titel).toBe(STANDARD_EREIGNISSE[s.eingabe.ereignis_index as number]?.titel);
          }
          geprueft += 1;
        }
      }
    }
    expect(geprueft).toBeGreaterThan(1900);
  });

  it("verwendet nur bekannte Effekt-Namen", () => {
    for (const e of STANDARD_EREIGNISSE) {
      for (const eff of e.effekte) expect(Object.keys(EFFEKT_FUNKTIONEN)).toContain(eff.name);
    }
  });

  it("nur 'importeur_rabatt' verlangt eine Entscheidung (woertlicher Text)", () => {
    const mitEntscheidung = STANDARD_EREIGNISSE.filter((e) => e.entscheidung_text !== null);
    expect(mitEntscheidung.map((e) => [e.key, e.entscheidung_text])).toEqual([
      ["importeur_rabatt", "Grosslieferung annehmen? (Rabatt + hoeheres Kauflimit)"],
    ]);
  });
});

describe("lade_ereignisse", () => {
  it("setzt Defaults wie die Python-Dataclasses (wert 1.0, entscheidung null, hinweis leer)", () => {
    const [e] = lade_ereignisse({
      ereignisse: [{ key: "k", titel: "T", beschreibung: "B", effekte: [{ name: "importeur_gesperrt" }] }],
    });
    expect(e).toEqual(
      new Ereignis({ key: "k", titel: "T", beschreibung: "B", effekte: [new Effekt("importeur_gesperrt", 1.0)] }),
    );
    expect(e?.entscheidung_text).toBeNull();
    expect(e?.hinweis).toBe("");
  });

  it.each([
    [null, 'erwartet ein Objekt mit einer Liste "ereignisse".'],
    [{ ereignisse: [{ titel: "T", beschreibung: "B" }] }, 'Ereignis 1: "key" muss Text sein.'],
    [{ ereignisse: [{ key: "k", titel: "T", beschreibung: "B", effekte: [{ name: "x", wert: "2" }] }] }, '"wert" muss eine Zahl sein.'],
  ])("meldet Strukturfehler verstaendlich: %o", (daten, meldung) => {
    expect(() => lade_ereignisse(daten)).toThrow(ValueError);
    expect(() => lade_ereignisse(daten)).toThrow(meldung);
  });

  it("unbekannter Effekt-Name faellt wie im Original erst bei der Anwendung auf (KeyError)", () => {
    const [e] = lade_ereignisse({ ereignisse: [{ key: "k", titel: "T", beschreibung: "B", effekte: [{ name: "gibts_nicht" }] }] });
    const level = new Level2Ereignisse();
    expect(() =>
      level.wende_ereignis_an(0, level.erzeuge_tagesmarkt(1), level.erzeuge_tagesnachfrage(10), e as Ereignis),
    ).toThrow(KeyError);
    expect(() => effekt_funktion("gibts_nicht")).toThrow("'gibts_nicht'");
  });
});

describe("waehle_ereignis", () => {
  it("negativer Index zaehlt wie in Python vom Ende, ausserhalb -> IndexError", () => {
    expect(waehle_ereignis(-1).key).toBe("schulessen_projektwoche");
    expect(() => waehle_ereignis(9)).toThrow(IndexError);
    expect(() => waehle_ereignis(-10)).toThrow(IndexError);
  });
});

describe("Tageskontext", () => {
  it("Defaults wie die Python-Dataclass", () => {
    const l1 = new Level1Grundlast();
    const k = new Tageskontext({ tag_index: 0, markt: l1.erzeuge_tagesmarkt(1), nachfrage: l1.erzeuge_tagesnachfrage(10) });
    expect([k.obstbauer_menge, k.wochenmarkt_limit, k.importeur_slider_max]).toEqual([100, 140, IMPORTEUR_SLIDER_MAX]);
    expect([k.importeur_verfuegbar, k.wochenmarkt_verfuegbar]).toEqual([true, true]);
    expect(k.wochenmarkt_limit_typ).toBe("float");
  });

  it("Fehlermeldung: int-Limit ohne, effekt-skaliertes Limit mit '.0' (Python int*float)", () => {
    const level = new Level2Ereignisse(new Regelwerk({ wochenmarkt_limit_tag: 300 }));
    const markt = level.erzeuge_tagesmarkt(2);
    const nachfrage = level.erzeuge_tagesnachfrage(20);
    const ruhig = level.wende_ereignis_an(0, markt, nachfrage, waehle_ereignis(0));
    const knapp = level.wende_ereignis_an(0, markt, nachfrage, waehle_ereignis(6));
    const einkauf = new Tageseinkauf({ wochenmarkt_menge: 400 });
    expect(() => level.rechne_tag_ab("Montag", ruhig, einkauf)).toThrow("das heutige Limit von 300 Stueck.");
    expect(() => level.rechne_tag_ab("Montag", knapp, einkauf)).toThrow("das heutige Limit von 150.0 Stueck.");
  });
});
