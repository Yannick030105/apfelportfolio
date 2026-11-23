/**
 * Auswertung des zentralen Logs - statt einer CSV-Datei aus den Spielstand-Dateien.
 *
 * Quelle (Python): src/apfelportfolio/data/repository.py (LogRepository).
 *   alle_laden()       -> log_zeilen(spielstaende)
 *   fuer_level(level)  -> fuer_level(zeilen, level)
 *   bekannte_spieler() -> bekannte_spieler(zeilen)
 *   fuer_spieler(name) -> fuer_spieler(zeilen, name)
 *   anhaengen(zeile)   -> entfaellt; die Log-Zeile steckt in der abgeschlossenen
 *                         Spielstand-Datei (siehe schema.ts) und wird ueber den
 *                         Speicher (speicher.ts) geschrieben.
 *
 * Reihenfolge wie die Zeilen der CSV (Anhaengen = chronologisch): zuerst die aus
 * spiellog.csv migrierten Wochen in Original-Zeilenfolge, danach alle anderen
 * nach Abschlusszeitpunkt (bei Gleichstand nach id).
 */
import { pythonSortiert, pythonStringVergleich } from "../domain/pythonString";
import { log_zeile_aus_daten, type LogZeile, type Spielstand } from "./schema";

function sortierschluessel(a: Spielstand, b: Spielstand): number {
  const ma = a.migriert;
  const mb = b.migriert;
  if (ma !== null && mb !== null) return ma.zeile - mb.zeile;
  if (ma !== null) return -1;
  if (mb !== null) return 1;
  const za = a.abgeschlossen_am ?? "";
  const zb = b.abgeschlossen_am ?? "";
  if (za !== zb) return za < zb ? -1 : 1;
  return pythonStringVergleich(a.id, b.id);
}

/** Python: LogRepository.alle_laden() - alle abgeschlossenen Wochen als Log-Zeilen. */
export function log_zeilen(spielstaende: readonly Spielstand[]): LogZeile[] {
  return spielstaende
    .filter((s) => s.status === "abgeschlossen" && s.log_zeile !== null)
    .sort(sortierschluessel)
    .map((s) => log_zeile_aus_daten(s.log_zeile as NonNullable<Spielstand["log_zeile"]>));
}

/** Nur Durchlaeufe eines Levels - Vergleiche gelten nur pro Level. */
export function fuer_level(zeilen: readonly LogZeile[], level: number): LogZeile[] {
  return zeilen.filter((z) => z.level === level);
}

/** Eindeutige, sortierte Liste aller bisher aufgetretenen Spielernamen. */
export function bekannte_spieler(zeilen: readonly LogZeile[]): string[] {
  return pythonSortiert([...new Set(zeilen.map((z) => z.spieler))]);
}

/** Nur Durchlaeufe eines bestimmten Spielers (exakter Vergleich wie df["spieler"] == spieler). */
export function fuer_spieler(zeilen: readonly LogZeile[], spieler: string): LogZeile[] {
  return zeilen.filter((z) => z.spieler === spieler);
}
