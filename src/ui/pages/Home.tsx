/**
 * Homepage / Hauptmenue des Apfelportfolio-Spiels.
 *
 * Quelle (Python): src/apfelportfolio/ui/pages/home.py. Haendler-Karten fuer
 * alle bekannten Spieler, "Neuen Haendler gruenden", "Spiel starten" und die
 * Vorschau des aktiven Spielers. Kennzahlen aus src/dashboard/spielerKennzahlen.ts.
 *
 * Seit der Ueberarbeitung der Startseite (MIGRATION_NOTES, Abweichung 38):
 *   - Querformat, volle Bildschirmbreite: links die Haendler-Karten, rechts
 *     "Neuen Haendler gruenden" und der Start-Bereich.
 *   - Die ganze Karte ist klickbar und waehlt den Haendler aus (statt eigenem
 *     "Weiter spielen"-Knopf). Doppelklick waehlt aus und startet sofort.
 *   - Gruenden: Name wird beim Tippen geprueft (statt erst nach Enter/Verlassen),
 *     der Knopf ist sichtbar und erst bei gueltigem Namen aktiv; Enter gruendet.
 *     Danach wird das Feld geleert und der neue Haendler erscheint als Karte.
 *
 * Unveraendert: Log bei jedem Aufruf neu lesen (repo.alle_laden()), Pruefregeln
 * und Meldungstexte, Erfolgsmeldung + Ballons nach "Spiel starten" nur bis zur
 * naechsten Eingabe.
 */
import { useEffect, useState } from "preact/hooks";
import { spieler_kennzahlen, type SpielerKennzahlen } from "../../dashboard/spielerKennzahlen";
import { pythonStrip } from "../../domain/pythonString";
import { get_existing_players, validate_new_player_name } from "../../storage/spieler";
import { Ballons } from "../components/allgemein";
import { Knopf, Meldung } from "../components/streamlit";
import { fix } from "../format";
import { useSpielzustand } from "../zustandKontext";

const MAX_NAMENSLAENGE = 30; // wie validate_new_player_name

/** Warme Avatarfarben passend zur Handelstisch-Optik (Hintergrund, Rand, Schrift). */
const AVATAR_FARBEN: readonly [string, string, string][] = [
  ["#fde3c8", "#e8a33d", "#8a4a12"],
  ["#f9d6cf", "#c0392b", "#7a1f15"],
  ["#dcefe2", "#3f8f5c", "#245536"],
  ["#f6e7b8", "#c9a227", "#6b5208"],
  ["#e8dcf3", "#8e6bb8", "#4b2e70"],
  ["#d6e6f3", "#4f86b5", "#24496b"],
];

function avatarFarbe(name: string): [string, string, string] {
  let h = 0;
  for (const c of name) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_FARBEN[h % AVATAR_FARBEN.length] as [string, string, string];
}

function initiale(name: string): string {
  const erstes = Array.from(name.trim())[0];
  return erstes !== undefined ? erstes.toLocaleUpperCase("de-DE") : "";
}

function Avatar({ name, gross = false }: { name: string; gross?: boolean }) {
  const text = initiale(name);
  if (text === "") {
    return (
      <div class={gross ? "haendler-avatar gross leer" : "haendler-avatar leer"} aria-hidden="true">
        🌱
      </div>
    );
  }
  const [bg, rand, schrift] = avatarFarbe(name);
  return (
    <div
      class={gross ? "haendler-avatar gross" : "haendler-avatar"}
      style={{ background: bg, borderColor: rand, color: schrift }}
      aria-hidden="true"
    >
      {text}
    </div>
  );
}

function Haendlerkarte({
  name,
  kennzahlen,
  ist_aktiv,
  ist_neu,
  waehlen,
  starten,
}: {
  name: string;
  kennzahlen: SpielerKennzahlen;
  ist_aktiv: boolean;
  ist_neu: boolean;
  waehlen: () => void;
  starten: () => void;
}) {
  const best_text = kennzahlen.best !== null ? `${fix(kennzahlen.best, 2)} €` : "–";
  const rang_text = kennzahlen.letzter_rang ? `#${kennzahlen.letzter_rang}` : "–";
  const wochen_text = kennzahlen.wochen ? String(kennzahlen.wochen) : "0";
  const freigeschaltet = kennzahlen.badges.filter((b) => b.freigeschaltet).length;
  return (
    <button
      type="button"
      class={ist_aktiv ? "haendler-karte is-selected" : "haendler-karte"}
      aria-pressed={ist_aktiv}
      aria-label={`${name} auswählen`}
      title="Klicken zum Auswählen · Doppelklick startet sofort"
      onClick={waehlen}
      onDblClick={starten}
    >
      <span class="haendler-haken" aria-hidden="true">
        ✓
      </span>
      <div class="haendler-kopf">
        <Avatar name={name} />
        <div class="haendler-titel">
          <span class="haendler-name">{name}</span>
          <span class="haendler-chips">
            <span class="level-chip">{kennzahlen.level_label}</span>
            {ist_neu ? <span class="neu-chip">Neu</span> : null}
          </span>
        </div>
      </div>

      <div class="haendler-best">
        <span class="label">Bestes Ergebnis</span>
        <span class="wert">{best_text}</span>
      </div>

      <div class="haendler-werte">
        <div>
          <span class="num">{wochen_text}</span>
          <span class="cap">Wochen</span>
        </div>
        <div>
          <span class="num">{rang_text}</span>
          <span class="cap">Letzter Rang</span>
        </div>
        <div>
          <span class="num">
            {freigeschaltet}/{kennzahlen.badges.length}
          </span>
          <span class="cap">Abzeichen</span>
        </div>
      </div>

      {kennzahlen.badges.length > 0 ? (
        <div class="haendler-badges">
          {kennzahlen.badges.map((b) => (
            <span
              key={b.titel}
              class={b.freigeschaltet ? "haendler-badge an" : "haendler-badge aus"}
              title={`${b.titel}${b.freigeschaltet ? "" : " (noch gesperrt)"} – ${b.beschreibung}`}
            >
              {b.icon}
            </span>
          ))}
        </div>
      ) : (
        <div class="haendler-badges leer">Noch keine Woche gespielt</div>
      )}

      <span class="haendler-aktion" aria-hidden="true">
        {ist_aktiv ? "Ausgewählt" : "Auswählen"}
      </span>
    </button>
  );
}

/** Neuer Haendler: Live-Vorschau des Avatars, Pruefung beim Tippen, Gruenden per Enter oder Knopf. */
function NeuerHaendler({
  vorhandene,
  gruenden,
  pruefen,
}: {
  vorhandene: number;
  gruenden: (name: string) => void;
  pruefen: (name: string) => [boolean, string];
}) {
  const [entwurf, setEntwurf] = useState("");
  const leer = pythonStrip(entwurf) === "";
  const [gueltig, fehler] = leer ? [false, ""] : pruefen(entwurf);
  const laenge = Array.from(pythonStrip(entwurf)).length;

  const absenden = () => {
    if (!gueltig) return;
    gruenden(pythonStrip(entwurf));
    setEntwurf("");
  };

  return (
    <section class="neu-panel" aria-labelledby="neu-titel">
      <div class="neu-kopf">
        <Avatar name={entwurf} gross />
        <div>
          <p class="neu-titel" id="neu-titel">
            ➕ Neuen Händler gründen
          </p>
          <p class="neu-text">
            {vorhandene > 0 ? "Neu dabei? Gib deinem Obststand einen Namen." : "Gründe deinen ersten Obststand – gib ihm einen Namen."}
          </p>
        </div>
      </div>

      <ol class="neu-schritte" aria-label="So geht's">
        <li class={leer ? "aktiv" : "erledigt"}>
          <span class="nr">1</span> Name eingeben
        </li>
        <li class={gueltig ? "aktiv" : ""}>
          <span class="nr">2</span> Gründen
        </li>
        <li>
          <span class="nr">3</span> Spiel starten
        </li>
      </ol>

      <label class="neu-label" for="neu-name">
        Name des neuen Händlers
      </label>
      <div class={!leer && !gueltig ? "neu-feld fehler" : gueltig ? "neu-feld ok" : "neu-feld"}>
        <input
          id="neu-name"
          type="text"
          autocomplete="off"
          placeholder="z. B. Anna"
          value={entwurf}
          aria-invalid={!leer && !gueltig}
          aria-describedby="neu-hinweis"
          onInput={(e) => setEntwurf((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") absenden();
          }}
        />
        <span class={laenge > MAX_NAMENSLAENGE ? "neu-zaehler zu-lang" : "neu-zaehler"}>
          {laenge}/{MAX_NAMENSLAENGE}
        </span>
      </div>
      <p id="neu-hinweis" class={!leer && !gueltig ? "neu-hinweis fehler" : gueltig ? "neu-hinweis ok" : "neu-hinweis"} aria-live="polite">
        {leer ? "Höchstens 30 Zeichen. Der Name muss neu sein." : gueltig ? "✓ Der Name ist frei." : `⚠️ ${fehler}`}
      </p>

      <Knopf klasse="neu-knopf" onClick={absenden} disabled={!gueltig}>
        ✅ Gründen und loslegen
      </Knopf>
    </section>
  );
}

function StartBereich({
  spieler,
  kennzahlen,
  gestartet,
  starten,
}: {
  spieler: string | null;
  kennzahlen: SpielerKennzahlen | null;
  gestartet: number;
  starten: () => void;
}) {
  const rang_text = kennzahlen?.letzter_rang ? `#${kennzahlen.letzter_rang}` : "–";
  const gewinn_text = kennzahlen && kennzahlen.letzter_gewinn !== null ? `${fix(kennzahlen.letzter_gewinn, 2)} €` : "–";
  const wochen_text = kennzahlen?.wochen ? String(kennzahlen.wochen) : "0";
  return (
    <section class="start-panel" aria-label="Spiel starten">
      {spieler !== null ? (
        <div class="start-wer">
          <Avatar name={spieler} />
          <div>
            <span class="start-wer-cap">Du spielst als</span>
            <span class="start-wer-name">{spieler}</span>
          </div>
        </div>
      ) : (
        <p class="start-leer">👈 Wähle links deine Händlerkarte aus oder gründe oben einen neuen Händler.</p>
      )}

      {spieler !== null ? (
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
      ) : null}

      <Knopf klasse="start-knopf" onClick={starten} disabled={spieler === null}>
        ▶ Spiel starten
      </Knopf>

      {gestartet > 0 && spieler !== null ? (
        <>
          <Meldung art="erfolg">Los geht's, {spieler}! Wähle oben dein Level, um zu starten.</Meldung>
          <Ballons key={gestartet} />
        </>
      ) : null}
    </section>
  );
}

export function Home() {
  const z = useSpielzustand();
  useEffect(() => {
    void z.lade_spielstaende(); // wie repo.alle_laden() bei jedem Aufruf
  }, [z]);

  // Ergebnis von st.button("▶ Spiel starten") in diesem Durchlauf
  const [gestartet, setGestartet] = useState(0);

  const df = z.log_zeilen();
  const vorhandene_spieler = get_existing_players(df);
  const aktueller_spieler = z.spieler;

  const waehle = (name: string) => {
    setGestartet(0);
    z.waehle_spieler(name);
  };
  const starte = () => setGestartet((n) => n + 1);

  // Frisch gegruendeter Haendler ohne gespielte Woche: als eigene Karte vorne zeigen.
  const neuer_aktiver = aktueller_spieler !== null && !vorhandene_spieler.includes(aktueller_spieler) ? aktueller_spieler : null;
  const karten = neuer_aktiver !== null ? [neuer_aktiver, ...vorhandene_spieler] : vorhandene_spieler;

  return (
    <div class="seite-home">
      <div class="hero-wrap">
        <div class="hero-seal">🍎</div>
        <div>
          <p class="hero-title">Apfelportfolio</p>
          <p class="hero-tagline">Werde zum erfolgreichsten Obsthändler.</p>
        </div>
      </div>

      <div class="home-raster">
        <section class="home-karten" aria-labelledby="home-auswahl">
          <div class="home-karten-kopf">
            <p class="menu-heading" id="home-auswahl">
              Spiel auswählen
            </p>
            {karten.length > 0 ? <span class="home-hinweis">Klicke auf deine Karte · Doppelklick startet sofort</span> : null}
          </div>
          {karten.length > 0 ? (
            <div class="haendler-raster">
              {karten.map((name) => (
                <Haendlerkarte
                  key={name}
                  name={name}
                  kennzahlen={spieler_kennzahlen(df, name)}
                  ist_aktiv={name === aktueller_spieler}
                  ist_neu={name === neuer_aktiver}
                  waehlen={() => waehle(name)}
                  starten={() => {
                    waehle(name);
                    starte();
                  }}
                />
              ))}
            </div>
          ) : (
            <div class="home-leer">
              <span class="icon">🧺</span>
              <p>Noch keine Händler im Spielordner.</p>
              <p class="klein">Gründe rechts deinen ersten Obststand.</p>
            </div>
          )}
        </section>

        <aside class="home-seite">
          <NeuerHaendler
            vorhandene={vorhandene_spieler.length}
            pruefen={(name) => validate_new_player_name(name, df)}
            gruenden={(name) => waehle(name)}
          />
          <StartBereich
            spieler={aktueller_spieler}
            kennzahlen={aktueller_spieler !== null ? spieler_kennzahlen(df, aktueller_spieler) : null}
            gestartet={gestartet}
            starten={starte}
          />
        </aside>
      </div>
    </div>
  );
}
