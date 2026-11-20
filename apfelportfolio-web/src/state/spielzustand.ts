/**
 * Spielzustand der laufenden Sitzung - ersetzt st.session_state.
 *
 * Quelle (Python): st.session_state in app.py, ui/pages/1_spielen.py und
 * ui/pages/level_2.py (current_player, regelwerk, level1/level2, woche,
 * tag_index, tagesmarkt/-nachfrage/-ereignis, ereignis_zugestimmt,
 * preishistorie_l1/_l2) sowie die Funktionen _init_session_state,
 * _neue_woche_starten, _neuen_tag_ziehen und _tag_abschliessen.
 *
 * Unterschiede zum Original (MIGRATION_NOTES, Abweichungen):
 *   - Je Spieler und Level eine eigene Wochen-Sitzung (im Original teilten sich
 *     beide Level-Seiten und alle Spieler dieselben Session-Schluessel).
 *   - Jede Woche ist ein Spielstand und wird nach jedem Tag gespeichert; eine
 *     laufende Woche wird beim naechsten Oeffnen fortgesetzt.
 * Keine Spiellogik hier - gerechnet wird ausschliesslich in src/levels/.
 */
import { lade_regelwerk, eingebautes_regelwerk, type RegelwerkQuelle } from "../config/laden";
import { ValueError } from "../domain/fehler";
import { Regelwerk, Tageseinkauf, Wochenverlauf, type Tagesmarkt } from "../domain/models";
import { zufallsWuerfel, type Wuerfelquelle } from "../domain/wuerfel";
import { finde_level, LEVEL_REGISTRY, type LevelEintrag, type LevelId, type SpielLevel, type Tageslage, type TagesWuerfe } from "../levels/registry";
import { WOCHENTAGE } from "../levels/level1Grundlast";
import { log_zeilen } from "../storage/repository";
import {
  abrechnung_als_daten,
  abrechnung_aus_daten,
  als_abgeschlossen,
  mit_abgeschlossenem_tag,
  mit_offenem_tag,
  neuer_spielstand,
  type LogZeile,
  type Spielstand,
} from "../storage/schema";
import type { FehlerhafteDatei, Speicher } from "../storage/speicher";

/** Zustand EINER Spielwoche eines Levels (entspricht den Session-Schluesseln einer Level-Seite). */
export interface LevelSitzung {
  readonly levelId: LevelId;
  readonly eintrag: LevelEintrag;
  /** st.session_state.level1 / level2 (einmal je Sitzung erzeugt, mit dem damaligen Regelwerk) */
  readonly level: SpielLevel;
  woche: Wochenverlauf;
  tag_index: number;
  /** tagesmarkt/tagesnachfrage/tagesereignis als Wuerfelwerte; null = noch nicht gezogen */
  wuerfe: TagesWuerfe | null;
  ereignis_zugestimmt: boolean;
  /** preishistorie_l1 / preishistorie_l2 (rein fuer Trendpfeile) */
  preishistorie: Tagesmarkt[];
  spielstand: Spielstand;
  /** Meldung einer ValueError aus "Handel abschliessen" (Streamlit: Fehlerkasten) */
  fehler: string | null;
}

export type SpeicherStatus =
  | { art: "keiner" }
  | { art: "verbunden"; bezeichnung: string }
  | { art: "fehler"; meldung: string };

export interface SpielzustandOptionen {
  wuerfel?: Wuerfelquelle;
  jetzt?: () => Date;
}

export class Spielzustand {
  /** st.session_state["current_player"] */
  spieler: string | null = null;
  /** st.session_state.regelwerk */
  regelwerk: Regelwerk = eingebautes_regelwerk();
  regelwerk_quelle: RegelwerkQuelle = "eingebaut";
  regelwerk_meldungen: { fehler: string[]; warnungen: string[] } = { fehler: [], warnungen: [] };

  speicher: Speicher | null = null;
  speicher_status: SpeicherStatus = { art: "keiner" };
  /** letzte Fehlermeldung beim Speichern (Spiel laeuft weiter, naechster Versuch beim naechsten Tag) */
  speicherfehler: string | null = null;
  spielstaende: Spielstand[] = [];
  fehlerhafte_dateien: FehlerhafteDatei[] = [];

  private readonly sitzungen = new Map<string, LevelSitzung>();
  private readonly zuhoerer = new Set<() => void>();
  private readonly wuerfel: Wuerfelquelle;
  private readonly jetzt: () => Date;
  private version = 0;

  constructor(optionen: SpielzustandOptionen = {}) {
    this.wuerfel = optionen.wuerfel ?? zufallsWuerfel;
    this.jetzt = optionen.jetzt ?? (() => new Date());
  }

  // -- Beobachten (fuer die Oberflaeche) ------------------------------------
  abonniere(f: () => void): () => void {
    this.zuhoerer.add(f);
    return () => this.zuhoerer.delete(f);
  }

  /** Aendert sich bei jeder Zustandsaenderung (fuer Preact-Neuzeichnen). */
  get stand(): number {
    return this.version;
  }

  private melde(): void {
    this.version += 1;
    for (const f of this.zuhoerer) f();
  }

  // -- Speicher und Regelwerk -------------------------------------------------
  /** Verbindet einen Speicher: laedt Regelwerk (config.json) und alle Spielstaende. */
  async verbinde_speicher(speicher: Speicher): Promise<void> {
    this.speicher = speicher;
    try {
      const rw = await lade_regelwerk(speicher);
      this.regelwerk = rw.regelwerk;
      this.regelwerk_quelle = rw.quelle;
      this.regelwerk_meldungen = { fehler: rw.fehler, warnungen: rw.warnungen };
      await this.lade_spielstaende();
      this.speicher_status = { art: "verbunden", bezeichnung: speicher.bezeichnung };
    } catch (e) {
      this.speicher_status = { art: "fehler", meldung: (e as Error).message };
    }
    this.melde();
  }

  async lade_spielstaende(): Promise<void> {
    if (this.speicher === null) return;
    const { spielstaende, fehlerhaft } = await this.speicher.lade_alle();
    // Eigene, noch nicht gespeicherte Staende der Sitzung behalten
    const eigene = [...this.sitzungen.values()].map((s) => s.spielstand);
    const ids = new Set(spielstaende.map((s) => s.id));
    this.spielstaende = [...spielstaende, ...eigene.filter((s) => !ids.has(s.id))];
    this.fehlerhafte_dateien = fehlerhaft;
    this.melde();
  }

  /** Python: LogRepository().alle_laden() */
  log_zeilen(): LogZeile[] {
    return log_zeilen(this.spielstaende);
  }

  // -- Spieler ----------------------------------------------------------------
  waehle_spieler(name: string): void {
    this.spieler = name;
    this.melde();
  }

  // -- Level-Sitzungen ----------------------------------------------------------
  private schluessel(levelId: LevelId): string {
    return JSON.stringify([this.spieler, levelId]);
  }

  /**
   * Python: Seitenaufruf mit _init_session_state() und dem Ziehen des Tages
   * ("if tagesmarkt is None" bzw. "if tagesereignis is None"). Eine laufende
   * gespeicherte Woche des Spielers wird fortgesetzt.
   */
  sitzung(levelId: LevelId): LevelSitzung {
    if (this.spieler === null) {
      throw new Error("Bitte wähle zuerst auf der Startseite einen Spieler aus.");
    }
    const schluessel = this.schluessel(levelId);
    let sitzung = this.sitzungen.get(schluessel);
    if (sitzung === undefined) {
      sitzung = this.fortsetzen(levelId, this.spieler) ?? this.neue_sitzung(levelId, this.spieler);
      this.sitzungen.set(schluessel, sitzung);
      if (this.ziehe_tag_falls_noetig(sitzung)) void this.speichere(sitzung);
    }
    return sitzung;
  }

  /** Tageslage fuer die Anzeige (bei jedem Durchlauf neu, wie der Tageskontext in level_2.py). */
  lage(sitzung: LevelSitzung): Tageslage | null {
    if (sitzung.wuerfe === null || sitzung.tag_index >= WOCHENTAGE.length) return null;
    return sitzung.level.bereite_tag_vor(sitzung.tag_index, sitzung.wuerfe, sitzung.ereignis_zugestimmt);
  }

  private neue_sitzung(levelId: LevelId, spieler: string): LevelSitzung {
    const eintrag = finde_level(levelId);
    const level = eintrag.erzeuge(this.regelwerk);
    return {
      levelId,
      eintrag,
      level,
      woche: new Wochenverlauf({ level: level.nummer }),
      tag_index: 0,
      wuerfe: null,
      ereignis_zugestimmt: false,
      preishistorie: [],
      spielstand: this.neuer_stand(spieler, eintrag, level),
      fehler: null,
    };
  }

  private neuer_stand(spieler: string, eintrag: LevelEintrag, level: SpielLevel): Spielstand {
    return neuer_spielstand({
      spieler,
      levelId: eintrag.id,
      level: eintrag.nummer,
      regelwerk: level.regelwerk.als_dict(),
      jetzt: this.jetzt(),
    });
  }

  /** Neueste laufende Woche des Spielers fuer dieses Level fortsetzen. */
  private fortsetzen(levelId: LevelId, spieler: string): LevelSitzung | null {
    const kandidaten = this.spielstaende
      .filter((s) => s.status === "laufend" && s.spieler === spieler && s.levelId === levelId)
      .sort((a, b) => ((a.gestartet_am ?? "") < (b.gestartet_am ?? "") ? 1 : -1));
    const stand = kandidaten[0];
    if (stand === undefined || stand.regelwerk === null || stand.zustand === null) return null;
    const eintrag = finde_level(levelId);
    const level = eintrag.erzeuge(new Regelwerk(stand.regelwerk));
    level.setze_zustand(stand.zustand);
    const tage = stand.tage.map((t) => abrechnung_aus_daten(t.abrechnung));
    return {
      levelId,
      eintrag,
      level,
      woche: new Wochenverlauf({ level: level.nummer, tage }),
      tag_index: tage.length,
      wuerfe: stand.offener_tag?.wuerfe ?? null,
      ereignis_zugestimmt: stand.offener_tag?.zugestimmt ?? false,
      preishistorie: tage.map((t) => t.markt),
      spielstand: stand,
      fehler: null,
    };
  }

  /** Zieht den Tag, falls noetig (ohne zu speichern). true = es wurde gezogen. */
  private ziehe_tag_falls_noetig(sitzung: LevelSitzung): boolean {
    if (sitzung.wuerfe !== null || sitzung.tag_index >= WOCHENTAGE.length) return false;
    sitzung.wuerfe = sitzung.level.wuerfle_tag(this.wuerfel);
    sitzung.ereignis_zugestimmt = false;
    sitzung.spielstand = mit_offenem_tag(sitzung.spielstand, {
      tag_index: sitzung.tag_index,
      wuerfe: sitzung.wuerfe,
      zugestimmt: false,
    });
    return true;
  }

  // -- Aktionen der Spielseite ----------------------------------------------------
  /** st.toggle(ereignis.entscheidung_text) */
  setze_zustimmung(levelId: LevelId, wert: boolean): void {
    const sitzung = this.sitzung(levelId);
    sitzung.ereignis_zugestimmt = wert;
    sitzung.fehler = null;
    if (sitzung.wuerfe !== null) {
      sitzung.spielstand = mit_offenem_tag(sitzung.spielstand, {
        tag_index: sitzung.tag_index,
        wuerfe: sitzung.wuerfe,
        zugestimmt: wert,
      });
      void this.speichere(sitzung);
    }
    this.melde();
  }

  /** Jede andere Eingabe startet in Streamlit einen neuen Durchlauf - der Fehlerkasten verschwindet. */
  verwerfe_fehler(levelId: LevelId): void {
    const sitzung = this.sitzung(levelId);
    if (sitzung.fehler !== null) {
      sitzung.fehler = null;
      this.melde();
    }
  }

  /** Python: _tag_abschliessen(...) (Klick auf "Handel abschliessen"). */
  async schliesse_tag_ab(
    levelId: LevelId,
    mengen: { importeur_menge: number; wochenmarkt_menge: number; mosterei_menge: number },
  ): Promise<void> {
    const sitzung = this.sitzung(levelId);
    const lage = this.lage(sitzung);
    if (lage === null) return;
    const einkauf = new Tageseinkauf(mengen);
    // Wie im Original: Markt VOR der Abrechnung in die Preishistorie (auch wenn sie scheitert).
    sitzung.preishistorie.push(lage.markt);

    let abrechnung;
    try {
      abrechnung = sitzung.level.rechne_tag_ab(lage, einkauf);
    } catch (e) {
      if (!(e instanceof ValueError)) throw e;
      sitzung.fehler = e.message; // Streamlit: Fehlerkasten, Tag bleibt offen
      this.melde();
      return;
    }
    sitzung.fehler = null;
    sitzung.woche.tage.push(abrechnung);
    sitzung.spielstand = mit_abgeschlossenem_tag(
      sitzung.spielstand,
      {
        tag_index: lage.tag_index,
        tag: lage.tag,
        wuerfe: sitzung.wuerfe as TagesWuerfe,
        zugestimmt: lage.zugestimmt,
        einkauf: { ...mengen },
        abrechnung: abrechnung_als_daten(abrechnung),
      },
      { portfoliostand: sitzung.level.portfoliostand, importeur_menge_woche: sitzung.level.importeur_menge_woche },
    );
    sitzung.tag_index += 1;
    sitzung.wuerfe = null;
    sitzung.ereignis_zugestimmt = false;
    if (sitzung.woche.ist_komplett) {
      sitzung.spielstand = als_abgeschlossen(sitzung.spielstand, sitzung.woche, this.jetzt());
    }
    this.ziehe_tag_falls_noetig(sitzung); // naechster Tag wird gleich mitgespeichert
    await this.speichere(sitzung);
    this.melde();
  }

  /** Python: _neue_woche_starten() (Klick auf "Neue Woche starten"). */
  async neue_woche(levelId: LevelId): Promise<void> {
    const sitzung = this.sitzung(levelId);
    sitzung.level.neue_woche(); // Level 1: Felder zuruecksetzen, Level 2: zuruecksetzen()
    sitzung.woche = new Wochenverlauf({ level: sitzung.level.nummer });
    sitzung.tag_index = 0;
    sitzung.wuerfe = null;
    sitzung.ereignis_zugestimmt = false;
    sitzung.preishistorie = [];
    sitzung.fehler = null;
    sitzung.spielstand = this.neuer_stand(sitzung.spielstand.spieler, sitzung.eintrag, sitzung.level);
    this.ziehe_tag_falls_noetig(sitzung);
    await this.speichere(sitzung);
    this.melde();
  }

  // -- Speichern ---------------------------------------------------------------------
  private speicherkette: Promise<void> = Promise.resolve();

  /** Schreibt den aktuellen Stand; Schreibvorgaenge laufen strikt nacheinander. */
  private speichere(sitzung: LevelSitzung): Promise<void> {
    const stand = sitzung.spielstand;
    this.spielstaende = [...this.spielstaende.filter((s) => s.id !== stand.id), stand];
    const speicher = this.speicher;
    if (speicher === null) return this.speicherkette;
    this.speicherkette = this.speicherkette.then(async () => {
      try {
        await speicher.speichere(stand);
        this.speicherfehler = null;
      } catch (e) {
        this.speicherfehler = `Spielstand konnte nicht gespeichert werden: ${(e as Error).message}`;
      }
      this.melde();
    });
    return this.speicherkette;
  }

  /** Wartet, bis alle angestossenen Schreibvorgaenge erledigt sind. */
  gespeichert(): Promise<void> {
    return this.speicherkette;
  }

  /** Fuer Tests/Anzeige: alle registrierten Level. */
  static get level_ids(): LevelId[] {
    return LEVEL_REGISTRY.map((e) => e.id);
  }
}
