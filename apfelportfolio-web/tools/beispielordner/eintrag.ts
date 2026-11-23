/**
 * Erzeugt einen Beispiel-Spielordner mit Dummy-Spielstaenden.
 *
 * Gespielt wird mit der ECHTEN Spiellogik (Level-Registry) und den echten
 * Speicherfunktionen (schema.ts) - die Dateien sind also genau so aufgebaut,
 * wie die App sie schreibt. Wuerfel und Spielerentscheidungen kommen aus einem
 * festen Seed, Zeitstempel und Kennungen sind fest: Die Ausgabe ist bei jedem
 * Lauf identisch.
 *
 * Aufruf ueber: npm run beispielordner  (tools/beispielordner_erzeugen.mjs)
 */
import { regelwerk_als_text, eingebautes_regelwerk } from "../../src/config/laden";
import { Tageseinkauf, Wochenverlauf } from "../../src/domain/models";
import { ValueError } from "../../src/domain/fehler";
import type { Wuerfelquelle } from "../../src/domain/wuerfel";
import { finde_level, type LevelId } from "../../src/levels/registry";
import {
  abrechnung_als_daten,
  als_abgeschlossen,
  als_text,
  dateiname,
  mit_abgeschlossenem_tag,
  mit_offenem_tag,
  neuer_spielstand,
  pruefe_spielstand,
  type Spielstand,
} from "../../src/storage/schema";
import { lese_spielstaende } from "../../src/storage/speicher";

/** Kleiner deterministischer Zufallsgenerator (mulberry32) - nur fuer Dummy-Daten. */
function zufall(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quelle(r: () => number): Wuerfelquelle {
  return { randint: (a, b) => a + Math.floor(r() * (b - a + 1)) };
}

/** Plausible Spielerentscheidung innerhalb der Slider-Grenzen (in 10er-Schritten). */
function entscheide(r: () => number, max: number | null, neigung: number): number {
  if (max === null || max <= 0) return 0;
  if (r() > neigung) return 0;
  return Math.min(max, Math.round((r() * max * 0.4) / 10) * 10);
}

interface WochenAuftrag {
  spieler: string;
  levelId: LevelId;
  /** Start der Woche (lokale Zeit) */
  start: Date;
  /** Anzahl gespielter Tage; < 5 = laufende Woche */
  tage: number;
  seed: number;
}

function spieleWoche(auftrag: WochenAuftrag, nr: number): Spielstand {
  const r = zufall(auftrag.seed);
  const wuerfel = quelle(r);
  const eintrag = finde_level(auftrag.levelId);
  const regelwerk = eingebautes_regelwerk();
  const level = eintrag.erzeuge(regelwerk);
  let stand = neuer_spielstand({
    spieler: auftrag.spieler,
    levelId: eintrag.id,
    level: eintrag.nummer,
    regelwerk: regelwerk.als_dict(),
    jetzt: auftrag.start,
    id: `beispiel-${String(nr).padStart(3, "0")}`,
  });
  const woche = new Wochenverlauf({ level: eintrag.nummer });

  for (let tag = 0; tag < 5; tag++) {
    const wuerfe = level.wuerfle_tag(wuerfel);
    const zugestimmt = r() < 0.5;
    if (tag >= auftrag.tage) {
      // laufende Woche: der naechste Tag ist schon gewuerfelt (offener Tag)
      return mit_offenem_tag(stand, { tag_index: tag, wuerfe, zugestimmt: false });
    }
    const lage = level.bereite_tag_vor(tag, wuerfe, zugestimmt);
    const grenzen0 = level.eingabegrenzen(lage, 0, 0);
    const importeur = entscheide(r, grenzen0.importeur_max, 0.6);
    const wochenmarkt = entscheide(r, grenzen0.wochenmarkt_max, 0.4);
    const mostereiMax = level.eingabegrenzen(lage, importeur, wochenmarkt).mosterei_max;
    let mengen = { importeur_menge: importeur, wochenmarkt_menge: wochenmarkt, mosterei_menge: entscheide(r, mostereiMax, 0.5) };
    let abrechnung;
    try {
      abrechnung = level.rechne_tag_ab(lage, new Tageseinkauf(mengen));
    } catch (e) {
      if (!(e instanceof ValueError)) throw e;
      // wie ein Spieler nach dem Fehlerkasten: Mosterei auf 0 und erneut abschliessen
      mengen = { ...mengen, mosterei_menge: 0 };
      abrechnung = level.rechne_tag_ab(lage, new Tageseinkauf(mengen));
    }
    woche.tage.push(abrechnung);
    stand = mit_abgeschlossenem_tag(
      stand,
      { tag_index: tag, tag: lage.tag, wuerfe, zugestimmt: lage.zugestimmt, einkauf: mengen, abrechnung: abrechnung_als_daten(abrechnung) },
      { portfoliostand: level.portfoliostand, importeur_menge_woche: level.importeur_menge_woche },
    );
  }
  // Abschluss etwa eine Viertelstunde nach Wochenstart (im Unterricht gespielt)
  return als_abgeschlossen(stand, woche, new Date(auftrag.start.getTime() + 15 * 60 * 1000));
}

export interface Datei {
  pfad: string;
  text: string;
}

export function erzeuge_beispielordner(): Datei[] {
  const spieler = ["Lena", "Jonas", "Aylin", "Tim", "Sophie"];
  const auftraege: WochenAuftrag[] = [];
  let seed = 2026;
  // Zwei Unterrichtstage, an denen jeder Spieler mehrere Wochen spielt
  for (const [tagNr, datum] of [
    [0, new Date(2026, 10, 16, 8, 30)],
    [1, new Date(2026, 10, 18, 10, 15)],
  ] as const) {
    spieler.forEach((name, i) => {
      const wochen = 1 + ((i + tagNr) % 3); // 1-3 Wochen je Spieler und Tag
      for (let w = 0; w < wochen; w++) {
        const levelId: LevelId = tagNr === 0 || w === 0 ? "level1" : "level2";
        const start = new Date(datum.getTime() + (i * 4 + w * 20) * 60 * 1000);
        auftraege.push({ spieler: name, levelId, start, tage: 5, seed: seed++ });
      }
    });
  }
  // Laufende Wochen (nach Tag 2 bzw. Tag 4 unterbrochen) - werden beim naechsten Oeffnen fortgesetzt
  auftraege.push({ spieler: "Lena", levelId: "level2", start: new Date(2026, 10, 20, 9, 0), tage: 2, seed: seed++ });
  auftraege.push({ spieler: "Tim", levelId: "level1", start: new Date(2026, 10, 20, 9, 5), tage: 4, seed: seed++ });

  const staende = auftraege.map((a, i) => spieleWoche(a, i + 1));
  const dateien: Datei[] = staende.map((s) => ({ pfad: `spielstaende/${dateiname(s)}`, text: als_text(s) }));

  // Kontrolle: jede Datei muss die Pruefung der App bestehen und eindeutig sein
  const ergebnis = lese_spielstaende(dateien.map((d) => ({ name: d.pfad, text: d.text })));
  if (ergebnis.fehlerhaft.length > 0) throw new Error(JSON.stringify(ergebnis.fehlerhaft));
  for (const d of dateien) pruefe_spielstand(JSON.parse(d.text), d.pfad);
  if (new Set(dateien.map((d) => d.pfad)).size !== dateien.length) throw new Error("Dateinamen nicht eindeutig");

  dateien.push({ pfad: "config.json", text: `${regelwerk_als_text(eingebautes_regelwerk())}\n` });
  return dateien;
}
