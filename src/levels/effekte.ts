/**
 * Tageskontext und Effekt-Bausteine der Level-2-Ereignisse.
 *
 * Quelle (Python): src/apfelportfolio/levels/level2_ereignisse.py
 *   - dataclass Tageskontext
 *   - _skaliere_preis, _skaliere_nachfrage
 *   - EFFEKT_FUNKTIONEN
 *
 * Neue Wirkungsarten hier EINMAL ergaenzen und in EFFEKT_FUNKTIONEN eintragen;
 * neue Szenarien nur in config/ereignisse.json.
 */
import { KeyError } from "../domain/fehler";
import type { PreisFeld, Tagesmarkt, Tagesnachfrage } from "../domain/models";
import { OBSTBAUER_MENGE, WOCHENMARKT_MAX_PRO_TAG } from "./level1Grundlast";

/** Slider-Obergrenze fuer den Importeur-Zukauf (per Ereignis veraenderbar). */
export const IMPORTEUR_SLIDER_MAX = 100.0;

/**
 * Python-Typ eines Zahlenwerts, soweit er in Fehlermeldungen sichtbar wird:
 * int wird ohne ".0" eingesetzt, float mit (300 vs. 150.0).
 */
export type PythonZahltyp = "int" | "float";

export interface TageskontextFelder {
  tag_index: number;
  markt: Tagesmarkt;
  nachfrage: Tagesnachfrage;
  obstbauer_menge?: number;
  importeur_verfuegbar?: boolean;
  wochenmarkt_verfuegbar?: boolean;
  wochenmarkt_limit?: number;
  importeur_slider_max?: number;
  /** nur TS: Python-Typ von wochenmarkt_limit (fuer die Fehlermeldung) */
  wochenmarkt_limit_typ?: PythonZahltyp;
}

/** Tageskontext: alle pro Tag veraenderbaren Stellschrauben an einem Ort. */
export class Tageskontext {
  readonly tag_index: number;
  readonly markt: Tagesmarkt;
  readonly nachfrage: Tagesnachfrage;
  readonly obstbauer_menge: number;
  readonly importeur_verfuegbar: boolean;
  readonly wochenmarkt_verfuegbar: boolean;
  readonly wochenmarkt_limit: number;
  readonly importeur_slider_max: number;
  readonly wochenmarkt_limit_typ: PythonZahltyp;

  constructor(f: TageskontextFelder) {
    this.tag_index = f.tag_index;
    this.markt = f.markt;
    this.nachfrage = f.nachfrage;
    this.obstbauer_menge = f.obstbauer_menge ?? OBSTBAUER_MENGE;
    this.importeur_verfuegbar = f.importeur_verfuegbar ?? true;
    this.wochenmarkt_verfuegbar = f.wochenmarkt_verfuegbar ?? true;
    this.wochenmarkt_limit = f.wochenmarkt_limit ?? WOCHENMARKT_MAX_PRO_TAG;
    this.importeur_slider_max = f.importeur_slider_max ?? IMPORTEUR_SLIDER_MAX;
    // Default WOCHENMARKT_MAX_PRO_TAG = 140.0 ist in Python ein float.
    this.wochenmarkt_limit_typ =
      f.wochenmarkt_limit_typ ?? (f.wochenmarkt_limit === undefined ? "float" : zahltyp(f.wochenmarkt_limit));
    Object.freeze(this);
  }

  /** Python: dataclasses.replace(kontext, **aenderungen) */
  ersetzt(aenderungen: Partial<TageskontextFelder>): Tageskontext {
    return new Tageskontext({
      tag_index: this.tag_index,
      markt: this.markt,
      nachfrage: this.nachfrage,
      obstbauer_menge: this.obstbauer_menge,
      importeur_verfuegbar: this.importeur_verfuegbar,
      wochenmarkt_verfuegbar: this.wochenmarkt_verfuegbar,
      wochenmarkt_limit: this.wochenmarkt_limit,
      importeur_slider_max: this.importeur_slider_max,
      wochenmarkt_limit_typ: this.wochenmarkt_limit_typ,
      ...aenderungen,
    });
  }
}

/**
 * Bester Schaetzwert fuer den Python-Typ eines Werts aus dem Regelwerk:
 * ganzzahlig -> int (config.json-Werte wie 300), sonst float.
 */
export function zahltyp(wert: number): PythonZahltyp {
  return Number.isInteger(wert) ? "int" : "float";
}

// ---------------------------------------------------------------------------
// Effekt-Bausteine: (kontext, wert) -> neuer kontext.
// ---------------------------------------------------------------------------
function _skaliere_preis(kontext: Tageskontext, faktor: number, feld: PreisFeld): Tageskontext {
  const overrides: Record<string, number> = { ...kontext.markt.preis_overrides };
  overrides[feld] = kontext.markt[feld] * faktor;
  return kontext.ersetzt({ markt: kontext.markt.ersetzt({ preis_overrides: overrides }) });
}

type NachfrageFeld = "schulessen" | "baeckerei_bestellt";

function _skaliere_nachfrage(kontext: Tageskontext, faktor: number, feld: NachfrageFeld): Tageskontext {
  const neu = kontext.nachfrage.ersetzt({ [feld]: kontext.nachfrage[feld] * faktor });
  return kontext.ersetzt({ nachfrage: neu });
}

export type EffektFunktion = (kontext: Tageskontext, wert: number) => Tageskontext;

export const EFFEKT_FUNKTIONEN: Readonly<Record<string, EffektFunktion>> = Object.freeze({
  importeur_preis: (k: Tageskontext, w: number) => _skaliere_preis(k, w, "preis_importeur"),
  wochenmarkt_preis: (k: Tageskontext, w: number) => _skaliere_preis(k, w, "preis_wochenmarkt"),
  baeckerei_preis: (k: Tageskontext, w: number) => _skaliere_preis(k, w, "preis_baeckerei"),
  mosterei_preis: (k: Tageskontext, w: number) => _skaliere_preis(k, w, "preis_mosterei"),
  obstbauer_menge: (k: Tageskontext, w: number) => k.ersetzt({ obstbauer_menge: k.obstbauer_menge * w }),
  schulessen_menge: (k: Tageskontext, w: number) => _skaliere_nachfrage(k, w, "schulessen"),
  baeckerei_menge: (k: Tageskontext, w: number) => _skaliere_nachfrage(k, w, "baeckerei_bestellt"),
  importeur_gesperrt: (k: Tageskontext) => k.ersetzt({ importeur_verfuegbar: false }),
  wochenmarkt_gesperrt: (k: Tageskontext) => k.ersetzt({ wochenmarkt_verfuegbar: false }),
  // int * float ergibt in Python immer float -> Typ wechselt auf "float"
  wochenmarkt_limit: (k: Tageskontext, w: number) =>
    k.ersetzt({ wochenmarkt_limit: k.wochenmarkt_limit * w, wochenmarkt_limit_typ: "float" }),
  importeur_slider_max: (k: Tageskontext, w: number) =>
    k.ersetzt({ importeur_slider_max: k.importeur_slider_max * w }),
});

/** Python: EFFEKT_FUNKTIONEN[name] - unbekannter Name -> KeyError (erst bei Anwendung). */
export function effekt_funktion(name: string): EffektFunktion {
  if (!Object.hasOwn(EFFEKT_FUNKTIONEN, name)) {
    throw new KeyError(`'${name}'`);
  }
  return EFFEKT_FUNKTIONEN[name] as EffektFunktion;
}
