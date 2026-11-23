/**
 * Inhalt des Wikis.
 *
 * Quelle (Python): KAPITEL und REIHENFOLGE in ui/pages/5_wiki.py, woertlich
 * exportiert nach src/content/texte/wiki.md (tools/texte_exportieren.py).
 * Format: "# schluessel | icon | titel", Absatz = Intro; je Begriff "## name",
 * Absatz = Definition, "Obst: ...", "Energie: ...".
 */
import wikiText from "./texte/wiki.md?raw";

export interface Begriff {
  readonly name: string;
  readonly definition: string;
  readonly obst: string;
  readonly energie: string;
}

export interface Kapitel {
  readonly icon: string;
  readonly titel: string;
  readonly intro: string;
  readonly begriffe: readonly Begriff[];
}

export interface Wiki {
  readonly reihenfolge: readonly string[];
  readonly kapitel: Readonly<Record<string, Kapitel>>;
}

function absaetze(text: string): string[] {
  return text
    .split("\n")
    .map((z) => z.trimEnd())
    .filter((z) => z !== "");
}

export function lies_wiki(text: string): Wiki {
  const reihenfolge: string[] = [];
  const kapitel: Record<string, Kapitel> = {};
  const bloecke = text.replace(/\r\n/g, "\n").split(/^# /m).slice(1);
  for (const block of bloecke) {
    const [kopfUndIntro = "", ...begriffBloecke] = block.split(/^## /m);
    const [kopf = "", ...introZeilen] = absaetze(kopfUndIntro);
    const teile = kopf.split(" | ");
    if (teile.length !== 3 || introZeilen.length !== 1) {
      throw new Error(`wiki.md: Kapitelkopf "${kopf}" hat nicht das erwartete Format.`);
    }
    const [schluessel, icon, titel] = teile as [string, string, string];
    const begriffe = begriffBloecke.map((b): Begriff => {
      const [name = "", definition, obst, energie, ...rest] = absaetze(b);
      if (definition === undefined || !obst?.startsWith("Obst: ") || !energie?.startsWith("Energie: ") || rest.length > 0) {
        throw new Error(`wiki.md: Begriff "${name}" in Kapitel "${schluessel}" hat nicht das erwartete Format.`);
      }
      return Object.freeze({ name, definition, obst: obst.slice(6), energie: energie.slice(9) });
    });
    reihenfolge.push(schluessel);
    kapitel[schluessel] = Object.freeze({ icon, titel, intro: introZeilen[0] as string, begriffe: Object.freeze(begriffe) });
  }
  return Object.freeze({ reihenfolge: Object.freeze(reihenfolge), kapitel: Object.freeze(kapitel) });
}

export const WIKI: Wiki = lies_wiki(wikiText);
