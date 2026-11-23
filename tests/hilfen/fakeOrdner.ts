/**
 * Attrappe der File System Access API (Ordner/Datei-Handles) fuer Tests.
 * Bildet das relevante Verhalten nach: NotFoundError ohne create, atomares
 * Schreiben erst bei close(), Rechteabfrage.
 */
import type { Berechtigung, DateiHandle, OrdnerHandle, SchreibStrom } from "../../src/storage/ordnerSpeicher";

function nichtGefunden(name: string): Error {
  const e = new Error(`${name} nicht gefunden`);
  e.name = "NotFoundError";
  return e;
}

export class FakeDatei implements DateiHandle {
  readonly kind = "file" as const;
  inhalt = "";
  lesefehler: Error | null = null;
  schreibvorgaenge = 0;

  constructor(readonly name: string) {}

  async getFile() {
    if (this.lesefehler !== null) throw this.lesefehler;
    const text = this.inhalt;
    return { text: async () => text };
  }

  async createWritable(): Promise<SchreibStrom> {
    let puffer = "";
    return {
      write: async (d: string) => {
        puffer += d;
      },
      close: async () => {
        this.inhalt = puffer; // erst jetzt sichtbar (wie die echte API)
        this.schreibvorgaenge += 1;
      },
      abort: async () => {},
    };
  }
}

export class FakeOrdner implements OrdnerHandle {
  readonly kind = "directory" as const;
  readonly eintraege = new Map<string, FakeDatei | FakeOrdner>();
  recht: Berechtigung = "granted";
  rechtNachAnfrage: Berechtigung = "granted";
  anfragen = 0;

  constructor(readonly name: string) {}

  async getDirectoryHandle(name: string, optionen?: { create?: boolean }): Promise<FakeOrdner> {
    const e = this.eintraege.get(name);
    if (e instanceof FakeOrdner) return e;
    if (e !== undefined) throw Object.assign(new Error("ist eine Datei"), { name: "TypeMismatchError" });
    if (optionen?.create !== true) throw nichtGefunden(name);
    const neu = new FakeOrdner(name);
    this.eintraege.set(name, neu);
    return neu;
  }

  async getFileHandle(name: string, optionen?: { create?: boolean }): Promise<FakeDatei> {
    const e = this.eintraege.get(name);
    if (e instanceof FakeDatei) return e;
    if (e !== undefined) throw Object.assign(new Error("ist ein Ordner"), { name: "TypeMismatchError" });
    if (optionen?.create !== true) throw nichtGefunden(name);
    const neu = new FakeDatei(name);
    this.eintraege.set(name, neu);
    return neu;
  }

  async *values(): AsyncIterable<FakeDatei | FakeOrdner> {
    for (const e of this.eintraege.values()) yield e;
  }

  async queryPermission(): Promise<Berechtigung> {
    return this.recht;
  }

  async requestPermission(): Promise<Berechtigung> {
    this.anfragen += 1;
    this.recht = this.rechtNachAnfrage;
    return this.recht;
  }

  datei(name: string, inhalt: string): FakeDatei {
    const d = new FakeDatei(name);
    d.inhalt = inhalt;
    this.eintraege.set(name, d);
    return d;
  }
}
