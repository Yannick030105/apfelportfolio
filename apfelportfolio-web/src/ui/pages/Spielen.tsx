/**
 * Spielseite fuer alle Level (Level 1 und 2 auf einer Seite).
 *
 * Quelle (Python): ui/pages/1_spielen.py und ui/pages/level_2.py. Aufbau,
 * Texte, Slider-Grenzen und Reihenfolge wie dort; gerechnet wird nur in
 * src/levels/ (ueber die gemeinsame Schnittstelle aus registry.ts), der
 * Zustand liegt in src/state/spielzustand.ts.
 *
 * Nachgebildetes Streamlit-Verhalten (Details in MIGRATION_NOTES, Phase 6):
 *   - Jede Eingabe zeichnet die Seite neu (Rerun); der Tageskontext wird dabei
 *     wie in level_2.py jedes Mal neu berechnet.
 *   - Slider behalten ihren Wert, solange sich Beschriftung und Grenzen nicht
 *     aendern - auch ueber "Handel abschliessen" und "Neue Woche starten"
 *     hinweg; sonst beginnen sie wieder bei 0 (WidgetZustand).
 *   - Ein ValueError beim Abschliessen erscheint als Fehlerkasten unter dem
 *     Handelstisch; wie bei einer Streamlit-Ausnahme endet die Seite dort
 *     (keine Wochenuebersicht) bis zur naechsten Eingabe.
 */
import { useEffect, useRef, useState } from "preact/hooks";
import type { RegelwerkFelder, Tagesabrechnung, Tagesmarkt, Tagesnachfrage, PreisFeld } from "../../domain/models";
import { pythonSumme } from "../../domain/summe";
import { WOCHENTAGE } from "../../levels/level1Grundlast";
import type { LevelId, Tageslage } from "../../levels/registry";
import { WidgetZustand } from "../../state/widgetZustand";
import { fix, mitVorzeichen } from "../format";
import { useSpielzustand } from "../zustandKontext";
import { Ballons, Kopfzeile, KpiKarte, Uebersetzungstabelle } from "../components/allgemein";
import { Klein, Knopf, Meldung, Schalter, Schieberegler, Text, Trenner } from "../components/streamlit";

// ---------------------------------------------------------------------------
// Texte je Level (woertlich aus 1_spielen.py bzw. level_2.py)
// ---------------------------------------------------------------------------
function beschreibung(levelId: LevelId, rw: RegelwerkFelder): string {
  if (levelId === "level2") {
    return (
      "Wie in Level 1 deckst du den Bedarf tageweise – aber jeden Tag tritt " +
      "ein Ereignis ein, das Preise, Mengen, Verfügbarkeiten oder Limits " +
      "verändert. Manche Ereignisse verlangen eine Entscheidung. Reagiere " +
      "über deine Zukäufe. Der Freitags-Ausgleich (Mosterei/Wochenmarkt) " +
      "bleibt automatisch."
    );
  }
  return (
    `Der Obstbauer liefert täglich fix ${fix(rw.obstbauer_menge, 0)} Äpfel für ` +
    `${fix(rw.obstbauer_preis, 2)} €/Stück. Das Schulessen kauft dir täglich fix ` +
    `${fix(rw.schulessen_menge, 0)} Äpfel zu ${fix(rw.schulessen_preis, 2)} €/Stück ab. ` +
    `Die Bäckerei fragt zusätzlich eine zufällige Menge zwischen ` +
    `${fix(rw.baeckerei_menge_min, 0)} und ${fix(rw.baeckerei_menge_max, 0)} Äpfeln zu ` +
    `einem tagesabhängigen Preis nach und wird immer vollständig beliefert. ` +
    "Am Freitag wird ein verbleibender Überschuss automatisch an die Mosterei " +
    "verkauft bzw. eine Fehlmenge automatisch am Wochenmarkt zugekauft."
  );
}

/** set_page_config(page_title=..., page_icon=...) der Original-Seiten */
export const SEITENKOPF: Readonly<Record<LevelId, { titel: string; icon: string }>> = {
  level1: { titel: "Level 1 – Apfelportfolio", icon: "🍎" },
  level2: { titel: "Level 2 – Apfelportfolio", icon: "🌩️" },
};

// ---------------------------------------------------------------------------
// Anzeige-Bausteine (1:1 zu den _render_*-Funktionen)
// ---------------------------------------------------------------------------
function TrendPfeil({ aktuell, vorher, feld }: { aktuell: number; vorher: Tagesmarkt | null; feld: PreisFeld }) {
  if (vorher === null) return <span class="trend flat">▬</span>;
  const vorwert = vorher[feld];
  if (aktuell > vorwert) return <span class="trend up">▲</span>;
  if (aktuell < vorwert) return <span class="trend down">▼</span>;
  return <span class="trend flat">▬</span>;
}

function Marktuebersicht({ lage, historie }: { lage: Tageslage; historie: readonly Tagesmarkt[] }) {
  const letzter = historie.length > 0 ? (historie[historie.length - 1] as Tagesmarkt) : null;
  const m = lage.markt;
  const k = lage.kontext;
  const preise: [string, string, number, PreisFeld, string, boolean][] = [
    ["🚢", "Importeur", m.preis_importeur, "preis_importeur", "#FCEBD9", k === null || k.importeur_verfuegbar],
    ["🧺", "Wochenmarkt", m.preis_wochenmarkt, "preis_wochenmarkt", "#EAF1EF", k === null || k.wochenmarkt_verfuegbar],
    ["🥐", "Bäckerei", m.preis_baeckerei, "preis_baeckerei", "#FBEAEA", true],
    ["🍹", "Mosterei", m.preis_mosterei, "preis_mosterei", "#F1EEE8", true],
  ];
  return (
    <div class="desk-panel">
      <p class="desk-panel-title">🏪 Marktübersicht</p>
      {preise.map(([icon, name, wert, feld, farbe, verfuegbar]) => (
        <div class="price-row" key={feld}>
          <div class="price-left">
            <div class="price-icon" style={{ background: farbe }}>
              {icon}
            </div>
            <span class="price-name">{name}</span>
          </div>
          <div class="price-value">
            <span class="price-amount">{fix(wert, 2)} €</span>
            {verfuegbar ? <TrendPfeil aktuell={wert} vorher={letzter} feld={feld} /> : <span class="trend blocked">✕ heute gesperrt</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kurzer Nachrichtentext, abgeleitet aus den vorhandenen Tagesdaten. */
function marktnachricht(nachfrage: Tagesnachfrage, rw: RegelwerkFelder): string {
  const spanne = rw.baeckerei_menge_max - rw.baeckerei_menge_min;
  const schwelle_hoch = rw.baeckerei_menge_min + spanne * 0.66;
  const schwelle_niedrig = rw.baeckerei_menge_min + spanne * 0.33;
  if (nachfrage.baeckerei_bestellt >= schwelle_hoch) {
    return "📢 Heute hohe Nachfrage der Bäckerei – plane den Zukauf großzügig ein.";
  }
  if (nachfrage.baeckerei_bestellt <= schwelle_niedrig) {
    return "📢 Ruhiger Tag: Die Bäckerei fragt heute nur wenig nach.";
  }
  return "📢 Die Nachfrage der Bäckerei liegt heute im mittleren Bereich.";
}

function Bedarf({ lage, rw, mitEreignissen }: { lage: Tageslage; rw: RegelwerkFelder; mitEreignissen: boolean }) {
  // Level 1 zeigt Regelwerkswerte ("fix"), Level 2 die Werte nach dem Ereignis ("heute").
  const zeilen: [string, string][] = mitEreignissen
    ? [
        ["🏫 Schulessen (heute)", `${fix(lage.nachfrage.schulessen, 0)} Äpfel · ${fix(rw.schulessen_preis, 2)} €/Stk.`],
        ["🥐 Bäckerei (heute)", `${fix(lage.nachfrage.baeckerei_bestellt, 0)} Äpfel`],
        ["🌳 Obstbauer (Lieferung, heute)", `${fix(lage.obstbauer_menge, 0)} Äpfel · ${fix(rw.obstbauer_preis, 2)} €/Stk.`],
      ]
    : [
        ["🏫 Schulessen (fix)", `${fix(rw.schulessen_menge, 0)} Äpfel · ${fix(rw.schulessen_preis, 2)} €/Stk.`],
        ["🥐 Bäckerei (heute)", `${fix(lage.nachfrage_gewuerfelt.baeckerei_bestellt, 0)} Äpfel`],
        ["🌳 Obstbauer (Lieferung, fix)", `${fix(rw.obstbauer_menge, 0)} Äpfel · ${fix(rw.obstbauer_preis, 2)} €/Stk.`],
      ];
  const nachfrage = mitEreignissen ? lage.nachfrage : lage.nachfrage_gewuerfelt;
  return (
    <div class="desk-panel">
      <p class="desk-panel-title">📋 Bedarf &amp; Fixversorgung</p>
      {zeilen.map(([name, wert]) => (
        <div class="demand-row" key={name}>
          <span class="demand-name">{name}</span>
          <span class="demand-value">{wert}</span>
        </div>
      ))}
      <div class="news-box">{marktnachricht(nachfrage, rw)}</div>
    </div>
  );
}

/** Erwartete Ernte (Obstbauer-Liefermenge nach Ereigniswirkung) - nur Level 2. */
function Wetterkarte({ lage, rw }: { lage: Tageslage; rw: RegelwerkFelder }) {
  const erwartete_ernte = lage.obstbauer_menge;
  const regulaere_ernte = rw.obstbauer_menge;
  let icon = "⛅";
  let sub = "Ernte wie gewohnt.";
  if (erwartete_ernte > regulaere_ernte) {
    icon = "☀️";
    sub = "Gute Ernte – mehr Äpfel als üblich verfügbar.";
  } else if (erwartete_ernte < regulaere_ernte) {
    icon = "🌧️";
    sub = "Geringere Ernte als üblich – Angebot ist knapper.";
  }
  return (
    <div class="weather-card">
      <p class="weather-card-title">🌤️ Wetterkarte</p>
      <div class="weather-main">
        <span class="weather-icon">{icon}</span>
        <div>
          <div class="weather-harvest">{fix(erwartete_ernte, 0)} Äpfel</div>
          <div class="weather-sub">Erwartete Ernte (regulär {fix(regulaere_ernte, 0)})</div>
        </div>
      </div>
      <p class="weather-sub" style={{ marginTop: "0.5rem" }}>
        {sub}
      </p>
    </div>
  );
}

function Ereigniskarte({ lage }: { lage: Tageslage }) {
  const e = lage.ereignis;
  if (e === null) return null;
  return (
    <div class="event-card">
      <p class="event-card-title">⚡ {e.titel}</p>
      <p class="event-card-desc">{e.beschreibung}</p>
      {e.hinweis !== "" ? <p class="event-card-tip">💡 {e.hinweis}</p> : null}
    </div>
  );
}

function Wochenuebersicht({ tage }: { tage: readonly Tagesabrechnung[] }) {
  return (
    <>
      <p class="menu-heading">📅 Wochenübersicht</p>
      <div class="raster raster-5">
        {WOCHENTAGE.map((tag_name, i) => {
          const t = tage[i];
          if (t === undefined) {
            return (
              <div class="day-card offen" key={tag_name}>
                <p class="day-card-title">{tag_name}</p>
                <div class="day-card-row">
                  <span>noch offen</span>
                  <b>–</b>
                </div>
              </div>
            );
          }
          const klasse = t.tagesergebnis >= 0 ? "positiv" : "negativ";
          return (
            <div class={`day-card ${klasse}`} key={tag_name}>
              <p class="day-card-title">{tag_name}</p>
              {t.ereignis_titel !== "" ? <p class="day-card-event">⚡ {t.ereignis_titel}</p> : null}
              <div class="day-card-row">
                <span>Gewinn</span>
                <b>{fix(t.tagesergebnis, 2)} €</b>
              </div>
              <div class="day-card-row">
                <span>Saldo</span>
                <b>{mitVorzeichen(t.bilanzkreis_saldo, 0)}</b>
              </div>
              <div class="day-card-row">
                <span>Import</span>
                <b>{fix(t.einkauf.importeur_menge, 0)}</b>
              </div>
              <div class="day-card-row">
                <span>Verkauf</span>
                <b>{fix(t.an_baeckerei_geliefert + t.an_schulessen_geliefert + t.an_mosterei_geliefert, 0)}</b>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------
const SLIDER_IMPORTEUR = "Zukauf beim Importeur (Äpfel)";
const SLIDER_WOCHENMARKT = "Zukauf am Wochenmarkt (Äpfel)";
const SLIDER_MOSTEREI = "Verkauf an Mosterei";

export function Spielen({ levelId }: { levelId: LevelId }) {
  const z = useSpielzustand();
  // Widget-Zustand lebt so lange wie die Seite (Seitenwechsel = Streamlit verwirft ihn)
  const widgets = useRef(new WidgetZustand()).current;
  const [, setDurchlauf] = useState(0);
  widgets.beginneDurchlauf();
  useEffect(() => widgets.beendeDurchlauf());

  if (z.spieler === null) {
    return <Meldung art="fehler">Bitte wähle zuerst auf der Startseite einen Spieler aus.</Meldung>;
  }

  const sitzung = z.sitzung(levelId);
  const level = sitzung.level;
  const rw = z.regelwerk; // st.session_state.regelwerk (Anzeige), gerechnet wird mit level.regelwerk
  const woche = sitzung.woche;
  const tag_index = sitzung.tag_index;
  const mitEreignissen = level.hat_ereignisse;

  /** Jede Eingabe startet einen neuen Durchlauf (Streamlit-Rerun) ohne Fehlerkasten. */
  const neuzeichnen = (aktion: () => void) => {
    aktion();
    z.verwerfe_fehler(levelId);
    setDurchlauf((d) => d + 1);
  };

  const kopf = (
    <>
      <Kopfzeile titel={level.titel} />
      <Text>{beschreibung(levelId, rw)}</Text>
      <Uebersetzungstabelle />
      <Trenner />
      <div class="raster raster-4">
        <KpiKarte label="Kontostand (Woche bisher)" wert={`${fix(pythonSumme(woche.tage.map((t) => t.tagesergebnis)), 2)} €`} />
        <KpiKarte label="Portfoliostand" wert={`${mitVorzeichen(level.portfoliostand, 0)} Äpfel`} />
        <KpiKarte label="Tag" wert={`${Math.min(tag_index + 1, WOCHENTAGE.length)} / ${WOCHENTAGE.length}`} />
        <KpiKarte label="Wochenergebnis" wert={`${fix(woche.wochenergebnis, 2)} €`} />
      </div>
      <div class="abstand-l" />
      <Knopf onClick={() => void z.neue_woche(levelId)}>🔄 Neue Woche starten</Knopf>
      <div class="abstand-s" />
    </>
  );

  if (tag_index >= WOCHENTAGE.length) {
    const ergebnis = woche.wochenergebnis;
    return (
      <>
        {kopf}
        <Wochenuebersicht tage={woche.tage} />
        <p class="menu-heading">🏁 Woche beendet</p>
        {ergebnis >= 0 ? (
          <>
            <Meldung art="erfolg">Starke Woche! Wochenergebnis: {fix(ergebnis, 2)} €</Meldung>
            <Ballons key={sitzung.spielstand.id} />
          </>
        ) : (
          <Meldung art="fehler">Die Woche war negativ. Wochenergebnis: {fix(ergebnis, 2)} €</Meldung>
        )}
      </>
    );
  }

  const lage = z.lage(sitzung);
  if (lage === null) return kopf; // Tag wird gerade gezogen
  const tag_name = WOCHENTAGE[tag_index] as string;
  const ereignis = lage.ereignis;
  const kontext = lage.kontext;

  // --- Handelskonsole: Slider in der Reihenfolge des Originals --------------
  const basis = level.eingabegrenzen(lage, 0, 0);
  let importeur_menge = 0;
  let importeurAnzeige;
  if (basis.importeur_max !== null) {
    const id = WidgetZustand.id("slider", SLIDER_IMPORTEUR, [0, basis.importeur_max, 0]);
    importeur_menge = widgets.wert(id, 0);
    importeurAnzeige = (
      <>
        <p class="console-slider-label">🚢 Importeur</p>
        <Schieberegler beschriftung={SLIDER_IMPORTEUR} min={0} max={basis.importeur_max} wert={importeur_menge} onChange={(w) => neuzeichnen(() => widgets.setze(id, w))} />
      </>
    );
  } else if (kontext !== null && !kontext.importeur_verfuegbar) {
    importeurAnzeige = <Klein>🚢 Importeur heute nicht verfügbar (Ereignis).</Klein>;
  } else {
    importeurAnzeige = <Klein>🚢 Importeur nicht mehr verfügbar (nur Mo–Mi).</Klein>;
  }

  let wochenmarkt_menge = 0;
  let wochenmarktAnzeige;
  if (basis.wochenmarkt_max !== null) {
    const id = WidgetZustand.id("slider", SLIDER_WOCHENMARKT, [0, basis.wochenmarkt_max, 0]);
    wochenmarkt_menge = widgets.wert(id, 0);
    wochenmarktAnzeige = (
      <>
        <p class="console-slider-label">🧺 Wochenmarkt</p>
        <Schieberegler beschriftung={SLIDER_WOCHENMARKT} min={0} max={basis.wochenmarkt_max} wert={wochenmarkt_menge} onChange={(w) => neuzeichnen(() => widgets.setze(id, w))} />
      </>
    );
  } else {
    wochenmarktAnzeige = <Klein>🧺 Wochenmarkt heute geschlossen (Ereignis).</Klein>;
  }

  // Mosterei-Maximum haengt von den aktuell eingestellten Zukaeufen ab
  const grenzen = level.eingabegrenzen(lage, importeur_menge, wochenmarkt_menge);
  let mosterei_menge = 0;
  let mostereiAnzeige;
  if (grenzen.mosterei_max === null) {
    mostereiAnzeige = <Klein>🍹 Freitags-Ausgleich läuft automatisch: Überschuss → Mosterei, Fehlmenge → Wochenmarkt.</Klein>;
  } else if (grenzen.mosterei_max === 0) {
    mostereiAnzeige = (
      <>
        <p class="console-slider-label">🍹 Mosterei</p>
        <Klein>Kein Überschuss vorhanden – heute kein Verkauf an die Mosterei möglich.</Klein>
      </>
    );
  } else {
    const id = WidgetZustand.id("slider", SLIDER_MOSTEREI, [0, grenzen.mosterei_max, 0]);
    mosterei_menge = widgets.wert(id, 0);
    mostereiAnzeige = (
      <>
        <p class="console-slider-label">🍹 Mosterei</p>
        <Schieberegler beschriftung={SLIDER_MOSTEREI} min={0} max={grenzen.mosterei_max} wert={mosterei_menge} onChange={(w) => neuzeichnen(() => widgets.setze(id, w))} />
      </>
    );
  }

  const abschliessen = () => {
    void z.schliesse_tag_ab(levelId, {
      importeur_menge,
      wochenmarkt_menge,
      mosterei_menge,
    });
  };

  return (
    <>
      {kopf}
      <p class="menu-heading">
        🛒 Handelstisch – {tag_name} (Tag {tag_index + 1} von 5)
      </p>
      {mitEreignissen ? <Ereigniskarte lage={lage} /> : null}
      {ereignis !== null && ereignis.entscheidung_text !== null ? (
        <Schalter beschriftung={ereignis.entscheidung_text} wert={sitzung.ereignis_zugestimmt} onChange={(w) => z.setze_zustimmung(levelId, w)} />
      ) : null}

      <div class={`raster ${mitEreignissen ? "raster-tisch-4" : "raster-tisch-3"}`}>
        {mitEreignissen ? (
          <div>
            <Wetterkarte lage={lage} rw={rw} />
          </div>
        ) : null}
        <div>
          <Marktuebersicht lage={lage} historie={sitzung.preishistorie} />
        </div>
        <div>
          <Bedarf lage={lage} rw={rw} mitEreignissen={mitEreignissen} />
        </div>
        <div>
          <div class="console-panel">
            <p class="console-title">🎛️ Handelskonsole</p>
            {importeurAnzeige}
            {wochenmarktAnzeige}
            {mostereiAnzeige}
            <div class="abstand-s" />
            <Knopf klasse="trade-button" onClick={abschliessen}>
              💰 Handel abschließen
            </Knopf>
          </div>
        </div>
      </div>

      {sitzung.fehler !== null ? (
        <Meldung art="fehler">
          <span class="fehlertyp">ValueError:</span> {sitzung.fehler}
        </Meldung>
      ) : (
        <>
          <div class="abstand-m" />
          <Wochenuebersicht tage={woche.tage} />
        </>
      )}
    </>
  );
}
