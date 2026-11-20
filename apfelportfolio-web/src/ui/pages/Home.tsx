/**
 * Startseite.
 *
 * Quelle (Python): src/apfelportfolio/ui/pages/home.py
 * Wird vollstaendig portiert in: Phase 6, Durchlauf "Home" (Reihenfolge:
 * Spielen, Ranking, Dashboard, Home, ...).
 *
 * VORLAEUFIG: Bis dahin nur die Spielerauswahl, damit die Spielseite benutzbar
 * ist. Texte und Pruefung aus render_player_selector() in ui/components.py
 * (dort vorhanden, im Original aber nicht eingebunden) bzw. data/players.py.
 */
import { useState } from "preact/hooks";
import { get_existing_players, validate_new_player_name } from "../../storage/spieler";
import { pythonStrip } from "../../domain/pythonString";
import { useSpielzustand } from "../zustandKontext";
import { Knopf, Meldung } from "../components/streamlit";

export function Home() {
  const z = useSpielzustand();
  const [modus, setModus] = useState<"vorhanden" | "neu">("vorhanden");
  const [auswahl, setAuswahl] = useState<string | null>(null);
  const [neuerName, setNeuerName] = useState("");
  const zeilen = z.log_zeilen();
  const vorhandene = get_existing_players(zeilen);
  const gewaehlt = auswahl ?? vorhandene[0] ?? null;
  const [gueltig, fehler] = neuerName !== "" ? validate_new_player_name(neuerName, zeilen) : [false, ""];

  return (
    <>
      <div class="platzhalter">
        <p class="st-klein">Vorläufige Startseite – die vollständige Startseite folgt in einem späteren Durchlauf von Phase 6.</p>
        <h3 style={{ margin: "0 0 0.5rem", color: "#8a4b0f" }}>🍎 Wer spielt heute?</h3>
        <div class="feld" role="radiogroup" aria-label="Auswahl">
          <label>
            <input type="radio" name="modus" checked={modus === "vorhanden"} onChange={() => setModus("vorhanden")} /> Vorhandenen Spieler wählen
          </label>
          <label>
            <input type="radio" name="modus" checked={modus === "neu"} onChange={() => setModus("neu")} /> Neuen Spieler anlegen
          </label>
        </div>
        {modus === "vorhanden" ? (
          vorhandene.length > 0 ? (
            <div class="feld">
              <label>
                Spieler{" "}
                <select value={gewaehlt ?? ""} onChange={(e) => setAuswahl((e.currentTarget as HTMLSelectElement).value)}>
                  {vorhandene.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <Knopf onClick={() => gewaehlt !== null && z.waehle_spieler(gewaehlt)} disabled={gewaehlt === null || gewaehlt === z.spieler}>
                ▶ Weiter spielen
              </Knopf>
            </div>
          ) : (
            <Meldung art="info">Es gibt noch keine gespeicherten Spieler. Lege gleich den ersten an!</Meldung>
          )
        ) : (
          <>
            <div class="feld">
              <label>
                Name eingeben{" "}
                <input type="text" placeholder="z. B. Anna" value={neuerName} onInput={(e) => setNeuerName((e.currentTarget as HTMLInputElement).value)} />
              </label>
              {gueltig ? (
                <Knopf
                  onClick={() => {
                    z.waehle_spieler(pythonStrip(neuerName));
                    setNeuerName("");
                  }}
                >
                  ✅ Spieler anlegen und starten
                </Knopf>
              ) : null}
            </div>
            {neuerName !== "" && !gueltig ? <Meldung art="warnung">{fehler}</Meldung> : null}
          </>
        )}
        {z.spieler !== null ? <span class="aktiver-spieler">🎮 Aktiver Spieler: {z.spieler}</span> : null}
      </div>
    </>
  );
}
