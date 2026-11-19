/**
 * Fachliche Kernmodelle des Spiels - unabhaengig von der Oberflaeche.
 *
 * Quelle (Python): src/apfelportfolio/domain/models.py (1:1-Portierung).
 *
 * Konventionen der Portierung:
 * - Klassen-, Feld- und Methodennamen bleiben wie in Python (snake_case), damit
 *   die Portierung Zeile fuer Zeile nachpruefbar ist und Feldnamen, die als Daten
 *   vorkommen (z. B. "preis_importeur" in Ereignis-Effekten), unveraendert passen.
 * - @dataclass(frozen=True) -> readonly-Felder + Object.freeze.
 * - Python-Properties -> TypeScript-Getter.
 * - Konstruktoren nehmen ein Objekt mit den Feldern (wie Keyword-Argumente);
 *   Felder mit Default sind optional.
 * - sum() -> pythonSumme (kompensierte Summation wie Python >= 3.12).
 * - None -> null.
 */
import { ValueError } from "./fehler";
import { pythonSumme } from "./summe";

/** Bezugsquelle fuer eine Beschaffungsentscheidung. */
export enum Quellentyp {
  GRUNDLAST = "grundlast", // Obstbauer / Grundlastvertrag
  SPOTMARKT = "spotmarkt", // Wochenmarkt
  TERMIN = "termin", // Importeur / Forward
}

/** Preise, die fuer eine Spielrunde (einen Tag/eine Woche) gelten. */
export class Marktpreise {
  readonly grundlast_preis: number;
  readonly spotmarkt_preis: number;
  readonly termin_preis: number | null;

  constructor(f: { grundlast_preis: number; spotmarkt_preis: number; termin_preis?: number | null }) {
    this.grundlast_preis = f.grundlast_preis;
    this.spotmarkt_preis = f.spotmarkt_preis;
    this.termin_preis = f.termin_preis ?? null;
    Object.freeze(this);
  }
}

/** Eine Kaufentscheidung des Spielers in einer Runde. */
export class Beschaffungsentscheidung {
  readonly grundlast_menge: number;
  readonly spotmarkt_menge: number;
  readonly termin_menge: number;

  constructor(f: { grundlast_menge?: number; spotmarkt_menge?: number; termin_menge?: number } = {}) {
    this.grundlast_menge = f.grundlast_menge ?? 0.0;
    this.spotmarkt_menge = f.spotmarkt_menge ?? 0.0;
    this.termin_menge = f.termin_menge ?? 0.0;
    Object.freeze(this);
  }

  get gesamtmenge(): number {
    return this.grundlast_menge + this.spotmarkt_menge + this.termin_menge;
  }
}

/** Der tatsaechliche Bedarf (Absatz) einer Runde. */
export class Bedarf {
  readonly menge: number;
  readonly prognose: number | null; // ab Level 3 relevant

  constructor(f: { menge: number; prognose?: number | null }) {
    this.menge = f.menge;
    this.prognose = f.prognose ?? null;
    Object.freeze(this);
  }

  get prognosefehler(): number | null {
    if (this.prognose === null) {
      return null;
    }
    return this.menge - this.prognose;
  }
}

/**
 * Rest-Long/Short-Position nach Abgleich von Beschaffung und Bedarf.
 * positiv = Long (Ueberschuss), negativ = Short (Fehlmenge)
 */
export class Bilanzkreis {
  readonly saldo: number;

  constructor(f: { saldo: number }) {
    this.saldo = f.saldo;
    Object.freeze(this);
  }

  get ist_long(): boolean {
    return this.saldo > 0;
  }

  get ist_short(): boolean {
    return this.saldo < 0;
  }

  get ist_ausgeglichen(): boolean {
    return this.saldo === 0;
  }
}

/** Kosten-Attribution einer Runde (fuer Dashboard-Chart 'Attribution'). */
export class Kostenaufstellung {
  readonly beschaffungskosten: number;
  readonly ausgleichskosten: number;
  readonly prognosefehlerkosten: number;

  constructor(f: { beschaffungskosten: number; ausgleichskosten?: number; prognosefehlerkosten?: number }) {
    this.beschaffungskosten = f.beschaffungskosten;
    this.ausgleichskosten = f.ausgleichskosten ?? 0.0;
    this.prognosefehlerkosten = f.prognosefehlerkosten ?? 0.0;
    Object.freeze(this);
  }

  get gesamtkosten(): number {
    return this.beschaffungskosten + this.ausgleichskosten + this.prognosefehlerkosten;
  }
}

/** Ergebnis einer einzelnen Spielrunde - Rohdaten fuer eine Log-Zeile. */
export class Rundenergebnis {
  readonly level: number;
  readonly runde: number;
  readonly entscheidung: Beschaffungsentscheidung;
  readonly bedarf: Bedarf;
  readonly bilanzkreis: Bilanzkreis;
  readonly kosten: Kostenaufstellung;
  readonly referenzkosten_nichthandeln: number;

  constructor(f: {
    level: number;
    runde: number;
    entscheidung: Beschaffungsentscheidung;
    bedarf: Bedarf;
    bilanzkreis: Bilanzkreis;
    kosten: Kostenaufstellung;
    referenzkosten_nichthandeln: number;
  }) {
    this.level = f.level;
    this.runde = f.runde;
    this.entscheidung = f.entscheidung;
    this.bedarf = f.bedarf;
    this.bilanzkreis = f.bilanzkreis;
    this.kosten = f.kosten;
    this.referenzkosten_nichthandeln = f.referenzkosten_nichthandeln;
    Object.freeze(this);
  }

  /** Leit-KPI: wuerfelbereinigter Mehrwert (siehe Konzept Abschnitt 5). */
  get mehrwert_ggue_nichthandeln(): number {
    return this.referenzkosten_nichthandeln - this.kosten.gesamtkosten;
  }
}

/** Ein vollstaendiger Durchlauf eines Levels, bestehend aus Runden. */
export class Spieldurchlauf {
  level: number;
  gestartet_am: Date;
  runden: Rundenergebnis[];

  constructor(f: { level: number; gestartet_am: Date; runden?: Rundenergebnis[] }) {
    this.level = f.level;
    this.gestartet_am = f.gestartet_am;
    this.runden = f.runden ?? [];
  }

  get endergebnis(): number {
    return pythonSumme(this.runden.map((r) => r.mehrwert_ggue_nichthandeln));
  }

  get rest_bilanzkreis(): number {
    // Python: self.runden[-1].bilanzkreis.saldo if self.runden else 0.0
    const letzte = this.runden[this.runden.length - 1];
    return this.runden.length > 0 && letzte !== undefined ? letzte.bilanzkreis.saldo : 0.0;
  }
}

/** Bedarf eines einzelnen Tages, getrennt nach Fix- und Zufallsanteil. */
export class TagesBedarf {
  readonly tag: string;
  readonly schulessen: number; // Fixprodukt, dem Spieler vorab bekannt
  readonly baeckerei: number; // zufaellige Absatzgroesse, erst am Tag selbst bekannt

  constructor(f: { tag: string; schulessen: number; baeckerei: number }) {
    this.tag = f.tag;
    this.schulessen = f.schulessen;
    this.baeckerei = f.baeckerei;
    Object.freeze(this);
  }

  get gesamt(): number {
    return this.schulessen + this.baeckerei;
  }
}

/** Namen der Preis-Properties von Tagesmarkt, die per Override ersetzt werden koennen. */
export type PreisFeld = "preis_importeur" | "preis_wochenmarkt" | "preis_baeckerei" | "preis_mosterei";

/** Ein pro Tag gezogener Zufallspreis, aus dem alle Marktpreise abgeleitet werden. */
export class Tagesmarkt {
  readonly zufallspreis: number; // zwischen 1 und 6 (Wuerfelzahl W1)
  readonly preis_overrides: Readonly<Record<string, number>>; // Ereignis-Overrides

  constructor(f: { zufallspreis: number; preis_overrides?: Readonly<Record<string, number>> }) {
    this.zufallspreis = f.zufallspreis;
    this.preis_overrides = Object.freeze({ ...(f.preis_overrides ?? {}) });
    Object.freeze(this);
  }

  /** Python: self.preis_overrides.get(schluessel, standard) */
  private override_oder(schluessel: PreisFeld, standard: number): number {
    return Object.hasOwn(this.preis_overrides, schluessel)
      ? (this.preis_overrides[schluessel] as number)
      : standard;
  }

  get preis_importeur(): number {
    return this.override_oder("preis_importeur", this.zufallspreis / 10);
  }

  get preis_wochenmarkt(): number {
    return this.override_oder("preis_wochenmarkt", this.zufallspreis / 10 + 0.1);
  }

  get preis_baeckerei(): number {
    return this.override_oder("preis_baeckerei", this.zufallspreis / 10 + 0.2);
  }

  get preis_mosterei(): number {
    // Korrektur: Mosterei-Preis = 0,8 * Wochenmarktpreis (nicht Importeurpreis).
    return this.override_oder("preis_mosterei", 0.8 * this.preis_wochenmarkt);
  }
}

/** Ergebnis eines einzelnen Tages innerhalb einer Spielwoche. */
export class Tagesergebnis {
  readonly tag: string;
  readonly bedarf: TagesBedarf;
  readonly entscheidung: Beschaffungsentscheidung;
  readonly bilanzkreis: Bilanzkreis;
  readonly kosten: Kostenaufstellung;
  readonly referenzkosten_nichthandeln: number;

  constructor(f: {
    tag: string;
    bedarf: TagesBedarf;
    entscheidung: Beschaffungsentscheidung;
    bilanzkreis: Bilanzkreis;
    kosten: Kostenaufstellung;
    referenzkosten_nichthandeln: number;
  }) {
    this.tag = f.tag;
    this.bedarf = f.bedarf;
    this.entscheidung = f.entscheidung;
    this.bilanzkreis = f.bilanzkreis;
    this.kosten = f.kosten;
    this.referenzkosten_nichthandeln = f.referenzkosten_nichthandeln;
    Object.freeze(this);
  }

  get mehrwert_ggue_nichthandeln(): number {
    return this.referenzkosten_nichthandeln - this.kosten.gesamtkosten;
  }
}

/** Zukauf-Entscheidung des Spielers fuer einen Tag (zusaetzlich zum Obstbauer). */
export class Tageseinkauf {
  readonly importeur_menge: number;
  readonly wochenmarkt_menge: number;
  readonly mosterei_menge: number;

  constructor(f: { importeur_menge?: number; wochenmarkt_menge?: number; mosterei_menge?: number } = {}) {
    this.importeur_menge = f.importeur_menge ?? 0.0;
    this.wochenmarkt_menge = f.wochenmarkt_menge ?? 0.0;
    this.mosterei_menge = f.mosterei_menge ?? 0.0;
    Object.freeze(this);
  }

  get zukauf_gesamt(): number {
    return this.importeur_menge + this.wochenmarkt_menge;
  }
}

/** Nachfrage eines Tages: Fixkunde Schulessen + zufaellige Baeckerei. */
export class Tagesnachfrage {
  readonly schulessen: number; // fix (Regelwerk)
  readonly baeckerei_bestellt: number; // zufaellig (Regelwerk-Spanne)

  constructor(f: { schulessen: number; baeckerei_bestellt: number }) {
    this.schulessen = f.schulessen;
    this.baeckerei_bestellt = f.baeckerei_bestellt;
    Object.freeze(this);
  }

  get gesamt(): number {
    return this.schulessen + this.baeckerei_bestellt;
  }
}

export interface TagesabrechnungFelder {
  tag: string;
  markt: Tagesmarkt;
  einkauf: Tageseinkauf;
  nachfrage: Tagesnachfrage;
  an_schulessen_geliefert: number;
  an_baeckerei_geliefert: number;
  bilanzkreis_saldo: number; // Bestand - Nachfrage, kann +/- sein
  einkaufskosten: number;
  erloes: number;
  ausgleichskosten?: number; // nicht mehr aktiv befuellt, bleibt fuer Abwaertskompatibilitaet
  an_mosterei_geliefert?: number; // automatischer Freitagsausgleich (Ueberschuss -> Mosterei)
  portfoliostand?: number; // kumulierter Bestand ueber die Woche nach diesem Tag
  portfolioergebnis?: number; // Erloese - Einkaufskosten (ohne Ausgleichskosten)
  ereignis_titel?: string; // Titel des Tagesereignisses (Level 2)
}

/** Vollstaendige Abrechnung eines Spieltages. */
export class Tagesabrechnung {
  readonly tag: string;
  readonly markt: Tagesmarkt;
  readonly einkauf: Tageseinkauf;
  readonly nachfrage: Tagesnachfrage;
  readonly an_schulessen_geliefert: number;
  readonly an_baeckerei_geliefert: number;
  readonly bilanzkreis_saldo: number;
  readonly einkaufskosten: number;
  readonly erloes: number;
  readonly ausgleichskosten: number;
  readonly an_mosterei_geliefert: number;
  readonly portfoliostand: number;
  readonly portfolioergebnis: number;
  readonly ereignis_titel: string;

  constructor(f: TagesabrechnungFelder) {
    this.tag = f.tag;
    this.markt = f.markt;
    this.einkauf = f.einkauf;
    this.nachfrage = f.nachfrage;
    this.an_schulessen_geliefert = f.an_schulessen_geliefert;
    this.an_baeckerei_geliefert = f.an_baeckerei_geliefert;
    this.bilanzkreis_saldo = f.bilanzkreis_saldo;
    this.einkaufskosten = f.einkaufskosten;
    this.erloes = f.erloes;
    this.ausgleichskosten = f.ausgleichskosten ?? 0.0;
    this.an_mosterei_geliefert = f.an_mosterei_geliefert ?? 0.0;
    this.portfoliostand = f.portfoliostand ?? 0.0;
    this.portfolioergebnis = f.portfolioergebnis ?? 0.0;
    this.ereignis_titel = f.ereignis_titel ?? "";
    Object.freeze(this);
  }

  get tagesergebnis(): number {
    return this.erloes - this.einkaufskosten;
  }
}

/** Kompletter Wochendurchlauf (Mo-Fr) = eine abgeschlossene Spielrunde. */
export class Wochenergebnis {
  level: number;
  fixe_tagesmenge: number;
  tage: Tagesergebnis[];

  constructor(f: { level: number; fixe_tagesmenge: number; tage?: Tagesergebnis[] }) {
    this.level = f.level;
    this.fixe_tagesmenge = f.fixe_tagesmenge;
    this.tage = f.tage ?? [];
  }

  get endergebnis(): number {
    return pythonSumme(this.tage.map((t) => t.mehrwert_ggue_nichthandeln));
  }

  get gesamtkosten(): number {
    return pythonSumme(this.tage.map((t) => t.kosten.gesamtkosten));
  }

  /** Summe der taeglichen Long/Short-Salden ueber die Woche (kein Uebertrag). */
  get rest_bilanzkreis_summe(): number {
    return pythonSumme(this.tage.map((t) => t.bilanzkreis.saldo));
  }
}

/** Alle bisher abgeschlossenen Tage einer Spielwoche. */
export class Wochenverlauf {
  level: number;
  tage: Tagesabrechnung[];

  constructor(f: { level: number; tage?: Tagesabrechnung[] }) {
    this.level = f.level;
    this.tage = f.tage ?? [];
  }

  get wochenergebnis(): number {
    return pythonSumme(this.tage.map((t) => t.tagesergebnis));
  }

  get ist_komplett(): boolean {
    return this.tage.length >= 5;
  }
}

export interface RegelwerkFelder {
  importeur_limit: number; // max. Aepfel Mo-Mi
  wochenmarkt_limit_tag: number; // max. Aepfel/Tag
  schulessen_menge: number; // fixe Tagesabnahme Schulessen
  schulessen_preis: number; // EUR/Stueck Schulessen
  obstbauer_menge: number; // fixe Tageslieferung Obstbauer
  obstbauer_preis: number; // EUR/Stueck Obstbauer
  baeckerei_preis_aufschlag: number; // Aufschlag auf W1/10 fuer Baeckerei-Preis
  baeckerei_preis_min: number; // Spanne des Preiswuerfels W1
  baeckerei_preis_max: number;
  baeckerei_menge_min: number; // Spanne der Baeckerei-Bestellmenge
  baeckerei_menge_max: number;
}

/** Defaults = Standardregeln (Python-Dataclass-Defaults, NICHT config/config.json). */
export const REGELWERK_STANDARD: Readonly<RegelwerkFelder> = Object.freeze({
  importeur_limit: 200,
  wochenmarkt_limit_tag: 140,
  schulessen_menge: 80,
  schulessen_preis: 0.4,
  obstbauer_menge: 100.0,
  obstbauer_preis: 0.35,
  baeckerei_preis_aufschlag: 0.2,
  baeckerei_preis_min: 1,
  baeckerei_preis_max: 6,
  baeckerei_menge_min: 10,
  baeckerei_menge_max: 60,
});

/** Alle vom Spielleiter einstellbaren Parameter. Defaults = Standardregeln. (veraenderbar wie in Python) */
export class Regelwerk implements RegelwerkFelder {
  importeur_limit: number;
  wochenmarkt_limit_tag: number;
  schulessen_menge: number;
  schulessen_preis: number;
  obstbauer_menge: number;
  obstbauer_preis: number;
  baeckerei_preis_aufschlag: number;
  baeckerei_preis_min: number;
  baeckerei_preis_max: number;
  baeckerei_menge_min: number;
  baeckerei_menge_max: number;

  constructor(f: Partial<RegelwerkFelder> = {}) {
    const w = { ...REGELWERK_STANDARD, ...f };
    this.importeur_limit = w.importeur_limit;
    this.wochenmarkt_limit_tag = w.wochenmarkt_limit_tag;
    this.schulessen_menge = w.schulessen_menge;
    this.schulessen_preis = w.schulessen_preis;
    this.obstbauer_menge = w.obstbauer_menge;
    this.obstbauer_preis = w.obstbauer_preis;
    this.baeckerei_preis_aufschlag = w.baeckerei_preis_aufschlag;
    this.baeckerei_preis_min = w.baeckerei_preis_min;
    this.baeckerei_preis_max = w.baeckerei_preis_max;
    this.baeckerei_menge_min = w.baeckerei_menge_min;
    this.baeckerei_menge_max = w.baeckerei_menge_max;
  }

  validiert(): Regelwerk {
    if (this.importeur_limit < 0) {
      throw new ValueError("Importeur-Obergrenze darf nicht negativ sein.");
    }
    if (this.schulessen_menge < 0) {
      throw new ValueError("Schulessen-Menge darf nicht negativ sein.");
    }
    if (this.schulessen_preis < 0) {
      throw new ValueError("Schulessen-Preis darf nicht negativ sein.");
    }
    if (this.obstbauer_menge < 0) {
      throw new ValueError("Obstbauer-Menge darf nicht negativ sein.");
    }
    if (this.obstbauer_preis < 0) {
      throw new ValueError("Obstbauer-Preis darf nicht negativ sein.");
    }
    if (this.baeckerei_preis_aufschlag < 0) {
      throw new ValueError("Baeckerei-Preisaufschlag darf nicht negativ sein.");
    }
    if (this.baeckerei_preis_min > this.baeckerei_preis_max) {
      throw new ValueError("W1-Minimum darf nicht groesser als W1-Maximum sein.");
    }
    if (this.baeckerei_menge_min > this.baeckerei_menge_max) {
      throw new ValueError("Baeckerei-Mengenminimum darf nicht groesser als das Maximum sein.");
    }
    return this;
  }

  /** Python: dataclasses.asdict(regelwerk) */
  als_dict(): RegelwerkFelder {
    return {
      importeur_limit: this.importeur_limit,
      wochenmarkt_limit_tag: this.wochenmarkt_limit_tag,
      schulessen_menge: this.schulessen_menge,
      schulessen_preis: this.schulessen_preis,
      obstbauer_menge: this.obstbauer_menge,
      obstbauer_preis: this.obstbauer_preis,
      baeckerei_preis_aufschlag: this.baeckerei_preis_aufschlag,
      baeckerei_preis_min: this.baeckerei_preis_min,
      baeckerei_preis_max: this.baeckerei_preis_max,
      baeckerei_menge_min: this.baeckerei_menge_min,
      baeckerei_menge_max: this.baeckerei_menge_max,
    };
  }
}
