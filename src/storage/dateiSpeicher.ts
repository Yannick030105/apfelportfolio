/**
 * Rueckfallebene fuer Browser ohne Ordnerzugriff (z. B. Firefox, Safari):
 * Laden und Speichern per Dateidialog.
 *
 * - Laden: Der Spieler waehlt eine oder mehrere Dateien (einzelne Spielstaende,
 *   eine Sammeldatei dieser App oder config.json). Sie werden im Arbeitsspeicher
 *   zusammengefuehrt.
 * - Speichern: speichere() aktualisiert den Arbeitsspeicher und meldet ueber
 *   bei_aenderung(), dass ungesicherte Aenderungen vorliegen. herunterladen()
 *   erzeugt EINE Sammeldatei mit allen Spielstaenden (+ config.json), die der
 *   Browser als Download anbietet. Wann das passiert (nach jedem Spieltag
 *   automatisch oder per Knopf), entscheidet die Oberflaeche (Phase 6).
 */
import { APP_VERSION } from "../version";
import { als_text, dateiname, pruefe_spielstand, type Spielstand } from "./schema";
import { KONFIG_DATEI, lese_spielstaende, type FehlerhafteDatei, type LadeErgebnis, type Speicher } from "./speicher";

export const SAMMLUNG_FORMAT = "apfelportfolio-sammlung";
export const SAMMLUNG_FORMAT_VERSION = 1;

export interface Sammlung {
  format: typeof SAMMLUNG_FORMAT;
  formatVersion: number;
  appVersion: string;
  erstellt_am: string;
  spielstaende: Spielstand[];
  konfiguration: string | null;
}

/** Eine vom Spieler gewaehlte Datei (File im Browser, Attrappe in Tests). */
export interface GewaehlteDatei {
  readonly name: string;
  text(): Promise<string>;
}

/** Loest im Browser einen Download aus (in Tests ersetzbar). */
export type Download = (dateiname: string, inhalt: string) => void;

export function browser_download(dateiname: string, inhalt: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = dateiname;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface DateiSpeicher extends Speicher {
  readonly art: "datei";
  /** gibt es Aenderungen, die noch nicht heruntergeladen wurden? */
  readonly ungesichert: boolean;
  dateien_einlesen(dateien: readonly GewaehlteDatei[]): Promise<FehlerhafteDatei[]>;
  herunterladen(jetzt?: Date): string;
}

export function dateiSpeicher(
  optionen: { download?: Download; bei_aenderung?: (ungesichert: boolean) => void } = {},
): DateiSpeicher {
  const download = optionen.download ?? browser_download;
  const staende = new Map<string, Spielstand>(); // nach id
  let konfiguration: string | null = null;
  let ungesichert = false;

  const markiere = (wert: boolean) => {
    ungesichert = wert;
    optionen.bei_aenderung?.(wert);
  };

  const uebernimm = (stand: Spielstand) => {
    const vorhanden = staende.get(stand.id);
    // Bei gleicher Woche den weiter fortgeschrittenen Stand behalten.
    if (vorhanden === undefined || fortschritt(stand) >= fortschritt(vorhanden)) {
      staende.set(stand.id, stand);
    }
  };

  return {
    art: "datei",
    bezeichnung: "Dateien (Laden/Speichern per Dialog)",
    get ungesichert() {
      return ungesichert;
    },

    async lade_alle(): Promise<LadeErgebnis> {
      return { spielstaende: [...staende.values()], fehlerhaft: [] };
    },

    async speichere(stand: Spielstand) {
      staende.set(stand.id, stand);
      markiere(true);
    },

    async lade_konfiguration() {
      return konfiguration;
    },

    async speichere_konfiguration(text: string) {
      konfiguration = text;
      markiere(true);
    },

    async dateien_einlesen(dateien) {
      const fehlerhaft: FehlerhafteDatei[] = [];
      for (const datei of dateien) {
        let text: string;
        try {
          text = await datei.text();
        } catch (e) {
          fehlerhaft.push({ datei: datei.name, grund: `nicht lesbar (${(e as Error).message})` });
          continue;
        }
        if (datei.name.toLowerCase() === KONFIG_DATEI) {
          konfiguration = text;
          continue;
        }
        let daten: unknown;
        try {
          daten = JSON.parse(text);
        } catch (e) {
          fehlerhaft.push({ datei: datei.name, grund: `kein gültiges JSON (${(e as Error).message}).` });
          continue;
        }
        if (typeof daten === "object" && daten !== null && (daten as { format?: unknown }).format === SAMMLUNG_FORMAT) {
          try {
            const sammlung = pruefeSammlung(daten, datei.name);
            sammlung.spielstaende.forEach(uebernimm);
            if (sammlung.konfiguration !== null) konfiguration = sammlung.konfiguration;
            fehlerhaft.push(...sammlung.fehlerhaft);
          } catch (e) {
            fehlerhaft.push({ datei: datei.name, grund: (e as Error).message });
          }
          continue;
        }
        const ergebnis = lese_spielstaende([{ name: datei.name, text }]);
        ergebnis.spielstaende.forEach(uebernimm);
        fehlerhaft.push(...ergebnis.fehlerhaft);
      }
      return fehlerhaft;
    },

    herunterladen(jetzt = new Date()) {
      const sammlung: Sammlung = {
        format: SAMMLUNG_FORMAT,
        formatVersion: SAMMLUNG_FORMAT_VERSION,
        appVersion: APP_VERSION,
        erstellt_am: jetzt.toISOString(),
        spielstaende: [...staende.values()],
        konfiguration,
      };
      const name = `apfelportfolio_spielstaende_${jetzt.toISOString().slice(0, 10)}.json`;
      download(name, `${JSON.stringify(sammlung, null, 2)}\n`);
      markiere(false);
      return name;
    },
  };
}

function fortschritt(s: Spielstand): number {
  return (s.status === "abgeschlossen" ? 10 : 0) + s.tage.length;
}

function pruefeSammlung(daten: unknown, quelle: string): { spielstaende: Spielstand[]; konfiguration: string | null; fehlerhaft: FehlerhafteDatei[] } {
  const o = daten as Record<string, unknown>;
  const version = o.formatVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error(`${quelle}: "formatVersion" fehlt oder ist ungültig.`);
  }
  if (version > SAMMLUNG_FORMAT_VERSION) {
    throw new Error(`${quelle}: stammt aus einer neueren App-Version (Format ${version}). Bitte die App aktualisieren.`);
  }
  if (!Array.isArray(o.spielstaende)) throw new Error(`${quelle}: "spielstaende" muss eine Liste sein.`);
  const spielstaende: Spielstand[] = [];
  const fehlerhaft: FehlerhafteDatei[] = [];
  o.spielstaende.forEach((roh, i) => {
    try {
      spielstaende.push(pruefe_spielstand(roh, `${quelle} [${i + 1}]`));
    } catch (e) {
      fehlerhaft.push({ datei: `${quelle} [${i + 1}]`, grund: (e as Error).message });
    }
  });
  const k = o.konfiguration;
  if (k !== null && k !== undefined && typeof k !== "string") throw new Error(`${quelle}: "konfiguration" muss Text sein.`);
  return { spielstaende, konfiguration: (k as string | null | undefined) ?? null, fehlerhaft };
}

/** Einzelnen Spielstand als Datei herunterladen (z. B. zum Weitergeben). */
export function spielstand_herunterladen(stand: Spielstand, download: Download = browser_download): string {
  const name = dateiname(stand);
  download(name, als_text(stand));
  return name;
}
