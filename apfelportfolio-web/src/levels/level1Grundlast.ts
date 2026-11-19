/**
 * Level 1 - Bedarf decken, tageweise Entscheidung (Mo-Fr).
 *
 * Quelle (Python): src/apfelportfolio/levels/level1_grundlast.py (1:1-Portierung,
 * Stand nach Phase 0: Wuerfelwerte als Parameter).
 *
 * Fachlich (aus dem Original-Docstring, Stand des Codes):
 * - Obstbauer liefert fix regelwerk.obstbauer_menge zu obstbauer_preis, Schulessen
 *   nimmt fix schulessen_menge zu schulessen_preis ab.
 * - Alle Marktpreise leiten sich aus EINEM taeglichen Wuerfelwurf W1 ab:
 *     Importeur = W1/10, Wochenmarkt = W1/10 + 0,1,
 *     Baeckerei = W1/10 + baeckerei_preis_aufschlag, Mosterei = 0,8 * Wochenmarktpreis
 * - Die Baeckerei-Menge wird gleichverteilt aus der Regelwerk-Spanne gezogen und
 *   IMMER voll geliefert.
 * - Freitags-Ausgleich: Ueberschuss -> Mosterei, Fehlmenge -> Wochenmarkt (automatisch).
 * - Portfolioergebnis pro Tag = Erloese - Einkaufskosten.
 *
 * WICHTIG: Rechenreihenfolge und Eigenheiten (u. a. doppelter Abzug der
 * Mosterei-Menge Mo-Do, fehlende Wochenpruefung des Importeur-Limits) sind
 * bewusst unveraendert - siehe MIGRATION_NOTES, Auffaelligkeiten.
 */
import { ValueError } from "../domain/fehler";
import { Regelwerk, Tagesabrechnung, Tagesmarkt, Tagesnachfrage, type Tageseinkauf } from "../domain/models";
import { pythonIntText, pythonRepr } from "../domain/pythonText";
import { formatFixed, pythonInt } from "../domain/runden";

export const WOCHENTAGE: readonly string[] = Object.freeze([
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
]);
export const LETZTER_IMPORTEUR_TAG_INDEX = 2; // 0=Montag ... 2=Mittwoch (Bestellung bis Mittwoch)
export const LETZTER_TAG_INDEX = WOCHENTAGE.length - 1; // 4=Freitag

// Im Original nicht mehr von der Logik benutzt (das Regelwerk hat sie abgeloest);
// OBSTBAUER_MENGE, SCHULESSEN_MENGE und WOCHENMARKT_MAX_PRO_TAG dienen Level 2
// als Defaults des Tageskontexts.
export const OBSTBAUER_MENGE = 100.0;
export const OBSTBAUER_PREIS = 0.35;

export const SCHULESSEN_MENGE = 80.0;
export const SCHULESSEN_PREIS = 0.4;

// Wuerfelwerte: ganzzahlig 1-6, steuern Preise (W1) bzw. Baeckerei-Menge (W2)
export const WUERFEL_MIN = 1;
export const WUERFEL_MAX = 6;
export const BAECKEREI_MENGE_FAKTOR = 10.0;

// Mengenlimits gemaess "Randbedingungen" (Excel-Tabelle)
export const WOCHENMARKT_MAX_PRO_TAG = 140.0;
export const IMPORTEUR_MAX_GESAMT_MO_MI = 200.0;

function _pruefe_einkaufslimits(tag_index: number, einkauf: Tageseinkauf, regelwerk: Regelwerk): void {
  if (einkauf.wochenmarkt_menge > regelwerk.wochenmarkt_limit_tag) {
    throw new ValueError(
      `Wochenmarkt-Menge ${pythonRepr(einkauf.wochenmarkt_menge)} ueberschreitet ` +
        `das Tageslimit von ${pythonIntText(regelwerk.wochenmarkt_limit_tag)} Stueck.`,
    );
  }
  if (einkauf.importeur_menge > 0 && tag_index > LETZTER_IMPORTEUR_TAG_INDEX) {
    throw new ValueError("Importeur kann nur Montag bis Mittwoch bestellt werden.");
  }
}

/** Python: max(a, b) - liefert a, ausser b ist echt groesser (wichtig nur fuer -0.0). */
function pyMax(a: number, b: number): number {
  return b > a ? b : a;
}

/** Level 1: tageweise Kaufentscheidungen ueber eine Woche (Mo-Fr). */
export class Level1Grundlast {
  readonly nummer = 1;
  readonly titel = "Level 1 - Bedarf decken (tageweise, Mo-Fr)";

  regelwerk: Regelwerk;
  portfoliostand: number;
  _importeur_menge_woche: number;

  constructor(regelwerk: Regelwerk | null = null) {
    this.regelwerk = regelwerk !== null ? regelwerk : new Regelwerk();
    this.portfoliostand = 0.0;
    this._importeur_menge_woche = 0.0;
  }

  importeur_verfuegbar(tag_index: number): boolean {
    return tag_index <= LETZTER_IMPORTEUR_TAG_INDEX;
  }

  /**
   * Tagesmarkt aus dem Wuerfelwert W1 (gewuerfelt per wuerfel.ts/wuerfleW1).
   * Der Baeckerei-Preis wird sofort als Override gesetzt, da sein Aufschlag
   * ebenfalls einstellbar ist - alle anderen Preise leiten sich per Getter aus W1 ab.
   */
  erzeuge_tagesmarkt(w1: number): Tagesmarkt {
    const preis_baeckerei = w1 / 10 + this.regelwerk.baeckerei_preis_aufschlag;
    return new Tagesmarkt({
      zufallspreis: w1, // Python: float(w1)
      preis_overrides: { preis_baeckerei },
    });
  }

  /** Tagesnachfrage aus der gezogenen Baeckerei-Menge (per wuerfel.ts/wuerfleBaeckereiMenge). */
  erzeuge_tagesnachfrage(baeckerei_menge: number): Tagesnachfrage {
    const baeckerei = baeckerei_menge; // Python: float(baeckerei_menge)
    return new Tagesnachfrage({
      schulessen: this.regelwerk.schulessen_menge,
      baeckerei_bestellt: baeckerei,
    });
  }

  rechne_tag_ab(
    tag: string,
    tag_index: number,
    markt: Tagesmarkt,
    nachfrage: Tagesnachfrage,
    einkauf: Tageseinkauf,
    obstbauer_menge: number | null = null,
  ): Tagesabrechnung {
    if (obstbauer_menge === null) {
      obstbauer_menge = this.regelwerk.obstbauer_menge;
    }

    _pruefe_einkaufslimits(tag_index, einkauf, this.regelwerk);

    if (this.importeur_verfuegbar(tag_index)) {
      const neue_importeur_summe = this._importeur_menge_woche + einkauf.importeur_menge;
      this._importeur_menge_woche = neue_importeur_summe;
    }

    const an_schulessen = nachfrage.schulessen;
    const an_baeckerei = nachfrage.baeckerei_bestellt;

    let zukauf = obstbauer_menge + einkauf.importeur_menge + einkauf.wochenmarkt_menge;

    // Manueller Mosterei-Verkauf: nur Mo-Do, am Freitag uebernimmt der
    // automatische Ausgleich (siehe unten) - keine doppelte Verrechnung.
    let an_mosterei = 0.0;
    if (tag_index !== LETZTER_TAG_INDEX) {
      const verfuegbarer_bestand = this.portfoliostand + zukauf - an_schulessen - an_baeckerei;
      if (einkauf.mosterei_menge > pyMax(verfuegbarer_bestand, 0.0)) {
        throw new ValueError(
          `Verkauf an Mosterei (${formatFixed(einkauf.mosterei_menge, 0)}) uebersteigt ` +
            `den verfuegbaren Bestand (${formatFixed(verfuegbarer_bestand, 0)}).`,
        );
      }
      an_mosterei = einkauf.mosterei_menge;
    }

    const lieferung = an_schulessen + an_baeckerei + an_mosterei;

    // Automatischer Ausgleich am Freitag: Ueberschuss -> Mosterei,
    // Fehlmenge -> Wochenmarkt-Zukauf. Beides zum Tagespreis.
    let zusatz_wochenmarkt_menge = 0.0;
    if (tag_index === LETZTER_TAG_INDEX) {
      const voraussichtlicher_saldo = this.portfoliostand + zukauf - lieferung;
      if (voraussichtlicher_saldo > 0) {
        an_mosterei = voraussichtlicher_saldo;
      } else if (voraussichtlicher_saldo < 0) {
        zusatz_wochenmarkt_menge = Math.abs(voraussichtlicher_saldo);
        zukauf += zusatz_wochenmarkt_menge;
      }
    }

    // Unveraendert aus dem Original: lieferung enthaelt an_mosterei bereits (Mo-Do),
    // hier wird es ein zweites Mal abgezogen (MIGRATION_NOTES, Auffaelligkeit 1).
    const saldo = zukauf - lieferung - an_mosterei;
    this.portfoliostand += saldo;

    const erloes =
      an_schulessen * this.regelwerk.schulessen_preis +
      an_baeckerei * markt.preis_baeckerei +
      an_mosterei * markt.preis_mosterei;
    const einkaufskosten =
      obstbauer_menge * this.regelwerk.obstbauer_preis +
      einkauf.importeur_menge * markt.preis_importeur +
      (einkauf.wochenmarkt_menge + zusatz_wochenmarkt_menge) * markt.preis_wochenmarkt;
    const portfolioergebnis = erloes - einkaufskosten;

    return new Tagesabrechnung({
      tag,
      markt,
      einkauf,
      nachfrage,
      an_schulessen_geliefert: an_schulessen,
      an_baeckerei_geliefert: an_baeckerei,
      an_mosterei_geliefert: an_mosterei,
      bilanzkreis_saldo: saldo,
      einkaufskosten,
      erloes,
      portfoliostand: this.portfoliostand,
      portfolioergebnis,
    });
  }
}

/** Slider-Grenzen der Handelskonsole; null = Slider ausgeblendet. */
export interface Eingabegrenzen {
  importeur_max: number | null;
  wochenmarkt_max: number;
  /** haengt von den aktuell eingestellten Importeur-/Wochenmarkt-Mengen ab */
  mosterei_max: number | null;
}

/**
 * Slider-Grenzen fuer Level 1, exakt wie in ui/pages/1_spielen.py berechnet
 * (dort direkt in main()). In die Logikschicht verschoben, damit sie gegen die
 * Referenzdaten (ui_grenzen) testbar sind - Verhalten unveraendert:
 * - Importeur nur Mo-Mi, Maximum int(regelwerk.importeur_limit) PRO TAG
 * - Wochenmarkt immer, Maximum int(regelwerk.wochenmarkt_limit_tag)
 * - Mosterei nur Mo-Do, Maximum max(int(verfuegbarer_bestand), 0)
 *   (int() schneidet Richtung 0 ab, kein Runden)
 */
export function eingabegrenzen_level1(
  level: Level1Grundlast,
  nachfrage: Tagesnachfrage,
  tag_index: number,
  importeur_menge: number,
  wochenmarkt_menge: number,
): Eingabegrenzen {
  const rw = level.regelwerk;
  const importeur_max = level.importeur_verfuegbar(tag_index) ? pythonInt(rw.importeur_limit) : null;
  const wochenmarkt_max = pythonInt(rw.wochenmarkt_limit_tag);
  let mosterei_max: number | null = null;
  if (tag_index !== WOCHENTAGE.length - 1) {
    const verfuegbarer_bestand =
      level.portfoliostand +
      rw.obstbauer_menge +
      importeur_menge +
      wochenmarkt_menge -
      nachfrage.schulessen -
      nachfrage.baeckerei_bestellt;
    mosterei_max = pyMax(pythonInt(verfuegbarer_bestand), 0);
  }
  return { importeur_max, wochenmarkt_max, mosterei_max };
}
