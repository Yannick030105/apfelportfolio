/**
 * Merkt sich den gewaehlten Ordner ueber Sitzungen hinweg.
 *
 * Ordner-Handles der File System Access API lassen sich in IndexedDB ablegen.
 * Beim naechsten Start fragt der Browser ggf. erneut nach Erlaubnis
 * (requestPermission geht nur aus einer Benutzeraktion heraus, z. B. Klick
 * auf "Ordner wieder verbinden").
 */
import type { OrdnerHandle } from "./ordnerSpeicher";

/** Kleiner Schluessel-Wert-Speicher (IndexedDB im Browser, Attrappe in Tests). */
export interface SchluesselWertSpeicher {
  hole(schluessel: string): Promise<unknown>;
  setze(schluessel: string, wert: unknown): Promise<void>;
  loesche(schluessel: string): Promise<void>;
}

const SCHLUESSEL_ORDNER = "spielstand-ordner";
const DB_NAME = "apfelportfolio";
const STORE = "einstellungen";

function anfrage<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, fehler) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
}

/** IndexedDB-Umsetzung (nur im Browser). */
export function indexedDbSpeicher(): SchluesselWertSpeicher {
  let db: Promise<IDBDatabase> | null = null;
  const oeffne = (): Promise<IDBDatabase> => {
    if (db === null) {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      db = anfrage(r);
    }
    return db;
  };
  const store = async (modus: IDBTransactionMode) => (await oeffne()).transaction(STORE, modus).objectStore(STORE);
  return {
    async hole(schluessel) {
      return anfrage((await store("readonly")).get(schluessel));
    },
    async setze(schluessel, wert) {
      await anfrage((await store("readwrite")).put(wert, schluessel));
    },
    async loesche(schluessel) {
      await anfrage((await store("readwrite")).delete(schluessel));
    },
  };
}

export async function merke_ordner(kv: SchluesselWertSpeicher, ordner: OrdnerHandle): Promise<void> {
  await kv.setze(SCHLUESSEL_ORDNER, ordner);
}

export async function vergiss_ordner(kv: SchluesselWertSpeicher): Promise<void> {
  await kv.loesche(SCHLUESSEL_ORDNER);
}

/** Gemerkter Ordner oder null (auch, wenn der Speicher nicht verfuegbar ist, z. B. privates Fenster). */
export async function gemerkter_ordner(kv: SchluesselWertSpeicher): Promise<OrdnerHandle | null> {
  try {
    const wert = await kv.hole(SCHLUESSEL_ORDNER);
    if (typeof wert === "object" && wert !== null && (wert as { kind?: unknown }).kind === "directory") {
      return wert as OrdnerHandle;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Prueft (und erbittet auf Wunsch) Schreibrechte fuer den Ordner.
 * anfragen=true nur aus einer Benutzeraktion heraus aufrufen.
 */
export async function hat_schreibrecht(ordner: OrdnerHandle, anfragen: boolean): Promise<boolean> {
  const optionen = { mode: "readwrite" as const };
  if (ordner.queryPermission === undefined) return true; // aeltere Implementierung ohne Rechteabfrage
  if ((await ordner.queryPermission(optionen)) === "granted") return true;
  if (!anfragen || ordner.requestPermission === undefined) return false;
  return (await ordner.requestPermission(optionen)) === "granted";
}
