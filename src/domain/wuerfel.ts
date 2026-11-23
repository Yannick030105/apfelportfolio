/**
 * Wuerfel als austauschbare Zufallsquelle - der EINZIGE Ort, an dem Zufall entsteht.
 *
 * Quelle (Python): random.randint / random.choice in levels/level1_grundlast.py
 * und levels/level2_ereignisse.py. Die Logikfunktionen bekommen die gewuerfelten
 * Werte als Parameter (Phase 0); gewuerfelt wird beim Aufrufer ueber diese Datei.
 *
 * Die Verteilung entspricht Python (gleichverteilt, Grenzen inklusive); die
 * konkrete Zufallsfolge ist naturgemaess eine andere als die von Pythons
 * Mersenne-Twister - das spielt fuer das Verhalten keine Rolle.
 */
import { PythonTypeError, ValueError } from "./fehler";
import type { RegelwerkFelder } from "./models";
import { pythonInt } from "./runden";

export interface Wuerfelquelle {
  /** Wie Python random.randint(a, b): ganze Zahl a <= n <= b. */
  randint(a: number, b: number): number;
}

function pruefeGrenzen(a: number, b: number): void {
  // Python 3.12+: randint mit nicht-ganzzahligen Argumenten -> TypeError
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new PythonTypeError(`randint: Grenzen muessen ganzzahlig sein (${a}, ${b})`);
  }
  if (a > b) {
    throw new ValueError(`empty range in randrange(${a}, ${b + 1})`);
  }
}

/** Echte Zufallsquelle fuer das Spiel. */
export const zufallsWuerfel: Wuerfelquelle = {
  randint(a: number, b: number): number {
    pruefeGrenzen(a, b);
    return a + Math.floor(Math.random() * (b - a + 1));
  },
};

/** Vorgegebene Wuerfelfolge (fuer Tests). Wirft, wenn die Folge erschoepft ist oder ein Wert nicht passt. */
export function festerWuerfel(werte: readonly number[]): Wuerfelquelle {
  let position = 0;
  return {
    randint(a: number, b: number): number {
      pruefeGrenzen(a, b);
      const wert = werte[position];
      if (wert === undefined) {
        throw new Error(`festerWuerfel: keine Werte mehr (Position ${position})`);
      }
      if (wert < a || wert > b) {
        throw new Error(`festerWuerfel: Wert ${wert} ausserhalb von [${a}, ${b}]`);
      }
      position += 1;
      return wert;
    },
  };
}

/** W1 wie Level1Grundlast.erzeuge_tagesmarkt: randint(baeckerei_preis_min, baeckerei_preis_max). */
export function wuerfleW1(regelwerk: RegelwerkFelder, quelle: Wuerfelquelle = zufallsWuerfel): number {
  return quelle.randint(regelwerk.baeckerei_preis_min, regelwerk.baeckerei_preis_max);
}

/**
 * Baeckerei-Menge wie Level1Grundlast.erzeuge_tagesnachfrage:
 * randint(int(baeckerei_menge_min), int(baeckerei_menge_max)).
 */
export function wuerfleBaeckereiMenge(
  regelwerk: RegelwerkFelder,
  quelle: Wuerfelquelle = zufallsWuerfel,
): number {
  return quelle.randint(pythonInt(regelwerk.baeckerei_menge_min), pythonInt(regelwerk.baeckerei_menge_max));
}

/**
 * Index fuer Python random.choice(folge) (gleichverteilt). Wird in Level 2 fuer
 * die Ereignisauswahl genutzt.
 */
export function waehleIndex(anzahl: number, quelle: Wuerfelquelle = zufallsWuerfel): number {
  if (anzahl <= 0) {
    throw new Error("Cannot choose from an empty sequence");
  }
  return quelle.randint(0, anzahl - 1);
}
