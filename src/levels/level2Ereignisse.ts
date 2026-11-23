/**
 * Level 2 - Bedarf decken mit taeglichem Zufallsereignis (Mo-Fr).
 *
 * Quelle (Python): src/apfelportfolio/levels/level2_ereignisse.py (1:1-Portierung,
 * Stand nach Phase 0: Wuerfelwerte als Parameter).
 *
 * Baut auf Level 1 auf und verwendet dessen Abrechnung wieder (Limits,
 * Freitags-Ausgleich, Ergebnis). Pro Tag GENAU EIN Ereignis veraendert
 * temporaer Stellschrauben (Preise, Mengen, Verfuegbarkeit, Kauf-Limits).
 * Ein Ereignis kann eine JA/NEIN-Entscheidung anbieten; die Effekte greifen
 * dann nur bei Zustimmung.
 *
 * Die Ereignisse (bisher STANDARD_EREIGNISSE) liegen in config/ereignisse.json,
 * die Effekt-Bausteine (bisher EFFEKT_FUNKTIONEN) in effekte.ts.
 */
import ereignisseJson from "../../config/ereignisse.json";
import { IndexError, ValueError } from "../domain/fehler";
import {
  Regelwerk,
  type Tagesabrechnung,
  type Tageseinkauf,
  type Tagesmarkt,
  type Tagesnachfrage,
} from "../domain/models";
import { pythonIntText, pythonRepr } from "../domain/pythonText";
import { pythonInt } from "../domain/runden";
import { effekt_funktion, Tageskontext, zahltyp } from "./effekte";
import { Level1Grundlast, mengenText, WOCHENTAGE, type Level1Optionen } from "./level1Grundlast";

export { IMPORTEUR_SLIDER_MAX, Tageskontext } from "./effekte";

// ---------------------------------------------------------------------------
// Ereignis-Definition (reine Daten).
// ---------------------------------------------------------------------------
export class Effekt {
  readonly name: string; // Schluessel in EFFEKT_FUNKTIONEN
  readonly wert: number;

  constructor(name: string, wert = 1.0) {
    this.name = name;
    this.wert = wert;
    Object.freeze(this);
  }
}

/**
 * entscheidung_text gesetzt -> UI bietet JA/NEIN, Effekte nur bei Zustimmung.
 * entscheidung_text null    -> Effekte wirken automatisch.
 */
export class Ereignis {
  readonly key: string;
  readonly titel: string;
  readonly beschreibung: string;
  readonly effekte: readonly Effekt[];
  readonly entscheidung_text: string | null;
  readonly hinweis: string;

  constructor(f: {
    key: string;
    titel: string;
    beschreibung: string;
    effekte?: readonly Effekt[];
    entscheidung_text?: string | null;
    hinweis?: string;
  }) {
    this.key = f.key;
    this.titel = f.titel;
    this.beschreibung = f.beschreibung;
    this.effekte = Object.freeze([...(f.effekte ?? [])]);
    this.entscheidung_text = f.entscheidung_text ?? null;
    this.hinweis = f.hinweis ?? "";
    Object.freeze(this);
  }
}

function istObjekt(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Liest Ereignisse aus dem JSON-Format von config/ereignisse.json und prueft die
 * Struktur. Effekt-Namen werden - wie im Original - erst bei der Anwendung
 * geprueft (unbekannt -> KeyError).
 */
export function lade_ereignisse(daten: unknown): readonly Ereignis[] {
  const fehler = (text: string): never => {
    throw new ValueError(`ereignisse.json: ${text}`);
  };
  if (!istObjekt(daten) || !Array.isArray(daten.ereignisse)) {
    return fehler('erwartet ein Objekt mit einer Liste "ereignisse".');
  }
  const ergebnis = daten.ereignisse.map((roh, i): Ereignis => {
    const ort = `Ereignis ${i + 1}`;
    if (!istObjekt(roh)) return fehler(`${ort} ist kein Objekt.`);
    for (const feld of ["key", "titel", "beschreibung"] as const) {
      if (typeof roh[feld] !== "string") fehler(`${ort}: "${feld}" muss Text sein.`);
    }
    const entscheidung = roh.entscheidung_text ?? null;
    if (entscheidung !== null && typeof entscheidung !== "string") {
      fehler(`${ort}: "entscheidung_text" muss Text oder null sein.`);
    }
    const hinweis = roh.hinweis ?? "";
    if (typeof hinweis !== "string") fehler(`${ort}: "hinweis" muss Text sein.`);
    const effekteRoh = roh.effekte ?? [];
    if (!Array.isArray(effekteRoh)) return fehler(`${ort}: "effekte" muss eine Liste sein.`);
    const effekte = effekteRoh.map((e, j): Effekt => {
      if (!istObjekt(e) || typeof e.name !== "string") {
        return fehler(`${ort}, Effekt ${j + 1}: "name" muss Text sein.`);
      }
      const wert = e.wert ?? 1.0;
      if (typeof wert !== "number" || !Number.isFinite(wert)) {
        return fehler(`${ort}, Effekt ${j + 1}: "wert" muss eine Zahl sein.`);
      }
      return new Effekt(e.name, wert);
    });
    return new Ereignis({
      key: roh.key as string,
      titel: roh.titel as string,
      beschreibung: roh.beschreibung as string,
      effekte,
      entscheidung_text: entscheidung as string | null,
      hinweis: hinweis as string,
    });
  });
  return Object.freeze(ergebnis);
}

/** Standard-Szenarien aus config/ereignisse.json (eingebaut). Reihenfolge = Wuerfel-Index. */
export const STANDARD_EREIGNISSE: readonly Ereignis[] = lade_ereignisse(ereignisseJson);

/**
 * Waehlt genau ein Ereignis. Der Index kommt vom Wuerfel (wuerfel.ts/waehleIndex,
 * Gleichverteilung wie random.choice). Wie in Python sind negative Indizes
 * vom Ende her erlaubt; ausserhalb der Liste -> IndexError.
 */
export function waehle_ereignis(
  ereignis_index: number,
  ereignisse: readonly Ereignis[] = STANDARD_EREIGNISSE,
): Ereignis {
  const index = ereignis_index < 0 ? ereignis_index + ereignisse.length : ereignis_index;
  const ereignis = Number.isInteger(index) ? ereignisse[index] : undefined;
  if (ereignis === undefined) {
    throw new IndexError("tuple index out of range");
  }
  return ereignis;
}

/** Level 2: Level-1-Mechanik plus taegliches Zufallsereignis. */
export class Level2Ereignisse {
  readonly nummer = 2;
  readonly titel = "Level 2 - Ereignisse meistern (tageweise, Mo-Fr)";

  regelwerk: Regelwerk;
  _level1: Level1Grundlast;
  readonly optionen: Readonly<Level1Optionen>;

  constructor(regelwerk: Regelwerk | null = null, optionen: Level1Optionen = {}) {
    this.optionen = Object.freeze({ ...optionen });
    this.regelwerk = regelwerk !== null ? regelwerk : new Regelwerk();
    this._level1 = new Level1Grundlast(this.regelwerk, this.optionen);
  }

  // -- Zustand an Level 1 durchreichen -----------------------------------
  get portfoliostand(): number {
    return this._level1.portfoliostand;
  }

  zuruecksetzen(): void {
    this._level1 = new Level1Grundlast(this.regelwerk, this.optionen);
  }

  importeur_verfuegbar(tag_index: number): boolean {
    return this._level1.importeur_verfuegbar(tag_index);
  }

  erzeuge_tagesmarkt(w1: number): Tagesmarkt {
    return this._level1.erzeuge_tagesmarkt(w1);
  }

  erzeuge_tagesnachfrage(baeckerei_menge: number): Tagesnachfrage {
    return this._level1.erzeuge_tagesnachfrage(baeckerei_menge);
  }

  erzeuge_ereignis(ereignis_index: number): Ereignis {
    return waehle_ereignis(ereignis_index);
  }

  // -- Effekte anwenden ---------------------------------------------------
  /**
   * Baut den Tageskontext und wendet die Effekte an, wenn das Ereignis
   * keine Entscheidung verlangt oder der Spieler zugestimmt hat.
   */
  wende_ereignis_an(
    tag_index: number,
    markt: Tagesmarkt,
    nachfrage: Tagesnachfrage,
    ereignis: Ereignis,
    zugestimmt = false,
  ): Tageskontext {
    const importeur_rest_heute = this.regelwerk.importeur_limit;
    let kontext = new Tageskontext({
      tag_index,
      markt,
      nachfrage,
      obstbauer_menge: this.regelwerk.obstbauer_menge,
      wochenmarkt_limit: this.regelwerk.wochenmarkt_limit_tag,
      wochenmarkt_limit_typ: zahltyp(this.regelwerk.wochenmarkt_limit_tag),
      importeur_slider_max: importeur_rest_heute,
    });
    const wirkt = ereignis.entscheidung_text === null || zugestimmt;
    if (!wirkt) {
      return kontext;
    }
    for (const effekt of ereignis.effekte) {
      kontext = effekt_funktion(effekt.name)(kontext, effekt.wert);
    }
    return kontext;
  }

  // -- Tagesabrechnung ----------------------------------------------------
  /**
   * Rechnet den Tag ab - Effekte stecken bereits im Kontext.
   * Preise wirken ueber markt.preis_overrides, Obstbauer-Menge und Nachfrage
   * werden an Level 1 durchgereicht. Verfuegbarkeit und Limits werden hier
   * als harte Regeln vor der Abrechnung geprueft.
   */
  rechne_tag_ab(tag: string, kontext: Tageskontext, einkauf: Tageseinkauf, ereignis_titel = ""): Tagesabrechnung {
    this._pruefe_verfuegbarkeit(kontext, einkauf);
    const abrechnung = this._level1.rechne_tag_ab(
      tag,
      kontext.tag_index,
      kontext.markt,
      kontext.nachfrage,
      einkauf,
      kontext.obstbauer_menge,
    );
    return abrechnung.ersetzt({ ereignis_titel });
  }

  _pruefe_verfuegbarkeit(kontext: Tageskontext, einkauf: Tageseinkauf): void {
    if (!kontext.importeur_verfuegbar && einkauf.importeur_menge > 0) {
      throw new ValueError(
        "Der Importeur ist heute (Ereignis) nicht verfuegbar.",
        "Der Importeur liefert heute nicht – das Tagesereignis hat ihn gesperrt.",
      );
    }
    if (!kontext.wochenmarkt_verfuegbar && einkauf.wochenmarkt_menge > 0) {
      throw new ValueError(
        "Der Wochenmarkt ist heute (Ereignis) geschlossen.",
        "Der Wochenmarkt hat heute wegen des Tagesereignisses geschlossen.",
      );
    }
    if (einkauf.wochenmarkt_menge > kontext.wochenmarkt_limit) {
      const limit =
        kontext.wochenmarkt_limit_typ === "int"
          ? pythonIntText(kontext.wochenmarkt_limit)
          : pythonRepr(kontext.wochenmarkt_limit);
      throw new ValueError(
        `Wochenmarkt-Menge ${pythonRepr(einkauf.wochenmarkt_menge)} ueberschreitet ` +
          `das heutige Limit von ${limit} Stueck.`,
        `Am Wochenmarkt kannst du heute höchstens ${mengenText(kontext.wochenmarkt_limit)} Äpfel kaufen.`,
      );
    }
  }
}

/** Slider-Grenzen der Level-2-Handelskonsole; null = Slider ausgeblendet. */
export interface EingabegrenzenLevel2 {
  importeur_max: number | null;
  wochenmarkt_max: number | null;
  mosterei_max: number | null;
}

/**
 * Slider-Grenzen fuer Level 2, exakt wie in ui/pages/level_2.py (main()).
 * Unveraendert inkl. Eigenheit: Der Mosterei-Bestand nutzt die Nachfrage VOR
 * dem Ereignis (nachfrage), aber die Obstbauer-Menge NACH dem Ereignis
 * (kontext.obstbauer_menge) - siehe MIGRATION_NOTES, Auffaelligkeit 4.
 */
export function eingabegrenzen_level2(
  level: Level2Ereignisse,
  kontext: Tageskontext,
  nachfrage: Tagesnachfrage,
  tag_index: number,
  importeur_menge: number,
  wochenmarkt_menge: number,
): EingabegrenzenLevel2 {
  const importeur_max =
    kontext.importeur_verfuegbar && level.importeur_verfuegbar(tag_index)
      ? pythonInt(kontext.importeur_slider_max)
      : null;
  const wochenmarkt_max = kontext.wochenmarkt_verfuegbar ? pythonInt(kontext.wochenmarkt_limit) : null;
  let mosterei_max: number | null = null;
  if (tag_index !== WOCHENTAGE.length - 1) {
    const verfuegbarer_bestand =
      level.portfoliostand +
      kontext.obstbauer_menge +
      importeur_menge +
      wochenmarkt_menge -
      nachfrage.schulessen -
      nachfrage.baeckerei_bestellt;
    const abgeschnitten = pythonInt(verfuegbarer_bestand);
    mosterei_max = 0 > abgeschnitten ? 0 : abgeschnitten; // Python: max(int(...), 0)
  }
  return { importeur_max, wochenmarkt_max, mosterei_max };
}
