/**
 * Nachbildung der Python-Ausnahmen, die der Spielcode wirft.
 *
 * Quelle (Python): ValueError in levels/*.py und domain/models.py,
 * OverflowError aus round(), TypeError aus random.randint.
 * Der Name bleibt wie in Python, damit Aufrufer gezielt unterscheiden koennen.
 */

/**
 * message = Originaltext des Python-Codes (bleibt fuer die Referenztests erhalten),
 * hinweis = freundlicher Text fuer die Anzeige (ohne Python-Begriffe und -Zahlenformate).
 */
export class ValueError extends Error {
  override readonly name = "ValueError";
  readonly hinweis: string;

  constructor(message: string, hinweis?: string) {
    super(message);
    this.hinweis = hinweis ?? message;
  }
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
