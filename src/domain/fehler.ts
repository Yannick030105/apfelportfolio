/**
 * Nachbildung der Python-Ausnahmen, die der Spielcode wirft.
 *
 * Quelle (Python): ValueError in levels/*.py und domain/models.py,
 * OverflowError aus round(), TypeError aus random.randint.
 * Der Name bleibt wie in Python, damit Aufrufer gezielt unterscheiden koennen.
 */

export class ValueError extends Error {
  override readonly name = "ValueError";
}

export class OverflowError extends Error {
  override readonly name = "OverflowError";
}

export class PythonTypeError extends Error {
  override readonly name = "TypeError";
}

/** Python KeyError (z. B. unbekannter Effekt-Name in EFFEKT_FUNKTIONEN). */
export class KeyError extends Error {
  override readonly name = "KeyError";
}

/** Python IndexError (z. B. Ereignis-Index ausserhalb der Liste). */
export class IndexError extends Error {
  override readonly name = "IndexError";
}
