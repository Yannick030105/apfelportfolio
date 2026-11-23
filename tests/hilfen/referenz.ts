/**
 * Gemeinsame Hilfen fuer die Referenztests: Typen des Referenzformats
 * (siehe tools/referenz_erzeugen.py) und Umwandlung der TS-Objekte in genau
 * diese Form (entspricht markt_dict, abrechnung_dict, ... im Generator).
 */
import type { RegelwerkFelder, Tagesabrechnung, Tageseinkauf, Tagesmarkt, Tagesnachfrage } from "../../src/domain/models";

export interface MarktRef {
  zufallspreis: number;
  preis_overrides: Record<string, number>;
  preis_importeur: number;
  preis_wochenmarkt: number;
  preis_baeckerei: number;
  preis_mosterei: number;
}

export interface NachfrageRef {
  schulessen: number;
  baeckerei_bestellt: number;
  gesamt: number;
}

export interface EinkaufRef {
  importeur_menge: number;
  wochenmarkt_menge: number;
  mosterei_menge: number;
  zukauf_gesamt: number;
}

export interface AbrechnungRef {
  tag: string;
  markt: MarktRef;
  einkauf: EinkaufRef;
  nachfrage: NachfrageRef;
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
  tagesergebnis: number;
}

export interface SchrittRef {
  tag_index: number;
  tag: string;
  eingabe: {
    w1: number;
    baeckerei_menge: number;
    ereignis_index?: number;
    ereignis_key?: string;
    zugestimmt?: boolean;
    einkauf: { importeur_menge: number; wochenmarkt_menge: number; mosterei_menge: number };
  };
  markt: MarktRef;
  nachfrage: NachfrageRef;
  kontext?: Record<string, unknown>;
  ui_grenzen: { importeur_max: number | null; wochenmarkt_max: number | null; mosterei_max: number | null };
  abrechnung?: AbrechnungRef;
  fehler?: string;
  zustand_danach: { portfoliostand: number; importeur_menge_woche: number };
}

export interface FallRef {
  name: string;
  beschreibung: string;
  regelwerk: RegelwerkFelder;
  schritte: SchrittRef[];
  woche: {
    anzahl_tage: number;
    ist_komplett: boolean;
    wochenergebnis: number;
    rest_long_short: number;
    log_zeile: Record<string, unknown> | null;
  };
}

export interface ReferenzDokument {
  format: string;
  formatVersion: number;
  level: number;
  art: string;
  anzahl_faelle: number;
  faelle: FallRef[];
}

export function markt_dict(m: Tagesmarkt): MarktRef {
  return {
    zufallspreis: m.zufallspreis,
    preis_overrides: { ...m.preis_overrides },
    preis_importeur: m.preis_importeur,
    preis_wochenmarkt: m.preis_wochenmarkt,
    preis_baeckerei: m.preis_baeckerei,
    preis_mosterei: m.preis_mosterei,
  };
}

export function nachfrage_dict(n: Tagesnachfrage): NachfrageRef {
  return { schulessen: n.schulessen, baeckerei_bestellt: n.baeckerei_bestellt, gesamt: n.gesamt };
}

export function einkauf_dict(e: Tageseinkauf): EinkaufRef {
  return {
    importeur_menge: e.importeur_menge,
    wochenmarkt_menge: e.wochenmarkt_menge,
    mosterei_menge: e.mosterei_menge,
    zukauf_gesamt: e.zukauf_gesamt,
  };
}

export function abrechnung_dict(a: Tagesabrechnung): AbrechnungRef {
  return {
    tag: a.tag,
    markt: markt_dict(a.markt),
    einkauf: einkauf_dict(a.einkauf),
    nachfrage: nachfrage_dict(a.nachfrage),
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
    tagesergebnis: a.tagesergebnis,
  };
}
