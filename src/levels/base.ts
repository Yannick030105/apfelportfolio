/**
 * Abstrakte Basisklasse fuer rundenbasierte Level.
 *
 * Quelle (Python): src/apfelportfolio/levels/base.py (1:1-Portierung).
 *
 * Hinweis: Level 1 und Level 2 erben im Original NICHT von dieser Klasse - sie
 * arbeiten tageweise mit eigener Schnittstelle (siehe MIGRATION_NOTES,
 * Auffaelligkeiten). Die Klasse wird trotzdem unveraendert portiert. Die
 * gemeinsame Schnittstelle fuer die Level-Registry (src/levels/registry.ts)
 * entsteht in Phase 3, wenn beide Tages-Level vorliegen.
 */
import {
  Bilanzkreis,
  Rundenergebnis,
  type Bedarf,
  type Beschaffungsentscheidung,
  type Kostenaufstellung,
  type Marktpreise,
  type Quellentyp,
} from "../domain/models";

/** Gemeinsames Interface aller Spiel-Level (rundenbasiert). */
export abstract class Level {
  abstract readonly nummer: number;
  abstract readonly titel: string;

  /** Welche Bezugsquellen sind in diesem Level aktiv. */
  abstract verfuegbare_quellen(): Quellentyp[];

  /** Text fuer die in diesem Level neu eingefuehrte Entscheidungsachse. */
  abstract neue_achse_beschreibung(): string;

  /** Preise fuer die aktuelle Runde erzeugen (ggf. mit Zufall). */
  abstract erzeuge_marktpreise(): Marktpreise;

  /** Bedarf (Absatz) der aktuellen Runde erzeugen. */
  abstract erzeuge_bedarf(): Bedarf;

  /** Rest Long/Short = Beschaffung minus Bedarf (Basislogik, ueberschreibbar). */
  berechne_bilanzkreis(entscheidung: Beschaffungsentscheidung, bedarf: Bedarf): Bilanzkreis {
    return new Bilanzkreis({ saldo: entscheidung.gesamtmenge - bedarf.menge });
  }

  /** Levelspezifische Kostenlogik (z.B. ab Level 4 Bilanzkreis-Strafgebuehr). */
  abstract berechne_kosten(
    entscheidung: Beschaffungsentscheidung,
    preise: Marktpreise,
    bilanzkreis: Bilanzkreis,
    bedarf: Bedarf,
  ): Kostenaufstellung;

  /**
   * Referenzkosten, wenn der Spieler den gesamten Bedarf ueber die
   * teuerste verfuegbare Quelle deckt (Baseline fuer Leit-KPI).
   */
  berechne_referenz_nichthandeln(preise: Marktpreise, bedarf: Bedarf): number {
    return bedarf.menge * preise.spotmarkt_preis;
  }

  /** Orchestriert eine komplette Runde. Wird von der UI aufgerufen. */
  spiele_runde(runde: number, entscheidung: Beschaffungsentscheidung): Rundenergebnis {
    const preise = this.erzeuge_marktpreise();
    const bedarf = this.erzeuge_bedarf();
    const bilanzkreis = this.berechne_bilanzkreis(entscheidung, bedarf);
    const kosten = this.berechne_kosten(entscheidung, preise, bilanzkreis, bedarf);
    const referenz = this.berechne_referenz_nichthandeln(preise, bedarf);
    return new Rundenergebnis({
      level: this.nummer,
      runde,
      entscheidung,
      bedarf,
      bilanzkreis,
      kosten,
      referenzkosten_nichthandeln: referenz,
    });
  }
}
