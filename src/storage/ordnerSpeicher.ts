/**
 * Schreibt Spielstaende direkt in einen Ordner (File System Access API).
 *
 * Getesteter Weg fuer Chrome/Edge, auch wenn die HTML-Datei per Doppelklick
 * (file://) vom Netzlaufwerk geoeffnet wird. Der Spielleiter waehlt einmal den
 * gemeinsamen Ordner; darin entstehen:
 *   spielstaende/<eine Datei je Spielwoche>.json
 *   config.json   (Regelwerk, optional)
 *
 * createWritable() schreibt in eine Hilfsdatei und ersetzt erst beim close()
 * - ein Abbruch hinterlaesst keine halbe Datei.
 */
import { als_text, dateiname, type Spielstand } from "./schema";
import { KONFIG_DATEI, lese_spielstaende, SPIELSTAND_ORDNER, type Speicher } from "./speicher";

/** Minimaler Ausschnitt der File System Access API (erlaubt Test-Attrappen). */
export interface SchreibStrom {
  write(daten: string): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
}

export interface DateiHandle {
  readonly kind: "file";
  readonly name: string;
  getFile(): Promise<{ text(): Promise<string> }>;
  createWritable(): Promise<SchreibStrom>;
}

export type Berechtigung = "granted" | "denied" | "prompt";

export interface OrdnerHandle {
  readonly kind: "directory";
  readonly name: string;
  getDirectoryHandle(name: string, optionen?: { create?: boolean }): Promise<OrdnerHandle>;
  getFileHandle(name: string, optionen?: { create?: boolean }): Promise<DateiHandle>;
  values(): AsyncIterable<DateiHandle | OrdnerHandle>;
  queryPermission?(optionen: { mode: "readwrite" }): Promise<Berechtigung>;
  requestPermission?(optionen: { mode: "readwrite" }): Promise<Berechtigung>;
}

function istNichtGefunden(e: unknown): boolean {
  return e instanceof Error && (e.name === "NotFoundError" || e.name === "TypeMismatchError");
}

async function schreibeDatei(ordner: OrdnerHandle, name: string, text: string): Promise<void> {
  const datei = await ordner.getFileHandle(name, { create: true });
  const strom = await datei.createWritable();
  try {
    await strom.write(text);
    await strom.close();
  } catch (e) {
    await strom.abort?.();
    throw e;
  }
}

/** Ist die File System Access API (Ordner waehlen) im Browser vorhanden? */
export function ordner_zugriff_verfuegbar(): boolean {
  return typeof (globalThis as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
}

/** Ordner-Auswahldialog (nur aus einer Benutzeraktion heraus aufrufen). */
export async function ordner_waehlen(): Promise<OrdnerHandle> {
  const waehle = (globalThis as unknown as {
    showDirectoryPicker: (o: { id?: string; mode: "readwrite" }) => Promise<OrdnerHandle>;
  }).showDirectoryPicker;
  return waehle({ id: "apfelportfolio", mode: "readwrite" });
}

export function ordnerSpeicher(wurzel: OrdnerHandle): Speicher {
  const spielstandOrdner = () => wurzel.getDirectoryHandle(SPIELSTAND_ORDNER, { create: true });

  return {
    art: "ordner",
    bezeichnung: wurzel.name,

    async lade_alle() {
      const ordner = await spielstandOrdner();
      const dateien: { name: string; text: string }[] = [];
      const nichtLesbar: { datei: string; grund: string }[] = [];
      for await (const eintrag of ordner.values()) {
        if (eintrag.kind !== "file" || !eintrag.name.toLowerCase().endsWith(".json")) continue;
        try {
          dateien.push({ name: eintrag.name, text: await (await eintrag.getFile()).text() });
        } catch (e) {
          nichtLesbar.push({ datei: eintrag.name, grund: `nicht lesbar (${(e as Error).message})` });
        }
      }
      dateien.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      const ergebnis = lese_spielstaende(dateien);
      return { spielstaende: ergebnis.spielstaende, fehlerhaft: [...nichtLesbar, ...ergebnis.fehlerhaft] };
    },

    async speichere(stand: Spielstand) {
      await schreibeDatei(await spielstandOrdner(), dateiname(stand), als_text(stand));
    },

    async lade_konfiguration() {
      try {
        const datei = await wurzel.getFileHandle(KONFIG_DATEI);
        return await (await datei.getFile()).text();
      } catch (e) {
        if (istNichtGefunden(e)) return null;
        throw e;
      }
    },

    async speichere_konfiguration(text: string) {
      await schreibeDatei(wurzel, KONFIG_DATEI, text);
    },
  };
}
