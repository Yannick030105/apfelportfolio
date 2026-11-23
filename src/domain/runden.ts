/**
 * Exakter Nachbau von Pythons round() und der Festkomma-Formatierung f"{x:.Nf}".
 *
 * Quelle (Python): Builtin round() (float_round / double_round mit
 * _Py_dg_dtoa, Modus 3) und format(x, ".Nf").
 *
 * Beide runden den EXAKTEN Dezimalwert der Gleitkommazahl "half to even"
 * (Banker's Rounding). Beispiele: round(2.5) = 2, round(0.125, 2) = 0.12,
 * round(2.675, 2) = 2.67 (weil 2.675 als double knapp darunter liegt).
 * Math.round und Number.prototype.toFixed verhalten sich anders und duerfen
 * fuer Spielwerte nicht verwendet werden.
 *
 * Umsetzung: Die Zahl wird exakt als m * 2^e (BigInt) zerlegt, mit 10^n
 * skaliert und ganzzahlig half-to-even gerundet. Das Ergebnis wird als
 * Dezimaltext gebaut und - wie in CPython per strtod - korrekt gerundet
 * zurueck in eine Zahl gewandelt.
 */
import { OverflowError, ValueError } from "./fehler";

/** Grenzen wie in CPython (floatobject.c, NDIGITS_MAX / NDIGITS_MIN). */
const NDIGITS_MAX = 323;
const NDIGITS_MIN = -308;

interface Zerlegung {
  /** |x| = m * 2^e */
  m: bigint;
  e: number;
}

function zerlege(betrag: number): Zerlegung {
  const ansicht = new DataView(new ArrayBuffer(8));
  ansicht.setFloat64(0, betrag);
  const hoch = ansicht.getUint32(0);
  const tief = ansicht.getUint32(4);
  const exponentBits = (hoch >>> 20) & 0x7ff;
  let m = (BigInt(hoch & 0xfffff) << 32n) | BigInt(tief);
  if (exponentBits === 0) {
    return { m, e: -1074 }; // subnormal
  }
  m |= 1n << 52n;
  return { m, e: exponentBits - 1075 };
}

/** round_half_even(|x| * 10^n) als exakte Ganzzahl. x muss endlich sein. */
function skaliertGerundet(x: number, n: number): bigint {
  const { m, e } = zerlege(Math.abs(x));
  let zaehler = m;
  let nenner = 1n;
  if (e >= 0) zaehler <<= BigInt(e);
  else nenner <<= BigInt(-e);
  if (n >= 0) zaehler *= 10n ** BigInt(n);
  else nenner *= 10n ** BigInt(-n);
  let q = zaehler / nenner;
  const rest2 = (zaehler % nenner) * 2n;
  if (rest2 > nenner || (rest2 === nenner && (q & 1n) === 1n)) q += 1n;
  return q;
}

function istNegativ(x: number): boolean {
  return x < 0 || Object.is(x, -0);
}

/** Ganzzahl q mit n Nachkommastellen als Dezimaltext (ohne Vorzeichen). */
function alsDezimaltext(q: bigint, n: number): string {
  if (n <= 0) {
    return q.toString() + "0".repeat(-n);
  }
  const ziffern = q.toString().padStart(n + 1, "0");
  return `${ziffern.slice(0, ziffern.length - n)}.${ziffern.slice(ziffern.length - n)}`;
}

/**
 * Pythons round(x) bzw. round(x, ndigits) fuer Gleitkommazahlen.
 *
 * - Ohne ndigits: Ergebnis ist in Python ein int (ohne Vorzeichen-Null).
 * - Mit ndigits: Ergebnis ist ein float (Vorzeichen-Null bleibt erhalten).
 */
export function pythonRound(x: number, ndigits?: number | null): number {
  if (ndigits === undefined || ndigits === null) {
    if (Number.isNaN(x)) throw new ValueError("cannot convert float NaN to integer");
    if (!Number.isFinite(x)) throw new OverflowError("cannot convert float infinity to integer");
    const q = Number(skaliertGerundet(x, 0));
    return x < 0 && q !== 0 ? -q : q;
  }
  if (!Number.isInteger(ndigits)) {
    throw new TypeError("ndigits muss eine Ganzzahl sein");
  }
  if (!Number.isFinite(x) || x === 0) return x;
  if (ndigits > NDIGITS_MAX) return x;
  if (ndigits < NDIGITS_MIN) return 0.0 * x;
  const text = alsDezimaltext(skaliertGerundet(x, ndigits), ndigits);
  const ergebnis = Number(istNegativ(x) ? `-${text}` : text);
  if (!Number.isFinite(ergebnis)) {
    throw new OverflowError("rounded value too large to represent");
  }
  return ergebnis;
}

/** Pythons f"{x:.{stellen}f}" (z. B. stellen=0 fuer ":.0f", 2 fuer ":.2f"). */
export function formatFixed(x: number, stellen: number): string {
  if (!Number.isInteger(stellen) || stellen < 0) {
    throw new TypeError("stellen muss eine nicht-negative Ganzzahl sein");
  }
  if (Number.isNaN(x)) return "nan";
  if (!Number.isFinite(x)) return x > 0 ? "inf" : "-inf";
  const text = alsDezimaltext(skaliertGerundet(x, stellen), stellen);
  return istNegativ(x) ? `-${text}` : text;
}

/**
 * Pythons int(x) fuer einen float: schneidet Richtung 0 ab (kein Runden!).
 * Anders als Math.trunc entsteht nie eine negative Null (int(-0.5) == 0).
 */
export function pythonInt(x: number): number {
  if (Number.isNaN(x)) throw new ValueError("cannot convert float NaN to integer");
  if (!Number.isFinite(x)) throw new OverflowError("cannot convert float infinity to integer");
  return Math.trunc(x) + 0;
}
