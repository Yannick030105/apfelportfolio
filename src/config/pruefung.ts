/**
 * Prueft eine config.json (Regelwerk) und meldet Fehler verstaendlich.
 *
 * Quelle (Python): RegelwerkRepository.laden() in data/specs_repository.py und
 * Regelwerk.validiert() in domain/models.py.
 *
 * Verhalten wie im Original:
 *   - kein gueltiges JSON, kein Objekt oder unbekannte Einstellung
 *     (Python: JSONDecodeError / TypeError bei Regelwerk(**daten))
 *     -> es gelten die Standardwerte Regelwerk()
 *   - fehlende Einstellungen -> Standardwert fuer dieses Feld (Dataclass-Default)
 *   - Werte, die validiert() ablehnen wuerde, werden beim Laden NICHT abgelehnt
 *     (das Original prueft erst beim Speichern auf der Regelwerk-Seite)
 * Neu: Jeder dieser Faelle wird als Fehler bzw. Warnung im Klartext gemeldet,
 * statt still zu passieren. Abweichung: Werte, die keine Zahl sind (z. B. "300"
 * als Text), fuehren hier zu den Standardwerten - im Original waeren sie
 * uebernommen worden und das Spiel spaeter abgestuerzt.
 */
import { ValueError } from "../domain/fehler";
import { Regelwerk, REGELWERK_STANDARD, type RegelwerkFelder } from "../domain/models";
import { pythonIntText, pythonRepr } from "../domain/pythonText";

export interface Pruefergebnis {
  regelwerk: Regelwerk;
  /** Gruende, weshalb die Datei verworfen wurde (dann gelten die Standardwerte) */
  fehler: string[];
  /** Hinweise; die Werte der Datei werden trotzdem verwendet */
  warnungen: string[];
}

const BESCHRIFTUNG: Readonly<Record<keyof RegelwerkFelder, string>> = {
  importeur_limit: "Importeur-Obergrenze",
  wochenmarkt_limit_tag: "Wochenmarkt-Limit pro Tag",
  schulessen_menge: "Schulessen-Menge",
  schulessen_preis: "Schulessen-Preis",
  obstbauer_menge: "Obstbauer-Menge",
  obstbauer_preis: "Obstbauer-Preis",
  baeckerei_preis_aufschlag: "Bäckerei-Preisaufschlag",
  baeckerei_preis_min: "W1-Minimum",
  baeckerei_preis_max: "W1-Maximum",
  baeckerei_menge_min: "Bäckerei-Mengenminimum",
  baeckerei_menge_max: "Bäckerei-Mengenmaximum",
};

const FELDER = Object.keys(REGELWERK_STANDARD) as (keyof RegelwerkFelder)[];

function standard(fehler: string[]): Pruefergebnis {
  return { regelwerk: new Regelwerk(), fehler, warnungen: [] };
}

function zahlText(x: number): string {
  return Number.isInteger(x) ? pythonIntText(x) : pythonRepr(x);
}

export function pruefe_regelwerk_daten(daten: unknown, quelle = "config.json"): Pruefergebnis {
  if (typeof daten !== "object" || daten === null || Array.isArray(daten)) {
    return standard([`${quelle}: Die Datei muss ein JSON-Objekt sein, z. B. { "importeur_limit": 300 }.`]);
  }
  const roh = daten as Record<string, unknown>;
  const fehler: string[] = [];
  for (const schluessel of Object.keys(roh)) {
    if (!(FELDER as string[]).includes(schluessel)) {
      fehler.push(`${quelle}: Unbekannte Einstellung "${schluessel}". Erlaubt sind: ${FELDER.join(", ")}.`);
    }
  }
  for (const feld of FELDER) {
    const wert = roh[feld];
    if (wert !== undefined && (typeof wert !== "number" || !Number.isFinite(wert))) {
      fehler.push(`${quelle}: "${feld}" (${BESCHRIFTUNG[feld]}) muss eine Zahl sein, gefunden: ${JSON.stringify(wert)}.`);
    }
  }
  if (fehler.length > 0) {
    return standard([...fehler, "Es gelten die Standardwerte."]);
  }

  const warnungen: string[] = [];
  const werte: Partial<RegelwerkFelder> = {};
  for (const feld of FELDER) {
    const wert = roh[feld];
    if (wert === undefined) {
      warnungen.push(
        `${quelle}: "${feld}" (${BESCHRIFTUNG[feld]}) fehlt – Standardwert ${zahlText(REGELWERK_STANDARD[feld])} wird verwendet.`,
      );
    } else {
      werte[feld] = wert as number;
    }
  }
  const regelwerk = new Regelwerk(werte);
  try {
    new Regelwerk(werte).validiert();
  } catch (e) {
    const hinweis = e instanceof ValueError ? e.hinweis : (e as Error).message;
    warnungen.push(`${quelle}: ${hinweis} Die Werte werden trotzdem verwendet – bitte auf der Seite ⚙️ Regelwerk korrigieren.`);
  }
  return { regelwerk, fehler: [], warnungen };
}

export function pruefe_regelwerk_text(text: string, quelle = "config.json"): Pruefergebnis {
  let daten: unknown;
  try {
    daten = JSON.parse(text);
  } catch (e) {
    return standard([`${quelle}: enthält kein gültiges JSON (${(e as Error).message}). Es gelten die Standardwerte.`]);
  }
  return pruefe_regelwerk_daten(daten, quelle);
}
