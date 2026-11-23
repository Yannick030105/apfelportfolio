/**
 * Format der Spielstand-Dateien und der Log-Zeile.
 *
 * Quelle (Python): src/apfelportfolio/data/schema.py (LogZeile, LOG_SPALTEN) und
 * der Aufbau der LogZeile in ui/pages/1_spielen.py / level_2.py (_tag_abschliessen).
 *
 * Neu gegenueber dem Original (dort: eine Zeile in spiellog.csv je fertiger Woche):
 * Jede Spielwoche ist eine eigene JSON-Datei im Ordner "spielstaende". Sie wird
 * nach jedem Spieltag gespeichert (status "laufend") und enthaelt nach dem
 * Freitag zusaetzlich die Log-Zeile (status "abgeschlossen"). Nur abgeschlossene
 * Wochen zaehlen fuer Ranking/Dashboard - wie die Zeilen der CSV.
 * Eine Datei je Woche heisst: Mehrere Spieler koennen gleichzeitig auf dem
 * Netzlaufwerk spielen, ohne sich gegenseitig zu ueberschreiben.
 */
import { Tagesabrechnung, Tageseinkauf, Tagesmarkt, Tagesnachfrage, type RegelwerkFelder, type Wochenverlauf } from "../domain/models";
import { pythonSumme } from "../domain/summe";
import { APP_VERSION } from "../version";

export const SPIELSTAND_FORMAT = "apfelportfolio-spielstand";
export const SPIELSTAND_FORMAT_VERSION = 1;

// ---------------------------------------------------------------------------
// Log-Zeile (data/schema.py)
// ---------------------------------------------------------------------------

/** Spaltenreihenfolge wie im Original (verbindlich fuer CSV-Export/-Import). */
export const LOG_SPALTEN: readonly string[] = Object.freeze([
  "spieler",
  "datum",
  "level",
  "endergebnis",
  "rest_long_short",
  "anteil_spot",
  "anteil_grundlast",
  "prognosefehler",
  "referenzergebnis_nichthandeln",
]);

/** Eine Log-Zeile im Arbeitsspeicher. Fehlende Zahlen (leere CSV-Zelle) = NaN wie in pandas. */
export interface LogZeile {
  readonly spieler: string;
  readonly datum: string | null; // ISO "YYYY-MM-DD"
  readonly level: number;
  readonly endergebnis: number;
  readonly rest_long_short: number;
  readonly anteil_spot: number; // 0..1
  readonly anteil_grundlast: number; // 0..1
  readonly prognosefehler: number | null; // None vor Level 3
  readonly referenzergebnis_nichthandeln: number;
}

/** Log-Zeile in der Datei: fehlende Zahlen als null (JSON kennt kein NaN). */
export interface LogZeileDaten {
  spieler: string;
  datum: string | null;
  level: number;
  endergebnis: number | null;
  rest_long_short: number | null;
  anteil_spot: number | null;
  anteil_grundlast: number | null;
  prognosefehler: number | null;
  referenzergebnis_nichthandeln: number | null;
}

/**
 * Log-Zeile einer fertigen Woche - exakt wie _tag_abschliessen() in
 * 1_spielen.py und level_2.py (Anteile und Referenz dort fest verdrahtet).
 */
export function log_zeile_aus_woche(spieler: string, datum: string, level: number, woche: Wochenverlauf): LogZeileDaten {
  return {
    spieler,
    datum,
    level,
    endergebnis: woche.wochenergebnis,
    rest_long_short: pythonSumme(woche.tage.map((t) => t.bilanzkreis_saldo)),
    anteil_spot: 0.0,
    anteil_grundlast: 1.0,
    prognosefehler: null,
    referenzergebnis_nichthandeln: 0.0,
  };
}

function nanFallsNull(x: number | null): number {
  return x === null ? Number.NaN : x;
}

export function log_zeile_aus_daten(d: LogZeileDaten): LogZeile {
  return Object.freeze({
    spieler: d.spieler,
    datum: d.datum,
    level: d.level,
    endergebnis: nanFallsNull(d.endergebnis),
    rest_long_short: nanFallsNull(d.rest_long_short),
    anteil_spot: nanFallsNull(d.anteil_spot),
    anteil_grundlast: nanFallsNull(d.anteil_grundlast),
    prognosefehler: d.prognosefehler,
    referenzergebnis_nichthandeln: nanFallsNull(d.referenzergebnis_nichthandeln),
  });
}

/** Python: date.today().isoformat() - lokales Datum. */
export function heutiges_datum(jetzt: Date = new Date()): string {
  const j = String(jetzt.getFullYear()).padStart(4, "0");
  const m = String(jetzt.getMonth() + 1).padStart(2, "0");
  const t = String(jetzt.getDate()).padStart(2, "0");
  return `${j}-${m}-${t}`;
}

// ---------------------------------------------------------------------------
// Spielstand
// ---------------------------------------------------------------------------

export interface WuerfeDaten {
  w1: number;
  baeckerei_menge: number;
  ereignis_index: number | null;
}

export interface EinkaufDaten {
  importeur_menge: number;
  wochenmarkt_menge: number;
  mosterei_menge: number;
}

/** Alle Felder der Python-Dataclass Tagesabrechnung (ohne berechnete Properties). */
export interface AbrechnungDaten {
  tag: string;
  markt: { zufallspreis: number; preis_overrides: Record<string, number> };
  einkauf: EinkaufDaten;
  nachfrage: { schulessen: number; baeckerei_bestellt: number };
  an_schulessen_geliefert: number;
  an_baeckerei_geliefert: number;
  bilanzkreis_saldo: number;
  einkaufskosten: number;
  erloes: number;
  ausgleichskosten: number;
  an_mosterei_geliefert: number;
  portfoliostand: number;
  portfolioergebnis: number;
  ereignis_titel: string;
}

export interface GespeicherterTag {
  tag_index: number;
  tag: string;
  wuerfe: WuerfeDaten;
  zugestimmt: boolean;
  einkauf: EinkaufDaten;
  abrechnung: AbrechnungDaten;
}

export interface Levelzustand {
  portfoliostand: number;
  importeur_menge_woche: number;
}

export interface OffenerTag {
  tag_index: number;
  wuerfe: WuerfeDaten;
  zugestimmt: boolean;
}

export interface Migrationsherkunft {
  quelle: string;
  zeile: number; // 1 = erste Datenzeile nach der Kopfzeile
  original: Record<string, string>; // Zelltexte der CSV, unveraendert
}

export type SpielstandStatus = "laufend" | "abgeschlossen";

export interface Spielstand {
  format: typeof SPIELSTAND_FORMAT;
  formatVersion: number;
  appVersion: string;
  id: string;
  levelId: string;
  level: number;
  spieler: string;
  status: SpielstandStatus;
  gestartet_am: string | null; // ISO-Zeitstempel
  abgeschlossen_am: string | null; // ISO-Zeitstempel
  regelwerk: RegelwerkFelder | null; // Regelwerk, mit dem gespielt wurde
  tage: GespeicherterTag[];
  zustand: Levelzustand | null; // Level-Zustand nach dem letzten Tag (zum Fortsetzen)
  offener_tag: OffenerTag | null; // bereits gewuerfelter, noch nicht abgeschlossener Tag
  log_zeile: LogZeileDaten | null; // gesetzt genau dann, wenn status "abgeschlossen"
  migriert: Migrationsherkunft | null; // nur bei aus spiellog.csv uebernommenen Wochen
}

export class SpielstandFehler extends Error {
  override readonly name = "SpielstandFehler";
}

// ---------------------------------------------------------------------------
// Umwandlung Tagesabrechnung <-> Daten
// ---------------------------------------------------------------------------

export function abrechnung_als_daten(a: Tagesabrechnung): AbrechnungDaten {
  return {
    tag: a.tag,
    markt: { zufallspreis: a.markt.zufallspreis, preis_overrides: { ...a.markt.preis_overrides } },
    einkauf: {
      importeur_menge: a.einkauf.importeur_menge,
      wochenmarkt_menge: a.einkauf.wochenmarkt_menge,
      mosterei_menge: a.einkauf.mosterei_menge,
    },
    nachfrage: { schulessen: a.nachfrage.schulessen, baeckerei_bestellt: a.nachfrage.baeckerei_bestellt },
    an_schulessen_geliefert: a.an_schulessen_geliefert,
    an_baeckerei_geliefert: a.an_baeckerei_geliefert,
    bilanzkreis_saldo: a.bilanzkreis_saldo,
    einkaufskosten: a.einkaufskosten,
    erloes: a.erloes,
    ausgleichskosten: a.ausgleichskosten,
    an_mosterei_geliefert: a.an_mosterei_geliefert,
    portfoliostand: a.portfoliostand,
    portfolioergebnis: a.portfolioergebnis,
    ereignis_titel: a.ereignis_titel,
  };
}

export function abrechnung_aus_daten(d: AbrechnungDaten): Tagesabrechnung {
  return new Tagesabrechnung({
    ...d,
    markt: new Tagesmarkt(d.markt),
    einkauf: new Tageseinkauf(d.einkauf),
    nachfrage: new Tagesnachfrage(d.nachfrage),
  });
}

// ---------------------------------------------------------------------------
// Lebenszyklus eines Spielstands
// ---------------------------------------------------------------------------

/** Eindeutige Kennung (kein Spielzufall, daher nicht ueber wuerfel.ts). */
export function neue_id(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function neuer_spielstand(f: {
  spieler: string;
  levelId: string;
  level: number;
  regelwerk: RegelwerkFelder;
  jetzt?: Date;
  id?: string;
  appVersion?: string;
}): Spielstand {
  return {
    format: SPIELSTAND_FORMAT,
    formatVersion: SPIELSTAND_FORMAT_VERSION,
    appVersion: f.appVersion ?? APP_VERSION,
    id: f.id ?? neue_id(),
    levelId: f.levelId,
    level: f.level,
    spieler: f.spieler,
    status: "laufend",
    gestartet_am: (f.jetzt ?? new Date()).toISOString(),
    abgeschlossen_am: null,
    regelwerk: { ...f.regelwerk },
    tage: [],
    zustand: { portfoliostand: 0.0, importeur_menge_woche: 0.0 },
    offener_tag: null,
    log_zeile: null,
    migriert: null,
  };
}

export function mit_offenem_tag(stand: Spielstand, offener_tag: OffenerTag | null): Spielstand {
  pruefeLaufend(stand);
  return { ...stand, offener_tag };
}

/** Nach "Handel abschliessen": Tag anhaengen, Zustand merken. */
export function mit_abgeschlossenem_tag(stand: Spielstand, tag: GespeicherterTag, zustand: Levelzustand): Spielstand {
  pruefeLaufend(stand);
  if (tag.tag_index !== stand.tage.length) {
    throw new SpielstandFehler(`Tag ${tag.tag_index + 1} passt nicht: erwartet Tag ${stand.tage.length + 1}.`);
  }
  return { ...stand, tage: [...stand.tage, tag], zustand: { ...zustand }, offener_tag: null };
}

/** Nach dem fuenften Tag: Log-Zeile wie im Original bilden. */
export function als_abgeschlossen(stand: Spielstand, woche: Wochenverlauf, jetzt: Date = new Date()): Spielstand {
  pruefeLaufend(stand);
  if (!woche.ist_komplett) {
    throw new SpielstandFehler("Die Woche ist noch nicht komplett.");
  }
  return {
    ...stand,
    status: "abgeschlossen",
    abgeschlossen_am: jetzt.toISOString(),
    offener_tag: null,
    log_zeile: log_zeile_aus_woche(stand.spieler, heutiges_datum(jetzt), stand.level, woche),
  };
}

function pruefeLaufend(stand: Spielstand): void {
  if (stand.status !== "laufend") {
    throw new SpielstandFehler("Diese Woche ist bereits abgeschlossen.");
  }
}

// ---------------------------------------------------------------------------
// Dateiname und Text
// ---------------------------------------------------------------------------

function dateinamenTeil(text: string, maxLaenge: number): string {
  const teil = Array.from(text.normalize("NFC"))
    .map((z) => (/[\p{L}\p{N}_-]/u.test(z) ? z : "_"))
    .slice(0, maxLaenge)
    .join("");
  return teil === "" ? "_" : teil;
}

/** z. B. "20261119-153012_level1_Anna_<vollstaendige id>.json" (id macht den Namen eindeutig) */
export function dateiname(stand: Spielstand): string {
  if (stand.migriert !== null) {
    return `migriert_${String(stand.migriert.zeile).padStart(4, "0")}_${stand.levelId}_${dateinamenTeil(stand.spieler, 30)}.json`;
  }
  const zeit = (stand.gestartet_am ?? "").replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
  return `${zeit === "" ? "ohne-datum" : zeit}_${stand.levelId}_${dateinamenTeil(stand.spieler, 30)}_${dateinamenTeil(stand.id, 64)}.json`;
}

export function als_text(stand: Spielstand): string {
  return `${JSON.stringify(stand, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// Pruefung beim Laden
// ---------------------------------------------------------------------------

type Roh = Record<string, unknown>;

function istObjekt(x: unknown): x is Roh {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

class Pruefer {
  constructor(private readonly ort: string) {}

  fehler(text: string): never {
    throw new SpielstandFehler(`${this.ort}: ${text}`);
  }

  objekt(x: unknown, feld: string): Roh {
    if (!istObjekt(x)) this.fehler(`"${feld}" fehlt oder ist kein Objekt.`);
    return x;
  }

  text(o: Roh, feld: string, leerErlaubt = false): string {
    const w = o[feld];
    if (typeof w !== "string" || (!leerErlaubt && w === "")) this.fehler(`"${feld}" muss ein Text sein.`);
    return w;
  }

  textOderNull(o: Roh, feld: string): string | null {
    const w = o[feld];
    if (w === null || w === undefined) return null;
    if (typeof w !== "string") this.fehler(`"${feld}" muss ein Text oder null sein.`);
    return w;
  }

  zahl(o: Roh, feld: string): number {
    const w = o[feld];
    if (typeof w !== "number" || !Number.isFinite(w)) this.fehler(`"${feld}" muss eine Zahl sein.`);
    return w;
  }

  zahlOderNull(o: Roh, feld: string): number | null {
    const w = o[feld];
    if (w === null || w === undefined) return null;
    if (typeof w !== "number" || !Number.isFinite(w)) this.fehler(`"${feld}" muss eine Zahl oder null sein.`);
    return w;
  }

  ganzzahl(o: Roh, feld: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
    const w = this.zahl(o, feld);
    if (!Number.isInteger(w) || w < min || w > max) this.fehler(`"${feld}" muss eine ganze Zahl von ${min} bis ${max} sein.`);
    return w;
  }

  wahrheitswert(o: Roh, feld: string): boolean {
    const w = o[feld];
    if (typeof w !== "boolean") this.fehler(`"${feld}" muss true oder false sein.`);
    return w;
  }
}

const REGELWERK_FELDER = [
  "importeur_limit",
  "wochenmarkt_limit_tag",
  "schulessen_menge",
  "schulessen_preis",
  "obstbauer_menge",
  "obstbauer_preis",
  "baeckerei_preis_aufschlag",
  "baeckerei_preis_min",
  "baeckerei_preis_max",
  "baeckerei_menge_min",
  "baeckerei_menge_max",
] as const;

function pruefeWuerfe(p: Pruefer, roh: unknown): WuerfeDaten {
  const o = p.objekt(roh, "wuerfe");
  const ereignis = o.ereignis_index;
  return {
    w1: p.zahl(o, "w1"),
    baeckerei_menge: p.zahl(o, "baeckerei_menge"),
    ereignis_index: ereignis === null || ereignis === undefined ? null : p.ganzzahl(o, "ereignis_index", -1_000_000),
  };
}

function pruefeEinkauf(p: Pruefer, roh: unknown): EinkaufDaten {
  const o = p.objekt(roh, "einkauf");
  return {
    importeur_menge: p.zahl(o, "importeur_menge"),
    wochenmarkt_menge: p.zahl(o, "wochenmarkt_menge"),
    mosterei_menge: p.zahl(o, "mosterei_menge"),
  };
}

function pruefeAbrechnung(p: Pruefer, roh: unknown): AbrechnungDaten {
  const o = p.objekt(roh, "abrechnung");
  const markt = p.objekt(o.markt, "abrechnung.markt");
  const overridesRoh = p.objekt(markt.preis_overrides, "abrechnung.markt.preis_overrides");
  const preis_overrides: Record<string, number> = {};
  for (const [k, v] of Object.entries(overridesRoh)) {
    if (typeof v !== "number" || !Number.isFinite(v)) p.fehler(`Preis-Override "${k}" muss eine Zahl sein.`);
    preis_overrides[k] = v;
  }
  const nachfrage = p.objekt(o.nachfrage, "abrechnung.nachfrage");
  return {
    tag: p.text(o, "tag"),
    markt: { zufallspreis: p.zahl(markt, "zufallspreis"), preis_overrides },
    einkauf: pruefeEinkauf(p, o.einkauf),
    nachfrage: { schulessen: p.zahl(nachfrage, "schulessen"), baeckerei_bestellt: p.zahl(nachfrage, "baeckerei_bestellt") },
    an_schulessen_geliefert: p.zahl(o, "an_schulessen_geliefert"),
    an_baeckerei_geliefert: p.zahl(o, "an_baeckerei_geliefert"),
    bilanzkreis_saldo: p.zahl(o, "bilanzkreis_saldo"),
    einkaufskosten: p.zahl(o, "einkaufskosten"),
    erloes: p.zahl(o, "erloes"),
    ausgleichskosten: p.zahl(o, "ausgleichskosten"),
    an_mosterei_geliefert: p.zahl(o, "an_mosterei_geliefert"),
    portfoliostand: p.zahl(o, "portfoliostand"),
    portfolioergebnis: p.zahl(o, "portfolioergebnis"),
    ereignis_titel: p.text(o, "ereignis_titel", true),
  };
}

function pruefeLogZeile(p: Pruefer, roh: unknown): LogZeileDaten {
  const o = p.objekt(roh, "log_zeile");
  const datum = p.textOderNull(o, "datum");
  if (datum !== null && !/^\d{4}-\d{2}-\d{2}$/.test(datum)) p.fehler(`"log_zeile.datum" muss JJJJ-MM-TT sein.`);
  return {
    spieler: p.text(o, "spieler"),
    datum,
    level: p.ganzzahl(o, "level", 1),
    endergebnis: p.zahlOderNull(o, "endergebnis"),
    rest_long_short: p.zahlOderNull(o, "rest_long_short"),
    anteil_spot: p.zahlOderNull(o, "anteil_spot"),
    anteil_grundlast: p.zahlOderNull(o, "anteil_grundlast"),
    prognosefehler: p.zahlOderNull(o, "prognosefehler"),
    referenzergebnis_nichthandeln: p.zahlOderNull(o, "referenzergebnis_nichthandeln"),
  };
}

/**
 * Prueft rohe Daten (z. B. aus JSON.parse) und liefert einen Spielstand.
 * Wirft SpielstandFehler mit verstaendlicher Meldung.
 */
export function pruefe_spielstand(daten: unknown, quelle = "Spielstand"): Spielstand {
  const p = new Pruefer(quelle);
  const o = p.objekt(daten, "Spielstand");
  if (o.format !== SPIELSTAND_FORMAT) p.fehler("keine Apfelportfolio-Spielstanddatei.");
  const formatVersion = p.ganzzahl(o, "formatVersion", 1);
  if (formatVersion > SPIELSTAND_FORMAT_VERSION) {
    p.fehler(
      `stammt aus einer neueren App-Version (Format ${formatVersion}, diese App kennt bis ${SPIELSTAND_FORMAT_VERSION}). Bitte die App aktualisieren.`,
    );
  }
  const statusRoh = o.status;
  if (statusRoh !== "laufend" && statusRoh !== "abgeschlossen") {
    return p.fehler('"status" muss "laufend" oder "abgeschlossen" sein.');
  }
  const status: SpielstandStatus = statusRoh;

  let regelwerk: RegelwerkFelder | null = null;
  if (o.regelwerk !== null && o.regelwerk !== undefined) {
    const r = p.objekt(o.regelwerk, "regelwerk");
    regelwerk = Object.fromEntries(REGELWERK_FELDER.map((f) => [f, p.zahl(r, f)])) as unknown as RegelwerkFelder;
  }

  if (!Array.isArray(o.tage)) p.fehler('"tage" muss eine Liste sein.');
  const tage = (o.tage as unknown[]).map((roh, i): GespeicherterTag => {
    const tp = new Pruefer(`${quelle}, Tag ${i + 1}`);
    const t = tp.objekt(roh, "Tag");
    const tag_index = tp.ganzzahl(t, "tag_index", 0, 4);
    if (tag_index !== i) tp.fehler(`"tag_index" ist ${tag_index}, erwartet ${i}.`);
    return {
      tag_index,
      tag: tp.text(t, "tag"),
      wuerfe: pruefeWuerfe(tp, t.wuerfe),
      zugestimmt: tp.wahrheitswert(t, "zugestimmt"),
      einkauf: pruefeEinkauf(tp, t.einkauf),
      abrechnung: pruefeAbrechnung(tp, t.abrechnung),
    };
  });
  if (tage.length > 5) p.fehler("mehr als 5 Tage.");

  let zustand: Levelzustand | null = null;
  if (o.zustand !== null && o.zustand !== undefined) {
    const z = p.objekt(o.zustand, "zustand");
    zustand = { portfoliostand: p.zahl(z, "portfoliostand"), importeur_menge_woche: p.zahl(z, "importeur_menge_woche") };
  }

  let offener_tag: OffenerTag | null = null;
  if (o.offener_tag !== null && o.offener_tag !== undefined) {
    const ot = p.objekt(o.offener_tag, "offener_tag");
    offener_tag = {
      tag_index: p.ganzzahl(ot, "tag_index", 0, 4),
      wuerfe: pruefeWuerfe(p, ot.wuerfe),
      zugestimmt: p.wahrheitswert(ot, "zugestimmt"),
    };
  }

  const log_zeile = o.log_zeile === null || o.log_zeile === undefined ? null : pruefeLogZeile(p, o.log_zeile);

  let migriert: Migrationsherkunft | null = null;
  if (o.migriert !== null && o.migriert !== undefined) {
    const m = p.objekt(o.migriert, "migriert");
    const original = p.objekt(m.original, "migriert.original");
    for (const [k, v] of Object.entries(original)) {
      if (typeof v !== "string") p.fehler(`"migriert.original.${k}" muss Text sein.`);
    }
    migriert = { quelle: p.text(m, "quelle"), zeile: p.ganzzahl(m, "zeile", 1), original: original as Record<string, string> };
  }

  const stand: Spielstand = {
    format: SPIELSTAND_FORMAT,
    formatVersion,
    appVersion: p.text(o, "appVersion"),
    id: p.text(o, "id"),
    levelId: p.text(o, "levelId"),
    level: p.ganzzahl(o, "level", 1),
    spieler: p.text(o, "spieler"),
    status,
    gestartet_am: p.textOderNull(o, "gestartet_am"),
    abgeschlossen_am: p.textOderNull(o, "abgeschlossen_am"),
    regelwerk,
    tage,
    zustand,
    offener_tag,
    log_zeile,
    migriert,
  };

  // Zusammenhaenge
  if (status === "abgeschlossen" && log_zeile === null) p.fehler('abgeschlossene Woche ohne "log_zeile".');
  if (status === "laufend" && log_zeile !== null) p.fehler('laufende Woche mit "log_zeile".');
  if (status === "laufend" && (regelwerk === null || zustand === null)) {
    p.fehler('laufende Woche braucht "regelwerk" und "zustand".');
  }
  if (status === "abgeschlossen" && migriert === null && tage.length !== 5) {
    p.fehler(`abgeschlossene Woche mit ${tage.length} statt 5 Tagen.`);
  }
  if (log_zeile !== null && (log_zeile.spieler !== stand.spieler || log_zeile.level !== stand.level)) {
    p.fehler('"log_zeile" passt nicht zu Spieler/Level des Spielstands.');
  }
  if (offener_tag !== null && offener_tag.tag_index !== tage.length) {
    p.fehler(`"offener_tag" ist Tag ${offener_tag.tag_index + 1}, erwartet Tag ${tage.length + 1}.`);
  }
  return stand;
}

/** Text einer Datei lesen und pruefen. */
export function spielstand_aus_text(text: string, quelle = "Spielstand"): Spielstand {
  let daten: unknown;
  try {
    daten = JSON.parse(text);
  } catch (e) {
    throw new SpielstandFehler(`${quelle}: kein gültiges JSON (${(e as Error).message}).`);
  }
  return pruefe_spielstand(daten, quelle);
}
