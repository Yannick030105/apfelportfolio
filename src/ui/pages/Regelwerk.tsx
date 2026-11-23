/**
 * Regelwerk-Seite: Spiel-Einstellungen im Stil eines Options-Menues.
 *
 * Quelle (Python): src/apfelportfolio/ui/pages/6_regelwerk.py (layout="centered",
 * max. 760 px). Felder, Grenzen, Schrittweiten, Texte und Ablauf wie dort;
 * Speichern ueber Spielzustand.uebernimm_regelwerk (validiert() + config.json).
 *
 * Nachgebildetes Streamlit-Verhalten (alles im laufenden Original gemessen,
 * MIGRATION_NOTES Phase 6/7):
 *   - st.number_input ohne key: Startwert aus st.session_state.regelwerk; die
 *     Widget-ID enthaelt diesen Wert, nach "Uebernehmen"/"Standardwerte" zeigen die
 *     Felder daher den neuen Wert.
 *   - st.number_input MIT key (W1 Minimum/Maximum, Nachfragemenge Minimum/Maximum):
 *     Wert haengt am key - nach "Standardwerte wiederherstellen" bleibt die alte
 *     Eingabe stehen; erst ein Seitenwechsel setzt sie zurueck.
 *   - Eingabe ausserhalb der Grenzen: rot markiert, nicht uebernommen.
 *   - Speichern: validiert(); bei Fehler Fehlerkasten mit freundlichem Hinweis, nichts gespeichert;
 *     sonst Erfolgsmeldung bis zur naechsten Eingabe.
 *   - "↺ Standardwerte wiederherstellen": Meldung erscheint nie (st.rerun()
 *     direkt danach verwirft sie).
 */
import { useEffect, useRef, useState } from "preact/hooks";
import { ValueError } from "../../domain/fehler";
import { Regelwerk as RegelwerkModell } from "../../domain/models";
import { WidgetZustand } from "../../state/widgetZustand";
import { Knopf, Meldung, Zahlfeld } from "../components/streamlit";
import { useSpielzustand } from "../zustandKontext";
import type { ComponentChildren } from "preact";

type Feld =
  | "importeur_limit"
  | "wochenmarkt_limit_tag"
  | "schulessen_menge"
  | "schulessen_preis"
  | "obstbauer_menge"
  | "obstbauer_preis"
  | "baeckerei_preis_aufschlag"
  | "baeckerei_preis_min"
  | "baeckerei_preis_max"
  | "baeckerei_menge_min"
  | "baeckerei_menge_max";

interface FeldDef {
  feld: Feld;
  beschriftung: string;
  min: number;
  max: number;
  step: number;
  stellen: number | null; // null = Ganzzahl, 2 = format="%.2f"
  /** st.number_input(key=...) */
  key?: string;
  /** value=int(rw.x) im Original */
  alsGanzzahl?: boolean;
}

/** Felder exakt wie in 6_regelwerk.py */
const F: Record<string, FeldDef> = {
  importeur: { feld: "importeur_limit", beschriftung: "Obergrenze Importeur (pro Tag, Mo–Mi)", min: 0, max: 1000, step: 10, stellen: null },
  wochenmarkt: { feld: "wochenmarkt_limit_tag", beschriftung: "Obergrenze Wochenmarkt", min: 0, max: 1000, step: 10, stellen: null },
  schulessenMenge: { feld: "schulessen_menge", beschriftung: "Schulessen-Abnahmemenge (Äpfel/Tag)", min: 0, max: 500, step: 10, stellen: null, alsGanzzahl: true },
  schulessenPreis: { feld: "schulessen_preis", beschriftung: "Schulessen-Preis (€/Stück)", min: 0.0, max: 5.0, step: 0.05, stellen: 2 },
  obstbauerMenge: { feld: "obstbauer_menge", beschriftung: "Obstbauer-Liefermenge (Äpfel/Tag)", min: 0, max: 500, step: 10, stellen: null, alsGanzzahl: true },
  obstbauerPreis: { feld: "obstbauer_preis", beschriftung: "Obstbauer-Preis (€/Stück)", min: 0.0, max: 5.0, step: 0.05, stellen: 2 },
  aufschlag: { feld: "baeckerei_preis_aufschlag", beschriftung: "Preisaufschlag (€/Stück, zusätzlich zu W1/10)", min: 0.0, max: 2.0, step: 0.05, stellen: 2 },
  w1Min: { feld: "baeckerei_preis_min", beschriftung: "Minimum", min: 1, max: 20, step: 1, stellen: null, key: "baeckerei_preis_min" },
  w1Max: { feld: "baeckerei_preis_max", beschriftung: "Maximum", min: 1, max: 20, step: 1, stellen: null, key: "baeckerei_preis_max" },
  mengeMin: { feld: "baeckerei_menge_min", beschriftung: "Minimum", min: 0, max: 500, step: 5, stellen: null, key: "baeckerei_menge_min", alsGanzzahl: true },
  mengeMax: { feld: "baeckerei_menge_max", beschriftung: "Maximum", min: 0, max: 500, step: 5, stellen: null, key: "baeckerei_menge_max", alsGanzzahl: true },
};

function Panel({ icon, titel, beschreibung, children }: { icon: string; titel: string; beschreibung: string; children: ComponentChildren }) {
  return (
    <div class="settings-panel">
      <div class="settings-panel-header">
        <div class="settings-panel-icon">{icon}</div>
        <p class="settings-panel-title">{titel}</p>
      </div>
      <p class="settings-panel-desc">{beschreibung}</p>
      {children}
    </div>
  );
}

type Meldungsstand = { art: "erfolg"; text: string; ohneOrdner: boolean } | { art: "fehler"; text: string } | null;

export function Regelwerk() {
  const z = useSpielzustand();
  const rw = z.regelwerk; // st.session_state.regelwerk
  const widgets = useRef(new WidgetZustand()).current;
  const [, setDurchlauf] = useState(0);
  const [meldung, setMeldung] = useState<Meldungsstand>(null);
  widgets.beginneDurchlauf();
  useEffect(() => widgets.beendeDurchlauf());

  // Aktueller Wert jedes Felds (Widget-Zustand wie Streamlit)
  const werte = {} as Record<Feld, number>;
  const ids = {} as Record<Feld, string>;
  for (const d of Object.values(F)) {
    const startwert = d.alsGanzzahl ? Math.trunc(rw[d.feld]) : rw[d.feld];
    const id =
      d.key !== undefined
        ? WidgetZustand.id("number_input:key", d.key, [])
        : WidgetZustand.id("number_input", d.beschriftung, [d.min, d.max, startwert, d.step, d.stellen ?? "int"]);
    ids[d.feld] = id;
    werte[d.feld] = widgets.wert(id, startwert);
  }

  const eingabe = (feld: Feld) => (w: number) => {
    widgets.setze(ids[feld], w);
    setMeldung(null); // jede Eingabe = neuer Durchlauf ohne alte Meldung
    setDurchlauf((n) => n + 1);
  };
  const feld = (d: FeldDef) => (
    <div class="setting-card">
      <Zahlfeld beschriftung={d.beschriftung} min={d.min} max={d.max} step={d.step} stellen={d.stellen} wert={werte[d.feld]} onChange={eingabe(d.feld)} />
    </div>
  );
  const paar = (titel: string, a: FeldDef, b: FeldDef) => (
    <div class="setting-card">
      <p class="setting-paar-titel">{titel}</p>
      <div class="raster raster-2">
        <Zahlfeld beschriftung={a.beschriftung} min={a.min} max={a.max} step={a.step} stellen={a.stellen} wert={werte[a.feld]} onChange={eingabe(a.feld)} />
        <Zahlfeld beschriftung={b.beschriftung} min={b.min} max={b.max} step={b.step} stellen={b.stellen} wert={werte[b.feld]} onChange={eingabe(b.feld)} />
      </div>
    </div>
  );

  const speichern = async () => {
    try {
      const gespeichert = await z.uebernimm_regelwerk(new RegelwerkModell({ ...werte }));
      setMeldung({ art: "erfolg", text: "Regelwerk gespeichert und für zukünftige Sitzungen übernommen.", ohneOrdner: !gespeichert });
    } catch (e) {
      setMeldung({ art: "fehler", text: e instanceof ValueError ? `Das Regelwerk wurde nicht gespeichert. ${e.hinweis}` : `Das Regelwerk konnte nicht gespeichert werden: ${(e as Error).message}` });
    }
  };
  const zuruecksetzen = async () => {
    try {
      await z.uebernimm_regelwerk(new RegelwerkModell().validiert());
      setMeldung(null); // st.success(...) + st.rerun(): die Meldung ist nie zu sehen
    } catch (e) {
      setMeldung({ art: "fehler", text: `Das Regelwerk konnte nicht gespeichert werden: ${(e as Error).message}` });
    }
  };

  return (
    <div class="seite-regelwerk">
      <div class="rw-hero">
        <div class="icon">⚙️🍎</div>
        <h1>Regelwerk</h1>
        <p>Stelle die Spielwelt nach deinen Wünschen ein.</p>
      </div>

      <Panel icon="🚢" titel="Importeur" beschreibung="Zukauf von Montag bis Mittwoch, mit täglicher Obergrenze.">
        {feld(F.importeur as FeldDef)}
      </Panel>
      <Panel icon="🧺" titel="Wochenmarkt" beschreibung="Flexibler Zukauf, jederzeit verfügbar, mit täglicher Obergrenze.">
        {feld(F.wochenmarkt as FeldDef)}
      </Panel>
      <Panel icon="🏫" titel="Schulessen" beschreibung="Fester Abnehmer mit garantierter Abnahmemenge und festem Preis.">
        {feld(F.schulessenMenge as FeldDef)}
        {feld(F.schulessenPreis as FeldDef)}
      </Panel>
      <Panel icon="🌳" titel="Obstbauer" beschreibung="Fixer täglicher Lieferant mit fester Menge und festem Preis.">
        {feld(F.obstbauerMenge as FeldDef)}
        {feld(F.obstbauerPreis as FeldDef)}
      </Panel>
      <Panel icon="🥐" titel="Bäckerei" beschreibung="Nachfrage und Preis schwanken – gesteuert über Würfelwerte.">
        {feld(F.aufschlag as FeldDef)}
        {paar("Preiswürfel W1", F.w1Min as FeldDef, F.w1Max as FeldDef)}
        {paar("Nachfragemenge", F.mengeMin as FeldDef, F.mengeMax as FeldDef)}
      </Panel>

      <div class="action-bar raster rw-aktionen">
        <Knopf klasse="rw-knopf primaer" onClick={() => void speichern()}>
          💾 Änderungen übernehmen
        </Knopf>
        <Knopf klasse="rw-knopf" onClick={() => void zuruecksetzen()}>
          ↺ Standardwerte wiederherstellen
        </Knopf>
      </div>

      {meldung?.art === "erfolg" ? (
        <>
          <Meldung art="erfolg">{meldung.text}</Meldung>
          {meldung.ohneOrdner ? (
            <Meldung art="warnung">Kein Spielordner gewählt – das Regelwerk gilt nur für diese Sitzung und wird nicht gespeichert.</Meldung>
          ) : null}
        </>
      ) : null}
      {meldung?.art === "fehler" ? <Meldung art="fehler">{meldung.text}</Meldung> : null}
    </div>
  );
}
