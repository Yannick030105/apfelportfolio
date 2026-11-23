/**
 * Liest das Regelwerk: vom Laufwerk (config.json im gewaehlten Ordner) oder
 * die eingebauten Standardwerte (config/config.json, beim Build eingebettet).
 *
 * Quelle (Python): data/specs_repository.py (RegelwerkRepository) und app.py
 * (st.session_state.regelwerk = RegelwerkRepository().laden()).
 *
 * Entsprechung: Im Original lag config/config.json neben der EXE; wer sie
 * bearbeitete, aenderte das Regelwerk. Hier ist diese Datei eingebaut, und eine
 * config.json im gemeinsamen Ordner ersetzt sie (die Regelwerk-Seite schreibt
 * genau diese Datei).
 */
import eingebauteKonfiguration from "../../config/config.json";
import { Regelwerk } from "../domain/models";
import type { Speicher } from "../storage/speicher";
import { pruefe_regelwerk_daten, pruefe_regelwerk_text } from "./pruefung";

export type RegelwerkQuelle = "laufwerk" | "eingebaut" | "standardwerte";

export interface RegelwerkLadeergebnis {
  regelwerk: Regelwerk;
  quelle: RegelwerkQuelle;
  fehler: string[];
  warnungen: string[];
}

/** Die eingebaute config/config.json (wie die config.json neben der alten EXE). */
export function eingebautes_regelwerk(): Regelwerk {
  const ergebnis = pruefe_regelwerk_daten(eingebauteKonfiguration, "eingebaute config.json");
  if (ergebnis.fehler.length > 0) {
    // Nur bei fehlerhaftem Build denkbar; Tests sichern die Datei ab.
    throw new Error(ergebnis.fehler.join(" "));
  }
  return ergebnis.regelwerk;
}

export async function lade_regelwerk(speicher: Speicher | null): Promise<RegelwerkLadeergebnis> {
  if (speicher !== null) {
    let text: string | null;
    try {
      text = await speicher.lade_konfiguration();
    } catch (e) {
      return {
        regelwerk: eingebautes_regelwerk(),
        quelle: "eingebaut",
        fehler: [`config.json konnte nicht gelesen werden (${(e as Error).message}). Es gilt das eingebaute Regelwerk.`],
        warnungen: [],
      };
    }
    if (text !== null) {
      const ergebnis = pruefe_regelwerk_text(text, `config.json (${speicher.bezeichnung})`);
      return {
        regelwerk: ergebnis.regelwerk,
        quelle: ergebnis.fehler.length > 0 ? "standardwerte" : "laufwerk",
        fehler: ergebnis.fehler,
        warnungen: ergebnis.warnungen,
      };
    }
  }
  return { regelwerk: eingebautes_regelwerk(), quelle: "eingebaut", fehler: [], warnungen: [] };
}

/** Python: json.dumps(asdict(regelwerk), indent=2) */
export function regelwerk_als_text(regelwerk: Regelwerk): string {
  return JSON.stringify(regelwerk.als_dict(), null, 2);
}

/** Wie die Regelwerk-Seite: erst validiert() (wirft ValueError), dann speichern. */
export async function speichere_regelwerk(speicher: Speicher, regelwerk: Regelwerk): Promise<void> {
  regelwerk.validiert();
  await speicher.speichere_konfiguration(regelwerk_als_text(regelwerk));
}
