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
