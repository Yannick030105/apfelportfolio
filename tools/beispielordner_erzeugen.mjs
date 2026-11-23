#!/usr/bin/env node
/**
 * Erzeugt den Beispiel-Spielordner beispiel-spielordner/ (Dummy-Daten).
 *
 * Baut tools/beispielordner/eintrag.ts mit Vite fuer Node (gleiche Einstellungen
 * wie die App, z. B. Version aus package.json und ?raw-Importe), fuehrt ihn aus
 * und schreibt die Dateien. Vorhandene Spielstand-Dateien im Zielordner werden
 * vorher geloescht (nur Dateien, die dieses Skript selbst erzeugt).
 *
 *   npm run beispielordner              -> beispiel-spielordner/
 *   npm run beispielordner -- <ordner>  -> anderer Zielordner
 */
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ziel = resolve(process.argv[2] ?? join(wurzel, "beispiel-spielordner"));
const paket = JSON.parse(readFileSync(join(wurzel, "package.json"), "utf-8"));
const temp = mkdtempSync(join(tmpdir(), "beispielordner-"));

try {
  await build({
    configFile: false,
    root: wurzel,
    logLevel: "warn",
    define: { __APP_VERSION__: JSON.stringify(paket.version) },
    build: {
      ssr: join(wurzel, "tools/beispielordner/eintrag.ts"),
      outDir: temp,
      emptyOutDir: true,
      target: "node22",
      rollupOptions: { output: { entryFileNames: "eintrag.mjs" } },
    },
  });
  const { erzeuge_beispielordner } = await import(pathToFileURL(join(temp, "eintrag.mjs")).href);
  const dateien = erzeuge_beispielordner();

  const spielstaende = join(ziel, "spielstaende");
  mkdirSync(spielstaende, { recursive: true });
  for (const name of readdirSync(spielstaende)) {
    if (name.endsWith(".json")) rmSync(join(spielstaende, name));
  }
  for (const { pfad, text } of dateien) {
    writeFileSync(join(ziel, pfad), text, "utf-8");
  }
  const laufend = dateien.filter((d) => d.text.includes('"status": "laufend"')).length;
  console.log(`${dateien.length - 1} Spielstände (${laufend} laufend) + config.json geschrieben nach ${ziel}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
