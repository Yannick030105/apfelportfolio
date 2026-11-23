/**
 * Python-String-Verhalten, soweit es fuer Spielernamen gebraucht wird
 * (Quelle: data/players.py, data/repository.py):
 *
 *   str.strip()   -> pythonStrip   (Python-Leerraum ist nicht JS-trim(): z. B. \x1c-\x1f
 *                                   und \x85 gehoeren dazu, U+FEFF nicht)
 *   str.lower()   -> pythonLower   (= toLowerCase: beide nutzen die volle Unicode-
 *                                   Abbildung inkl. Schluss-Sigma, "ΣΟΣ" -> "σος")
 *   len(str)      -> pythonLen     (Codepoints, nicht UTF-16-Einheiten)
 *   sorted(strs)  -> pythonSortiert (Vergleich nach Codepoints, nicht UTF-16-Einheiten)
 *
 * Gegen Soll-Werte aus Python getestet (tests/daten/python_builtins.json).
 */

/** Zeichen mit str.isspace() == True (Python 3.13, vollstaendige Liste). */
const PYTHON_LEERRAUM = new Set<number>([
  9, 10, 11, 12, 13, 28, 29, 30, 31, 32, 133, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201,
  8202, 8232, 8233, 8239, 8287, 12288,
]);

export function istPythonLeerraum(zeichen: string): boolean {
  const cp = zeichen.codePointAt(0);
  return cp !== undefined && PYTHON_LEERRAUM.has(cp);
}

export function pythonStrip(text: string): string {
  const zeichen = Array.from(text);
  let anfang = 0;
  let ende = zeichen.length;
  while (anfang < ende && istPythonLeerraum(zeichen[anfang] as string)) anfang += 1;
  while (ende > anfang && istPythonLeerraum(zeichen[ende - 1] as string)) ende -= 1;
  return zeichen.slice(anfang, ende).join("");
}

export function pythonLower(text: string): string {
  // Python 3 und JS wenden beide die Unicode-Kleinschreibung samt Schluss-Sigma-Regel an
  // (gegen alle Zeichen und Beispiele aus Python getestet).
  return text.toLowerCase();
}

export function pythonLen(text: string): number {
  return Array.from(text).length;
}

/** Vergleich wie Python (lexikografisch nach Codepoints). */
export function pythonStringVergleich(a: string, b: string): number {
  const za = Array.from(a);
  const zb = Array.from(b);
  const n = Math.min(za.length, zb.length);
  for (let i = 0; i < n; i++) {
    const ca = (za[i] as string).codePointAt(0) as number;
    const cb = (zb[i] as string).codePointAt(0) as number;
    if (ca !== cb) return ca < cb ? -1 : 1;
  }
  return za.length === zb.length ? 0 : za.length < zb.length ? -1 : 1;
}

export function pythonSortiert(texte: readonly string[]): string[] {
  return [...texte].sort(pythonStringVergleich);
}
