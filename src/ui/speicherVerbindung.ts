/**
 * Verbindet die App beim Start mit einem Speicher (neu, ohne Python-Entsprechung):
 *   - Chrome/Edge: gemerkten Ordner wiederverbinden (Rechte ggf. per Klick erneuern)
 *     oder einen Ordner waehlen lassen.
 *   - andere Browser: Rueckfallebene (Dateien laden / Sammeldatei herunterladen).
 */
import type { Spielzustand } from "../state/spielzustand";
import { dateiSpeicher, type DateiSpeicher } from "../storage/dateiSpeicher";
import { gemerkter_ordner, hat_schreibrecht, indexedDbSpeicher, merke_ordner } from "../storage/ordnerMerken";
import { ordner_waehlen, ordner_zugriff_verfuegbar, ordnerSpeicher, type OrdnerHandle } from "../storage/ordnerSpeicher";

export interface Verbindung {
  /** File System Access API vorhanden? */
  readonly ordnerzugriff: boolean;
  /** gemerkter Ordner, fuer den noch per Klick um Erlaubnis gebeten werden muss */
  wartender_ordner: OrdnerHandle | null;
  /** Rueckfallebene (nur ohne Ordnerzugriff) */
  datei: DateiSpeicher | null;
}

export async function starte_verbindung(z: Spielzustand, neu_zeichnen: () => void): Promise<Verbindung> {
  const verbindung: Verbindung = { ordnerzugriff: ordner_zugriff_verfuegbar(), wartender_ordner: null, datei: null };
  if (!verbindung.ordnerzugriff) {
    verbindung.datei = dateiSpeicher({ bei_aenderung: neu_zeichnen });
    await z.verbinde_speicher(verbindung.datei);
    return verbindung;
  }
  const ordner = await gemerkter_ordner(indexedDbSpeicher());
  if (ordner !== null) {
    if (await hat_schreibrecht(ordner, false)) {
      await z.verbinde_speicher(ordnerSpeicher(ordner));
    } else {
      verbindung.wartender_ordner = ordner;
    }
  }
  return verbindung;
}

/** Aus einem Klick heraus: Ordner waehlen, merken und verbinden. */
export async function ordner_neu_waehlen(z: Spielzustand, verbindung: Verbindung): Promise<void> {
  let ordner: OrdnerHandle;
  try {
    ordner = await ordner_waehlen();
  } catch (e) {
    if ((e as Error).name === "AbortError") return; // Dialog abgebrochen
    throw e;
  }
  try {
    await merke_ordner(indexedDbSpeicher(), ordner);
  } catch {
    // Merken ist Komfort - ohne IndexedDB (z. B. privates Fenster) einfach weiter
  }
  verbindung.wartender_ordner = null;
  await z.verbinde_speicher(ordnerSpeicher(ordner));
}

/** Aus einem Klick heraus: Erlaubnis fuer den gemerkten Ordner erneuern. */
export async function ordner_wieder_verbinden(z: Spielzustand, verbindung: Verbindung): Promise<boolean> {
  const ordner = verbindung.wartender_ordner;
  if (ordner === null) return false;
  if (!(await hat_schreibrecht(ordner, true))) return false;
  verbindung.wartender_ordner = null;
  await z.verbinde_speicher(ordnerSpeicher(ordner));
  return true;
}
