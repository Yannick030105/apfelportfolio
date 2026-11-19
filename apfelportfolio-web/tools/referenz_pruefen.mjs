#!/usr/bin/env node
/**
 * Prueft, dass tests/referenz/ unveraendert ist.
 *
 * 1. Jede Datei in tests/referenz/ muss mit der SHA-256-Pruefsumme aus
 *    tools/referenz.sha256 uebereinstimmen; es darf keine Datei fehlen oder
 *    hinzukommen. (Format kompatibel zu `sha256sum -c`.)
 * 2. Ist die Umgebungsvariable REFERENZ_BASIS_SHA gesetzt (in CI: Basis-Commit
 *    des Merge Requests bzw. vorheriger Commit), darf sich seit diesem Commit
 *    weder tests/referenz/ noch tools/referenz.sha256 geaendert, geloescht oder
 *    umbenannt worden sein - damit faellt auch auf, wenn jemand Referenzdaten UND
 *    Pruefsummen zusammen aendert. Reines Hinzufuegen wird hier nicht gemeldet
 *    (erstmaliges Einchecken); eine neue Referenzdatei faellt trotzdem auf, weil
 *    sie dafuer in die bestehende Pruefsummenliste eingetragen werden muesste.
 *
 * Aufruf: npm run pruefen:referenz   (Exit-Code 0 = unveraendert)
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const referenzOrdner = join(wurzel, "tests", "referenz");
const manifestPfad = join(wurzel, "tools", "referenz.sha256");

const fehler = [];

const erwartet = new Map();
for (const zeile of readFileSync(manifestPfad, "utf-8").split("\n")) {
  if (zeile.trim() === "") continue;
  const treffer = /^([0-9a-f]{64}) [ *](.+)$/.exec(zeile);
  if (treffer === null) {
    fehler.push(`Ungueltige Zeile in tools/referenz.sha256: ${zeile}`);
    continue;
  }
  erwartet.set(treffer[2], treffer[1]);
}

const vorhanden = readdirSync(referenzOrdner).filter((name) => !name.startsWith("."));
for (const name of vorhanden) {
  const soll = erwartet.get(name);
  if (soll === undefined) {
    fehler.push(`Neue, nicht registrierte Datei: tests/referenz/${name}`);
    continue;
  }
  const ist = createHash("sha256").update(readFileSync(join(referenzOrdner, name))).digest("hex");
  if (ist !== soll) fehler.push(`Geaendert: tests/referenz/${name}`);
}
for (const name of erwartet.keys()) {
  if (!vorhanden.includes(name)) fehler.push(`Fehlt: tests/referenz/${name}`);
}

const basis = process.env.REFERENZ_BASIS_SHA?.trim();
if (basis && !/^0+$/.test(basis)) {
  const pfade = [relative(process.cwd(), referenzOrdner), relative(process.cwd(), manifestPfad)];
  try {
    const diff = execFileSync("git", ["diff", "--name-status", "--diff-filter=MDRT", basis, "HEAD", "--", ...pfade], {
      encoding: "utf-8",
    }).trim();
    if (diff !== "") fehler.push(`Seit ${basis} geaendert:\n  ${diff.split("\n").join("\n  ")}`);
  } catch (e) {
    fehler.push(`Git-Vergleich mit ${basis} nicht moeglich: ${e.message}`);
  }
}

if (fehler.length > 0) {
  console.error("tests/referenz/ wurde veraendert - das ist nicht erlaubt (siehe CLAUDE.md):");
  for (const f of fehler) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`tests/referenz/ unveraendert (${vorhanden.length} Dateien geprueft${basis ? `, Git-Basis ${basis}` : ""}).`);
