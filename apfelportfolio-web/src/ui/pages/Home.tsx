/**
 * Homepage / Hauptmenue des Apfelportfolio-Spiels.
 *
 * Quelle (Python): src/apfelportfolio/ui/pages/home.py (layout="centered",
 * max. 780 px). Haendler-Karten fuer alle bekannten Spieler, "Neuen Haendler
 * gruenden", "Spiel starten" und die Vorschau des aktiven Spielers. Texte
 * woertlich; Kennzahlen aus src/dashboard/spielerKennzahlen.ts.
 *
 * Nachgebildetes Streamlit-Verhalten (MIGRATION_NOTES, Phase 6/4):
 *   - Log bei jedem Aufruf neu lesen (repo.alle_laden()).
 *   - st.columns(3) mit Karte i in Spalte i % 3 (schmal: Spalten untereinander).
 *   - st.text_input uebernimmt den Text erst bei Enter/Verlassen des Feldes;
 *     der Text bleibt nach "Gruenden" stehen.
 *   - Erfolgsmeldung + Ballons nach "Spiel starten" nur bis zur naechsten Eingabe.
 */
import { useEffect, useState } from "preact/hooks";
import { spieler_kennzahlen, type SpielerKennzahlen } from "../../dashboard/spielerKennzahlen";
import { pythonStrip } from "../../domain/pythonString";
import { get_existing_players, validate_new_player_name } from "../../storage/spieler";
import { Ballons } from "../components/allgemein";
import { Knopf, Meldung } from "../components/streamlit";
import { fix } from "../format";
import { useSpielzustand } from "../zustandKontext";

function Haendlerkarte({
  name,
  kennzahlen,
  ist_aktiv,
  waehlen,
}: {
  name: string;
  kennzahlen: SpielerKennzahlen;
  ist_aktiv: boolean;
  waehlen: () => void;
}) {
  const best_text = kennzahlen.best !== null ? `${fix(kennzahlen.best, 2)} €` : "–";
  const badge_icons = kennzahlen.badges
    .filter((b) => b.freigeschaltet)
    .map((b) => b.icon)
    .join("");
  return (
    <div>
      <div class={ist_aktiv ? "trader-card is-selected" : "trader-card"}>
        <div class="trader-avatar">👤</div>
        <div class="trader-name">
          {name}
          {ist_aktiv ? " 🎮" : ""}
        </div>
        <span class="level-chip">{kennzahlen.level_label}</span>
        <div class="best-score">
          <span class="label">Bestes Ergebnis</span>
          {best_text}
        </div>
        <div class="trader-badges">{badge_icons}</div>
      </div>
      <Knopf klasse="st-button home-knopf" onClick={waehlen} disabled={ist_aktiv}>
        {ist_aktiv ? "🎮 Aktiver Händler" : "▶ Weiter spielen"}
      </Knopf>
    </div>
  );
}

function Vorschau({ kennzahlen }: { kennzahlen: SpielerKennzahlen }) {
  const rang_text = kennzahlen.letzter_rang ? `#${kennzahlen.letzter_rang}` : "–";
  const gewinn_text = kennzahlen.letzter_gewinn !== null ? `${fix(kennzahlen.letzter_gewinn, 2)} €` : "–";
  const wochen_text = kennzahlen.wochen ? String(kennzahlen.wochen) : "0";
  return (
    <div class="preview-strip">
      <div class="preview-chip">
        <span class="num">{rang_text}</span>
        <span class="cap">Letzter Rang</span>
      </div>
      <div class="preview-chip">
        <span class="num">{gewinn_text}</span>
        <span class="cap">Letzter Gewinn</span>
      </div>
      <div class="preview-chip">
        <span class="num">{wochen_text}</span>
        <span class="cap">Gespielte Wochen</span>
      </div>
    </div>
  );
}

export function Home() {
  const z = useSpielzustand();
  useEffect(() => {
    void z.lade_spielstaende(); // wie repo.alle_laden() bei jedem Aufruf
  }, [z]);

  // st.text_input: Entwurf beim Tippen, uebernommener Wert erst bei Enter/Verlassen
  const [entwurf, setEntwurf] = useState("");
  const [neuer_name, setNeuerName] = useState("");
  // Ergebnis von st.button("▶ Spiel starten") in diesem Durchlauf
  const [gestartet, setGestartet] = useState(0);

  const df = z.log_zeilen();
  const vorhandene_spieler = get_existing_players(df);

  const waehle = (name: string) => {
    setGestartet(0);
    z.waehle_spieler(name);
  };
  const uebernimm = () => {
    if (entwurf !== neuer_name) {
      setGestartet(0);
      setNeuerName(entwurf);
    }
  };
  const [gueltig, fehler] = neuer_name !== "" ? validate_new_player_name(neuer_name, df) : [false, ""];
  const aktueller_spieler = z.spieler;

  // Karte i in Spalte i % 3 (wie st.columns(3) mit spalten[index % 3])
  const spalten: string[][] = [[], [], []];
  vorhandene_spieler.forEach((name, i) => spalten[i % 3]?.push(name));

  return (
    <div class="seite-home">
      <div class="hero-wrap">
        <div class="hero-seal">🍎</div>
        <p class="hero-title">Apfelportfolio</p>
        <p class="hero-tagline">Werde zum erfolgreichsten Obsthändler.</p>
      </div>

      <p class="menu-heading">Spiel auswählen</p>
      {vorhandene_spieler.length > 0 ? (
        <div class="home-spalten">
          {spalten.map((namen, s) => (
            <div class="home-spalte" key={s}>
              {namen.map((name) => (
                <Haendlerkarte
                  key={name}
                  name={name}
                  kennzahlen={spieler_kennzahlen(df, name)}
                  ist_aktiv={name === aktueller_spieler}
                  waehlen={() => waehle(name)}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <p class="menu-heading">Oder neu beginnen</p>
      <div class="add-card">➕ Neuen Händler gründen</div>
      <input
        class="st-textfeld"
        type="text"
        aria-label="Name des neuen Händlers"
        placeholder="z. B. Anna"
        value={entwurf}
        onInput={(e) => setEntwurf((e.currentTarget as HTMLInputElement).value)}
        onBlur={uebernimm}
        onKeyDown={(e) => {
          if (e.key === "Enter") uebernimm();
        }}
      />
      {neuer_name !== "" ? (
        gueltig ? (
          <Knopf klasse="st-button home-knopf" onClick={() => waehle(pythonStrip(neuer_name))}>
            ✅ Gründen und loslegen
          </Knopf>
        ) : (
          <Meldung art="warnung">{fehler}</Meldung>
        )
      ) : null}

      <div class="start-zone">
        <Knopf klasse="start-knopf" onClick={() => setGestartet((n) => n + 1)} disabled={aktueller_spieler === null}>
          ▶ Spiel starten
        </Knopf>
      </div>

      {gestartet > 0 && aktueller_spieler !== null ? (
        <>
          <Meldung art="erfolg">Los geht's, {aktueller_spieler}! Wähle links dein Level, um zu starten.</Meldung>
          <Ballons key={gestartet} />
        </>
      ) : null}

      {aktueller_spieler !== null ? <Vorschau kennzahlen={spieler_kennzahlen(df, aktueller_spieler)} /> : null}
    </div>
  );
}
