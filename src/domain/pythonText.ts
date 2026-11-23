/**
 * Zahlen als Text wie in Python - noetig, weil die Fehlermeldungen des
 * Spielcodes Zahlen per f-String einsetzen (z. B. "Wochenmarkt-Menge 301.0 ...").
 *
 * Quelle (Python): repr(float) bzw. str(float) (identisch seit Python 3.2) und str(int).
 */

/** Pythons repr(x) fuer einen float: kuerzeste eindeutige Ziffernfolge, Python-Notation. */
export function pythonRepr(x: number): string {
  if (Number.isNaN(x)) return "nan";
  if (!Number.isFinite(x)) return x > 0 ? "inf" : "-inf";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";

  const vorzeichen = x < 0 ? "-" : "";
  // toExponential() ohne Argument liefert die kuerzeste eindeutige Ziffernfolge.
  const [mantisse = "", exponentText = "0"] = Math.abs(x).toExponential().split("e");
  const ziffern = mantisse.replace(".", "");
  const dezimalpunkt = Number.parseInt(exponentText, 10) + 1; // Wert = 0.ziffern * 10^dezimalpunkt

  if (dezimalpunkt <= -4 || dezimalpunkt > 16) {
    const exponent = dezimalpunkt - 1;
    const rest = ziffern.length > 1 ? `.${ziffern.slice(1)}` : "";
    const expVorzeichen = exponent < 0 ? "-" : "+";
    return `${vorzeichen}${ziffern[0]}${rest}e${expVorzeichen}${String(Math.abs(exponent)).padStart(2, "0")}`;
  }
  if (dezimalpunkt <= 0) {
    return `${vorzeichen}0.${"0".repeat(-dezimalpunkt)}${ziffern}`;
  }
  if (dezimalpunkt >= ziffern.length) {
    return `${vorzeichen}${ziffern}${"0".repeat(dezimalpunkt - ziffern.length)}.0`;
  }
  return `${vorzeichen}${ziffern.slice(0, dezimalpunkt)}.${ziffern.slice(dezimalpunkt)}`;
}

/**
 * Text fuer einen Wert, der in Python als int typisiert ist (z. B. Regelwerk-
 * Limits aus config.json). Ganzzahlige Werte erscheinen ohne ".0" wie str(int),
 * alle anderen wie repr(float).
 *
 * Einschraenkung: Ein in config.json als "300.0" geschriebener Wert waere in
 * Python ein float ("300.0"), hier erscheint er als "300" - JSON.parse
 * unterscheidet das nicht (siehe MIGRATION_NOTES).
 */
export function pythonIntText(x: number): string {
  if (Number.isInteger(x)) return BigInt(x).toString();
  return pythonRepr(x);
}
