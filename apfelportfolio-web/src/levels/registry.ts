/**
 * Gemeinsame Schnittstelle aller Tages-Level und ihre Registrierung.
 *
 * Quelle (Python): keine direkte Entsprechung. Im Original haben Level 1 und
 * Level 2 je eine eigene Streamlit-Seite (ui/pages/1_spielen.py, level_2.py),
 * die die Level-Klassen leicht unterschiedlich ansprechen. Diese Datei fasst
 * den Ablauf beider Seiten zu EINER Schnittstelle zusammen, damit die
 * TS-Spielseite fuer alle Level gleich ist (Architektur-Vorgabe in CLAUDE.md).
 * Die Adapter enthalten keine eigene Spiellogik, sondern rufen genau die
 * Methoden in genau der Reihenfolge auf, wie es die Original-Seiten tun.
 *
 * Ablauf eines Spieltags (wie in Streamlit):
 *   1. wuerfle_tag()      - einmal pro Tag (Streamlit: st.session_state.tagesmarkt is None)
 *   2. bereite_tag_vor()  - bei jeder Aenderung des JA/NEIN-Schalters neu (Rerun)
 *   3. eingabegrenzen()   - bei jeder Slider-Bewegung neu (Rerun)
 *   4. rechne_tag_ab()    - Klick auf "Handel abschliessen"
 *   neue_woche()          - Klick auf "Neue Woche starten"
 * Neue Level: Klasse in src/levels/ anlegen, Adapter hier ergaenzen und in
 * LEVEL_REGISTRY eintragen - die Spielseite bleibt unveraendert.
 */
import type { Regelwerk, Tagesabrechnung, Tageseinkauf, Tagesmarkt, Tagesnachfrage } from "../domain/models";
import { waehleIndex, wuerfleBaeckereiMenge, wuerfleW1, type Wuerfelquelle } from "../domain/wuerfel";
import type { Tageskontext } from "./effekte";
import { eingabegrenzen_level1, Level1Grundlast, WOCHENTAGE } from "./level1Grundlast";
import {
  eingabegrenzen_level2,
  Level2Ereignisse,
  STANDARD_EREIGNISSE,
  type Ereignis,
} from "./level2Ereignisse";

export type LevelId = "level1" | "level2";

/** Alle Zufallswerte eines Tages (werden im Spielstand gespeichert). */
export interface TagesWuerfe {
  w1: number;
  baeckerei_menge: number;
  /** nur bei Leveln mit Ereignissen */
  ereignis_index: number | null;
}

/** Alles, was die Spielseite fuer einen Tag anzeigt und zur Abrechnung braucht. */
export interface Tageslage {
  readonly tag_index: number;
  readonly tag: string;
  /** Markt/Nachfrage wie gewuerfelt (vor einem Ereignis) */
  readonly markt_gewuerfelt: Tagesmarkt;
  readonly nachfrage_gewuerfelt: Tagesnachfrage;
  /** Markt/Nachfrage, die heute gelten (nach Ereignis-Effekten; Level 1: = gewuerfelt) */
  readonly markt: Tagesmarkt;
  readonly nachfrage: Tagesnachfrage;
  readonly obstbauer_menge: number;
  readonly ereignis: Ereignis | null;
  readonly zugestimmt: boolean;
  /** nur Level 2 */
  readonly kontext: Tageskontext | null;
}

export interface Eingabegrenzen {
  importeur_max: number | null;
  wochenmarkt_max: number | null;
  mosterei_max: number | null;
}

export interface SpielLevel {
  readonly id: LevelId;
  readonly nummer: number;
  readonly titel: string;
  readonly regelwerk: Regelwerk;
  readonly hat_ereignisse: boolean;
  readonly portfoliostand: number;
  /** Python-Zustand (fuer Spielstand/Tests); wird im Original nie geprueft */
  readonly importeur_menge_woche: number;
  neue_woche(): void;
  wuerfle_tag(quelle?: Wuerfelquelle): TagesWuerfe;
  bereite_tag_vor(tag_index: number, wuerfe: TagesWuerfe, zugestimmt: boolean): Tageslage;
  eingabegrenzen(lage: Tageslage, importeur_menge: number, wochenmarkt_menge: number): Eingabegrenzen;
  rechne_tag_ab(lage: Tageslage, einkauf: Tageseinkauf): Tagesabrechnung;
  /** Zustand wiederherstellen (Spielstand laden) */
  setze_zustand(zustand: { portfoliostand: number; importeur_menge_woche: number }): void;
}

function tagName(tag_index: number): string {
  const tag = WOCHENTAGE[tag_index];
  if (tag === undefined) throw new RangeError(`Ungueltiger Tag-Index ${tag_index}`);
  return tag;
}

/** Ablauf aus ui/pages/1_spielen.py */
class Level1Adapter implements SpielLevel {
  readonly id = "level1" as const;
  readonly hat_ereignisse = false;
  private readonly level: Level1Grundlast;

  constructor(regelwerk: Regelwerk) {
    this.level = new Level1Grundlast(regelwerk);
  }

  get nummer(): number {
    return this.level.nummer;
  }
  get titel(): string {
    return this.level.titel;
  }
  get regelwerk(): Regelwerk {
    return this.level.regelwerk;
  }
  get portfoliostand(): number {
    return this.level.portfoliostand;
  }
  get importeur_menge_woche(): number {
    return this.level._importeur_menge_woche;
  }

  neue_woche(): void {
    // _neue_woche_starten(): setzt die Felder am bestehenden Objekt zurueck
    this.level.portfoliostand = 0.0;
    this.level._importeur_menge_woche = 0.0;
  }

  wuerfle_tag(quelle?: Wuerfelquelle): TagesWuerfe {
    // Reihenfolge wie im Original: erst Tagesmarkt (W1), dann Nachfrage
    const w1 = wuerfleW1(this.level.regelwerk, quelle);
    const baeckerei_menge = wuerfleBaeckereiMenge(this.level.regelwerk, quelle);
    return { w1, baeckerei_menge, ereignis_index: null };
  }

  bereite_tag_vor(tag_index: number, wuerfe: TagesWuerfe): Tageslage {
    const markt = this.level.erzeuge_tagesmarkt(wuerfe.w1);
    const nachfrage = this.level.erzeuge_tagesnachfrage(wuerfe.baeckerei_menge);
    return Object.freeze({
      tag_index,
      tag: tagName(tag_index),
      markt_gewuerfelt: markt,
      nachfrage_gewuerfelt: nachfrage,
      markt,
      nachfrage,
      obstbauer_menge: this.level.regelwerk.obstbauer_menge,
      ereignis: null,
      zugestimmt: false,
      kontext: null,
    });
  }

  eingabegrenzen(lage: Tageslage, importeur_menge: number, wochenmarkt_menge: number): Eingabegrenzen {
    return eingabegrenzen_level1(this.level, lage.nachfrage, lage.tag_index, importeur_menge, wochenmarkt_menge);
  }

  rechne_tag_ab(lage: Tageslage, einkauf: Tageseinkauf): Tagesabrechnung {
    return this.level.rechne_tag_ab(lage.tag, lage.tag_index, lage.markt, lage.nachfrage, einkauf);
  }

  setze_zustand(zustand: { portfoliostand: number; importeur_menge_woche: number }): void {
    this.level.portfoliostand = zustand.portfoliostand;
    this.level._importeur_menge_woche = zustand.importeur_menge_woche;
  }
}

/** Ablauf aus ui/pages/level_2.py */
class Level2Adapter implements SpielLevel {
  readonly id = "level2" as const;
  readonly hat_ereignisse = true;
  private readonly level: Level2Ereignisse;

  constructor(regelwerk: Regelwerk) {
    this.level = new Level2Ereignisse(regelwerk);
  }

  get nummer(): number {
    return this.level.nummer;
  }
  get titel(): string {
    return this.level.titel;
  }
  get regelwerk(): Regelwerk {
    return this.level.regelwerk;
  }
  get portfoliostand(): number {
    return this.level.portfoliostand;
  }
  get importeur_menge_woche(): number {
    return this.level._level1._importeur_menge_woche;
  }

  neue_woche(): void {
    this.level.zuruecksetzen();
  }

  wuerfle_tag(quelle?: Wuerfelquelle): TagesWuerfe {
    // _neuen_tag_ziehen(): Tagesmarkt, Nachfrage, Ereignis
    const w1 = wuerfleW1(this.level.regelwerk, quelle);
    const baeckerei_menge = wuerfleBaeckereiMenge(this.level.regelwerk, quelle);
    const ereignis_index = waehleIndex(STANDARD_EREIGNISSE.length, quelle);
    return { w1, baeckerei_menge, ereignis_index };
  }

  bereite_tag_vor(tag_index: number, wuerfe: TagesWuerfe, zugestimmt: boolean): Tageslage {
    if (wuerfe.ereignis_index === null) {
      throw new Error("Level 2 braucht einen Ereignis-Index.");
    }
    const markt = this.level.erzeuge_tagesmarkt(wuerfe.w1);
    const nachfrage = this.level.erzeuge_tagesnachfrage(wuerfe.baeckerei_menge);
    const ereignis = this.level.erzeuge_ereignis(wuerfe.ereignis_index);
    // Schalter existiert nur bei Entscheidungsereignissen, sonst False (wie level_2.py)
    const zustimmung = ereignis.entscheidung_text !== null ? zugestimmt : false;
    const kontext = this.level.wende_ereignis_an(tag_index, markt, nachfrage, ereignis, zustimmung);
    return Object.freeze({
      tag_index,
      tag: tagName(tag_index),
      markt_gewuerfelt: markt,
      nachfrage_gewuerfelt: nachfrage,
      markt: kontext.markt,
      nachfrage: kontext.nachfrage,
      obstbauer_menge: kontext.obstbauer_menge,
      ereignis,
      zugestimmt: zustimmung,
      kontext,
    });
  }

  eingabegrenzen(lage: Tageslage, importeur_menge: number, wochenmarkt_menge: number): Eingabegrenzen {
    // level_2.py uebergibt fuer den Mosterei-Slider die Nachfrage VOR dem Ereignis
    return eingabegrenzen_level2(
      this.level,
      this.kontextVon(lage),
      lage.nachfrage_gewuerfelt,
      lage.tag_index,
      importeur_menge,
      wochenmarkt_menge,
    );
  }

  rechne_tag_ab(lage: Tageslage, einkauf: Tageseinkauf): Tagesabrechnung {
    const ereignis = lage.ereignis;
    if (ereignis === null) throw new Error("Level 2 braucht ein Ereignis.");
    return this.level.rechne_tag_ab(lage.tag, this.kontextVon(lage), einkauf, ereignis.titel);
  }

  setze_zustand(zustand: { portfoliostand: number; importeur_menge_woche: number }): void {
    this.level._level1.portfoliostand = zustand.portfoliostand;
    this.level._level1._importeur_menge_woche = zustand.importeur_menge_woche;
  }

  private kontextVon(lage: Tageslage): Tageskontext {
    if (lage.kontext === null) throw new Error("Level 2 braucht einen Tageskontext.");
    return lage.kontext;
  }
}

export interface LevelEintrag {
  readonly id: LevelId;
  readonly nummer: number;
  /** Navigationstitel wie in app.py */
  readonly navigationstitel: string;
  readonly erzeuge: (regelwerk: Regelwerk) => SpielLevel;
}

export const LEVEL_REGISTRY: readonly LevelEintrag[] = Object.freeze([
  Object.freeze({
    id: "level1" as const,
    nummer: 1,
    navigationstitel: "Level 1",
    erzeuge: (regelwerk: Regelwerk): SpielLevel => new Level1Adapter(regelwerk),
  }),
  Object.freeze({
    id: "level2" as const,
    nummer: 2,
    navigationstitel: "Level 2",
    erzeuge: (regelwerk: Regelwerk): SpielLevel => new Level2Adapter(regelwerk),
  }),
]);

export function finde_level(id: LevelId): LevelEintrag {
  const eintrag = LEVEL_REGISTRY.find((e) => e.id === id);
  if (eintrag === undefined) throw new Error(`Unbekanntes Level: ${id}`);
  return eintrag;
}
