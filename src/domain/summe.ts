/**
 * Exakter Nachbau von Pythons sum() fuer Listen von Gleitkommazahlen.
 *
 * Quelle (Python): Builtin sum() ab Python 3.12 (Objects/bltinmodule.c).
 * Seit 3.12 summiert CPython floats kompensiert (Neumaier-Verfahren); eine
 * einfache Schleife ergibt bei rund 30 % der Referenzwochen ein um wenige
 * Einheiten der letzten Stelle abweichendes Wochenergebnis.
 *
 * Ablauf wie in CPython: Startwert ist die Ganzzahl 0; das erste Element
 * ergibt 0 + x0, ab dann laeuft die kompensierte Summation; die Korrektur c
 * wird am Ende nur addiert, wenn sie ungleich 0 und endlich ist.
 * Leere Liste -> 0.
 */
export function pythonSumme(werte: readonly number[]): number {
  if (werte.length === 0) return 0;
  let summe = 0 + (werte[0] as number);
  let korrektur = 0.0;
  for (let i = 1; i < werte.length; i++) {
    const x = werte[i] as number;
    const t = summe + x;
    if (Math.abs(summe) >= Math.abs(x)) {
      korrektur += summe - t + x;
    } else {
      korrektur += x - t + summe;
    }
    summe = t;
  }
  if (korrektur !== 0 && Number.isFinite(korrektur)) {
    summe += korrektur;
  }
  return summe;
}

/** numpy: PW_BLOCKSIZE in numpy/_core/src/umath/loops_utils.h.src */
const PW_BLOCKSIZE = 128;

function paarweise(werte: readonly number[], start: number, n: number): number {
  if (n < 8) {
    let res = 0.0;
    for (let i = 0; i < n; i++) res += werte[start + i] as number;
    return res;
  }
  if (n <= PW_BLOCKSIZE) {
    const r = werte.slice(start, start + 8) as number[];
    let i = 8;
    for (; i < n - (n % 8); i += 8) {
      for (let j = 0; j < 8; j++) {
        r[j] = (r[j] as number) + (werte[start + i + j] as number);
      }
    }
    const [r0, r1, r2, r3, r4, r5, r6, r7] = r as [number, number, number, number, number, number, number, number];
    let res = r0 + r1 + (r2 + r3) + (r4 + r5 + (r6 + r7));
    for (; i < n; i++) res += werte[start + i] as number;
    return res;
  }
  // halbieren, aber nur an Vielfachen von 8 teilen
  let n2 = Math.floor(n / 2);
  n2 -= n2 % 8;
  return paarweise(werte, start, n2) + paarweise(werte, start + n2, n - n2);
}

/**
 * Exakter Nachbau von numpy.sum fuer ein zusammenhaengendes float64-Array
 * (np.add.reduce -> pairwise summation), wie es pandas' mean()/std() intern nutzt.
 *
 * Quelle: numpy pairwise_sum (loops_utils.h.src); Startwert 0 (Identitaet von
 * add), dann paarweise ueber alle Elemente. Empirisch gegen np.sum und
 * pandas mean()/std() geprueft (siehe MIGRATION_NOTES Phase 4).
 * Fuer float64-Arrays ohne Puffern, geprueft bis 50.000 Werte.
 */
export function numpySumme(werte: readonly number[]): number {
  return 0.0 + paarweise(werte, 0, werte.length);
}
