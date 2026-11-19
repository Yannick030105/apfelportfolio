/**
 * Gemeinsame Speicher-Schnittstelle.
 *
 * Quelle (Python): data/repository.py (CSV-Log) und data/specs_repository.py
 * (config.json). Ersetzt beide: Spielstaende liegen als einzelne JSON-Dateien
 * im Unterordner "spielstaende", die Einstellungen als "config.json" im
 * gewaehlten Ordner.
 *
 * Umsetzungen:
 *   - ordnerSpeicher.ts: direkt in einen Ordner (File System Access API, Chrome/Edge)
 *   - dateiSpeicher.ts:  Rueckfallebene, Laden/Speichern per Dateidialog
 *   - arbeitsspeicher(): nur im Speicher (Tests, Vorschau)
 */
import { als_text, dateiname, spielstand_aus_text, type Spielstand } from "./schema";

export const SPIELSTAND_ORDNER = "spielstaende";
export const KONFIG_DATEI = "config.json";

export interface FehlerhafteDatei {
  datei: string;
  grund: string;
}

export interface LadeErgebnis {
  spielstaende: Spielstand[];
  /** Dateien, die nicht gelesen werden konnten - werden angezeigt, nicht still verworfen */
  fehlerhaft: FehlerhafteDatei[];
}

export interface Speicher {
  readonly art: "ordner" | "datei" | "arbeitsspeicher";
  /** fuer die Anzeige, z. B. Ordnername */
  readonly bezeichnung: string;
  lade_alle(): Promise<LadeErgebnis>;
  /** Speichert (bzw. ersetzt) die Datei dieses Spielstands. */
  speichere(stand: Spielstand): Promise<void>;
  /** Rohtext von config.json oder null, wenn keine vorhanden ist. */
  lade_konfiguration(): Promise<string | null>;
  speichere_konfiguration(text: string): Promise<void>;
}

/** Liest Spielstand-Texte und sammelt Fehler je Datei (eine kaputte Datei blockiert nicht alle). */
export function lese_spielstaende(dateien: readonly { name: string; text: string }[]): LadeErgebnis {
  const spielstaende: Spielstand[] = [];
  const fehlerhaft: FehlerhafteDatei[] = [];
  const gesehen = new Map<string, string>();
  for (const { name, text } of dateien) {
    try {
      const stand = spielstand_aus_text(text, name);
      const frueher = gesehen.get(stand.id);
      if (frueher !== undefined) {
        fehlerhaft.push({ datei: name, grund: `gleiche Spielstand-Kennung wie ${frueher} - ignoriert.` });
        continue;
      }
      gesehen.set(stand.id, name);
      spielstaende.push(stand);
    } catch (e) {
      fehlerhaft.push({ datei: name, grund: (e as Error).message });
    }
  }
  return { spielstaende, fehlerhaft };
}

/** Speicher nur im Arbeitsspeicher (Tests; Grundlage der Rueckfallebene). */
export function arbeitsspeicher(bezeichnung = "Arbeitsspeicher"): Speicher & { dateien: Map<string, string> } {
  const dateien = new Map<string, string>();
  let konfiguration: string | null = null;
  return {
    art: "arbeitsspeicher",
    bezeichnung,
    dateien,
    async lade_alle() {
      return lese_spielstaende([...dateien].map(([name, text]) => ({ name, text })));
    },
    async speichere(stand) {
      dateien.set(dateiname(stand), als_text(stand));
    },
    async lade_konfiguration() {
      return konfiguration;
    },
    async speichere_konfiguration(text) {
      konfiguration = text;
    },
  };
}
