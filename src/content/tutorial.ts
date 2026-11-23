/**
 * Inhalt des Tutorials.
 *
 * Quelle (Python): SCHRITTE in ui/pages/4_tutorial.py, woertlich exportiert nach
 * src/content/texte/tutorial.md (tools/texte_exportieren.py). Format je Schritt:
 *   "## <icon> | <titel>", Leerzeile, Erklaerung, Leerzeile, "> <beispiel>".
 */
import tutorialText from "./texte/tutorial.md?raw";

export interface TutorialSchritt {
  readonly icon: string;
  readonly titel: string;
  readonly erklaerung: string;
  readonly beispiel: string;
}

export function lies_tutorial(text: string): TutorialSchritt[] {
  const bloecke = text.replace(/\r\n/g, "\n").split(/^## /m).slice(1);
  return bloecke.map((block, i) => {
    const zeilen = block.split("\n");
    const kopf = zeilen[0] ?? "";
    const trenner = kopf.indexOf(" | ");
    const rumpf = zeilen.slice(1).filter((z) => z.trim() !== "");
    const beispiel = rumpf.find((z) => z.startsWith("> "));
    const erklaerung = rumpf.filter((z) => !z.startsWith("> "));
    if (trenner < 0 || beispiel === undefined || erklaerung.length !== 1) {
      throw new Error(`tutorial.md: Schritt ${i + 1} hat nicht das erwartete Format.`);
    }
    return Object.freeze({
      icon: kopf.slice(0, trenner),
      titel: kopf.slice(trenner + 3),
      erklaerung: erklaerung[0] as string,
      beispiel: beispiel.slice(2),
    });
  });
}

export const SCHRITTE: readonly TutorialSchritt[] = Object.freeze(lies_tutorial(tutorialText));
