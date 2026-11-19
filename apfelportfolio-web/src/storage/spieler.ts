/**
 * Verwaltung der Spielernamen fuer das Player Ranking.
 *
 * Quelle (Python): src/apfelportfolio/data/players.py (1:1-Portierung).
 * Statt die CSV zu lesen, bekommen die Funktionen die Log-Zeilen (repository.ts).
 * Wie im Original gilt ein Name erst als vergeben, wenn mit ihm eine Woche
 * abgeschlossen wurde. Texte woertlich.
 */
import { pythonLen, pythonLower, pythonStrip } from "../domain/pythonString";
import { bekannte_spieler } from "./repository";
import type { LogZeile } from "./schema";

/** Liest alle bisher aufgetretenen Spielernamen eindeutig aus dem Log. */
export function get_existing_players(zeilen: readonly LogZeile[]): string[] {
  return bekannte_spieler(zeilen);
}

export function player_exists(name: string, zeilen: readonly LogZeile[]): boolean {
  const gesucht = pythonLower(pythonStrip(name));
  return get_existing_players(zeilen)
    .map((p) => pythonLower(p))
    .includes(gesucht);
}

/** Prueft einen neuen Spielernamen. Gibt [gueltig, Fehlermeldung] zurueck. */
export function validate_new_player_name(roh: string, zeilen: readonly LogZeile[]): [boolean, string] {
  const name = pythonStrip(roh);
  if (name === "") {
    return [false, "Bitte gib einen Namen ein."];
  }
  if (pythonLen(name) > 30) {
    return [false, "Der Name darf höchstens 30 Zeichen lang sein."];
  }
  if (player_exists(name, zeilen)) {
    return [false, "Dieser Name ist bereits vergeben. Bitte wähle einen anderen."];
  }
  return [true, ""];
}
