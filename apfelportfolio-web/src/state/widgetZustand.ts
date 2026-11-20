/**
 * Nachbildung des Streamlit-Widget-Zustands (fuer Slider und Schalter).
 *
 * Streamlit merkt sich den Wert eines Widgets ohne key ueber die "Widget-ID",
 * die aus Typ, Beschriftung und allen Parametern (min, max, value, ...) gebildet
 * wird. Daraus folgen die Effekte, die die Spielseite nachbilden muss:
 *   1. Gleiche ID im naechsten Durchlauf (Rerun) -> der eingestellte Wert bleibt
 *      erhalten - auch ueber "Handel abschliessen" und "Neue Woche starten" hinweg.
 *   2. Andere ID (z. B. anderes Maximum) -> neues Widget mit dem Startwert.
 *   3. Wird ein Widget in einem Durchlauf nicht angezeigt, verwirft Streamlit
 *      seinen Zustand; beim naechsten Anzeigen beginnt es wieder beim Startwert.
 *
 * Verwendung: zu Beginn eines Durchlaufs beginneDurchlauf(), dann je Widget
 * wert(...) abfragen, am Ende beendeDurchlauf() (verwirft nicht angezeigte).
 */

export class WidgetZustand {
  private readonly werte = new Map<string, number | boolean>();
  private angezeigt = new Set<string>();

  static id(art: string, beschriftung: string, parameter: readonly (number | boolean | string)[]): string {
    return JSON.stringify([art, beschriftung, ...parameter]);
  }

  beginneDurchlauf(): void {
    this.angezeigt = new Set<string>();
  }

  /** Aktueller Wert des Widgets (Startwert, wenn es neu ist). */
  wert<T extends number | boolean>(id: string, startwert: T): T {
    this.angezeigt.add(id);
    const w = this.werte.get(id);
    if (w === undefined) {
      this.werte.set(id, startwert);
      return startwert;
    }
    return w as T;
  }

  setze(id: string, wert: number | boolean): void {
    this.werte.set(id, wert);
  }

  /** Verwirft den Zustand aller Widgets, die in diesem Durchlauf nicht angezeigt wurden. */
  beendeDurchlauf(): void {
    for (const id of [...this.werte.keys()]) {
      if (!this.angezeigt.has(id)) this.werte.delete(id);
    }
  }
}
