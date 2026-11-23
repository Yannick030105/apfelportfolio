/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import paket from "./package.json" with { type: "json" };

export default defineConfig({
  // Relative Pfade: die fertige Datei wird per Doppelklick (file://) geoeffnet.
  base: "./",
  plugins: [viteSingleFile()],
  define: {
    __APP_VERSION__: JSON.stringify(paket.version),
  },
  // JSX fuer Preact ohne zusaetzliches Plugin (Vite 8 transformiert mit Oxc).
  oxc: {
    jsx: { runtime: "automatic", importSource: "preact" },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
