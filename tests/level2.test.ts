/**
 * Level 2 gegen ALLE Level-2-Referenzfaelle (tests/referenz/level2_*.json).
 *
 * Wie bei Level 1 wird jeder Schritt exakt verglichen, zusaetzlich das
 * gezogene Ereignis und der Tageskontext nach Anwendung der Effekte.
 */
import { describe, expect, it } from "vitest";
import { ValueError } from "../src/domain/fehler";
import { Regelwerk, Tageseinkauf, Wochenverlauf, type Tagesabrechnung } from "../src/domain/models";
import { pythonSumme } from "../src/domain/summe";
import type { Tageskontext } from "../src/levels/effekte";
import { Level2Ereignisse, eingabegrenzen_level2 } from "../src/levels/level2Ereignisse";
import {
  abrechnung_dict,
  markt_dict,
  nachfrage_dict,
  type FallRef,
  type ReferenzDokument,
} from "./hilfen/referenz";

/** Referenzdaten stammen aus dem Original: Mosterei-Verkauf Mo-Do wie dort doppelt abziehen. */
const ORIGINAL = { original_mosterei_doppelabzug: true } as const;

const dokumente = import.meta.glob<ReferenzDokument>("./referenz/level2_*.json", {
  eager: true,
  import: "default",
});

export function kontext_dict(k: Tageskontext) {
  return {
    tag_index: k.tag_index,
    markt: markt_dict(k.markt),
    nachfrage: nachfrage_dict(k.nachfrage),
    obstbauer_menge: k.obstbauer_menge,
    importeur_verfuegbar: k.importeur_verfuegbar,
    wochenmarkt_verfuegbar: k.wochenmarkt_verfuegbar,
    wochenmarkt_limit: k.wochenmarkt_limit,
    importeur_slider_max: k.importeur_slider_max,
  };
}

function spieleFall(fall: FallRef): number {
  const level = new Level2Ereignisse(new Regelwerk(fall.regelwerk), ORIGINAL);
  const woche = new Wochenverlauf({ level: level.nummer });
  let geprueft = 0;

  fall.schritte.forEach((schritt, i) => {
    const ort = `${fall.name}, Schritt ${i} (${schritt.tag})`;
    const e = schritt.eingabe;
    expect(e.ereignis_index, `${ort}: Ereignis-Index vorhanden`).toBeTypeOf("number");

    const markt = level.erzeuge_tagesmarkt(e.w1);
    expect(markt_dict(markt), `${ort}: Tagesmarkt`).toEqual(schritt.markt);
    const nachfrage = level.erzeuge_tagesnachfrage(e.baeckerei_menge);
    expect(nachfrage_dict(nachfrage), `${ort}: Tagesnachfrage`).toEqual(schritt.nachfrage);
    const ereignis = level.erzeuge_ereignis(e.ereignis_index as number);
    expect(ereignis.key, `${ort}: Ereignis`).toBe(e.ereignis_key);

    const kontext = level.wende_ereignis_an(schritt.tag_index, markt, nachfrage, ereignis, e.zugestimmt ?? false);
    expect(kontext_dict(kontext), `${ort}: Tageskontext`).toEqual(schritt.kontext);

    const grenzen = eingabegrenzen_level2(
      level,
      kontext,
      nachfrage,
      schritt.tag_index,
      e.einkauf.importeur_menge,
      e.einkauf.wochenmarkt_menge,
    );
    expect(grenzen, `${ort}: Slider-Grenzen`).toEqual(schritt.ui_grenzen);

    let abrechnung: Tagesabrechnung | null = null;
    let fehler: unknown = null;
    try {
      abrechnung = level.rechne_tag_ab(schritt.tag, kontext, new Tageseinkauf(e.einkauf), ereignis.titel);
    } catch (err) {
      fehler = err;
    }

    if (schritt.fehler !== undefined) {
      expect(abrechnung, `${ort}: Fehler erwartet`).toBeNull();
      expect(fehler, `${ort}: Fehlertyp`).toBeInstanceOf(ValueError);
      expect((fehler as ValueError).message, `${ort}: Fehlermeldung`).toBe(schritt.fehler);
    } else {
      expect(fehler, `${ort}: unerwarteter Fehler`).toBeNull();
      expect(abrechnung_dict(abrechnung as Tagesabrechnung), `${ort}: Tagesabrechnung`).toEqual(schritt.abrechnung);
      woche.tage.push(abrechnung as Tagesabrechnung);
    }

    expect(
      { portfoliostand: level.portfoliostand, importeur_menge_woche: level._level1._importeur_menge_woche },
      `${ort}: Zustand danach`,
    ).toEqual(schritt.zustand_danach);
    geprueft += 1;
  });

  expect(
    {
      anzahl_tage: woche.tage.length,
      ist_komplett: woche.ist_komplett,
      wochenergebnis: woche.wochenergebnis,
      rest_long_short: pythonSumme(woche.tage.map((t) => t.bilanzkreis_saldo)),
    },
    `${fall.name}: Woche`,
  ).toEqual({
    anzahl_tage: fall.woche.anzahl_tage,
    ist_komplett: fall.woche.ist_komplett,
    wochenergebnis: fall.woche.wochenergebnis,
    rest_long_short: fall.woche.rest_long_short,
  });
  return geprueft;
}

describe("Level 2 – Referenzdateien vorhanden", () => {
  it("findet alle drei Level-2-Dateien", () => {
    expect(Object.keys(dokumente).sort()).toEqual([
      "./referenz/level2_grenzfaelle.json",
      "./referenz/level2_wochen.json",
      "./referenz/level2_wochen_standardregelwerk.json",
    ]);
  });
});

for (const [pfad, doc] of Object.entries(dokumente)) {
  describe(`Level 2 – ${pfad}`, () => {
    it("ist ein Level-2-Dokument", () => {
      expect(doc.level).toBe(2);
      expect(doc.faelle.length).toBe(doc.anzahl_faelle);
    });

    it.each(doc.faelle.map((fall) => [fall.name, fall] as const))("%s", (_name, fall) => {
      const geprueft = spieleFall(fall);
      expect(geprueft).toBe(fall.schritte.length);
      expect(geprueft).toBeGreaterThanOrEqual(5);
    });
  });
}
