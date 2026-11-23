/**
 * Leiste mit dem Speicherort der Spielstaende (neu; im Original lag das Log
 * fest neben der EXE). Zeigt den Zustand und bietet die passenden Aktionen.
 */
import { useState } from "preact/hooks";
import type { Verbindung } from "../speicherVerbindung";
import { ordner_neu_waehlen, ordner_wieder_verbinden } from "../speicherVerbindung";
import { useSpielzustand } from "../zustandKontext";
import { Expander, Knopf } from "./streamlit";

export function SpeicherLeiste({ verbindung, neu_zeichnen }: { verbindung: Verbindung | null; neu_zeichnen: () => void }) {
  const z = useSpielzustand();
  const [fehler, setFehler] = useState<string | null>(null);

  const ausfuehren = (aktion: () => Promise<unknown>) => {
    setFehler(null);
    aktion()
      .catch((e: unknown) => setFehler((e as Error).message))
      .finally(neu_zeichnen);
  };

  if (verbindung === null) {
    return <div class="speicher-leiste">Speicherort wird geprüft …</div>;
  }

  const status = z.speicher_status;
  const datei = verbindung.datei;
  const meldungen = [...z.regelwerk_meldungen.fehler, ...z.regelwerk_meldungen.warnungen];

  return (
    <div class="speicher-leiste">
      {datei !== null ? (
        <>
          <span class={`status ${datei.ungesichert ? "warn" : "ok"}`}>
            {datei.ungesichert ? "⚠️ Ungesicherte Spielstände" : "💾 Spielstände im Browser"}
          </span>
          <span>Dieser Browser kann nicht direkt in einen Ordner speichern (Chrome oder Edge können das).</span>
          <label class="st-button" style={{ display: "inline-flex", alignItems: "center" }}>
            📂 Spielstände laden
            <input
              type="file"
              accept=".json,application/json"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const input = e.currentTarget as HTMLInputElement;
                const dateien = Array.from(input.files ?? []);
                input.value = "";
                ausfuehren(async () => {
                  const kaputt = await datei.dateien_einlesen(dateien);
                  await z.verbinde_speicher(datei);
                  if (kaputt.length > 0) setFehler(kaputt.map((k) => `${k.datei}: ${k.grund}`).join(" | "));
                });
              }}
            />
          </label>
          <Knopf onClick={() => ausfuehren(async () => datei.herunterladen())} disabled={!datei.ungesichert}>
            💾 Spielstände herunterladen
          </Knopf>
        </>
      ) : status.art === "verbunden" ? (
        <>
          <span class="status ok">💾 Spielordner: „{status.bezeichnung}“</span>
          <Knopf onClick={() => ausfuehren(() => ordner_neu_waehlen(z, verbindung))}>📁 Ordner wechseln</Knopf>
        </>
      ) : (
        <>
          <span class="status warn">⚠️ Kein Spielordner gewählt – der Fortschritt wird nicht gespeichert.</span>
          {verbindung.wartender_ordner !== null ? (
            <Knopf onClick={() => ausfuehren(() => ordner_wieder_verbinden(z, verbindung))}>
              🔄 Ordner „{verbindung.wartender_ordner.name}“ wieder verbinden
            </Knopf>
          ) : null}
          <Knopf onClick={() => ausfuehren(() => ordner_neu_waehlen(z, verbindung))}>📁 Spielordner wählen</Knopf>
        </>
      )}
      {status.art === "fehler" ? <span class="status fehler">Speicher nicht lesbar: {status.meldung}</span> : null}
      {z.speicherfehler !== null ? <span class="status fehler">{z.speicherfehler}</span> : null}
      {fehler !== null ? <span class="status fehler">{fehler}</span> : null}
      {z.fehlerhafte_dateien.length > 0 ? (
        <Expander titel={`${z.fehlerhafte_dateien.length} Spielstand-Datei(en) konnten nicht gelesen werden`}>
          <ul>
            {z.fehlerhafte_dateien.map((f) => (
              <li key={f.datei}>
                <b>{f.datei}</b>: {f.grund}
              </li>
            ))}
          </ul>
        </Expander>
      ) : null}
      {meldungen.length > 0 ? (
        <Expander titel={`Hinweise zum Regelwerk (config.json): ${meldungen.length}`}>
          <ul>
            {meldungen.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Expander>
      ) : null}
    </div>
  );
}
