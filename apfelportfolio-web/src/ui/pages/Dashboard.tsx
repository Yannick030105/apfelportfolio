/**
 * Dashboard-Seite: Statistik-Bildschirm im Spiel-Design.
 *
 * Quelle (Python): src/apfelportfolio/ui/pages/2_dashboard.py
 * (layout="wide", max. 1180 px). Alle Kennzahlen beziehen sich auf den
 * aktuell gewaehlten Spieler; KPIs aus kpis.ts, Seitenberechnungen aus
 * src/dashboard/dashboard.ts. Texte und Formate woertlich.
 *
 * Nachgebildetes Streamlit-Verhalten (MIGRATION_NOTES, Phase 6/3):
 *   - Log bei jedem Aufruf neu lesen (repo.alle_laden()).
 *   - st.selectbox("Level"): Auswahl bleibt, solange die Seite offen ist;
 *     beim Wiederkommen steht sie wieder auf "Level 1".
 *   - Diagramme in zwei Spalten; Achievements in der schmalen rechten Spalte.
 */
import { useEffect, useMemo, useState } from "preact/hooks";
import { daten_fuer_level, DASHBOARD_LEVEL, histogramm_klassen, profil } from "../../dashboard/dashboard";
import {
  bestes_ergebnis,
  durchschnittsergebnis,
  ergebnis_streuung,
  ermittele_badges,
  hat_genug_daten_fuer_verlauf,
  schlechtestes_ergebnis,
} from "../../dashboard/kpis";
import { ergebnisentwicklung_spec, gewinnverteilung_spec, lernkurve_spec } from "../charts/dashboard";
import { KpiKarte } from "../components/allgemein";
import { Auswahl, Klein, Meldung } from "../components/streamlit";
import { VegaDiagramm } from "../components/VegaDiagramm";
import { fix } from "../format";
import { useSpielzustand } from "../zustandKontext";

function Profil({ spieler, p }: { spieler: string; p: ReturnType<typeof profil> }) {
  return (
    <div class="profile-panel">
      <div class="profile-avatar">👤</div>
      <div>
        <p class="profile-name">{spieler}</p>
        <div class="profile-stats">
          <span class="profile-stat">
            Level <b>{p.hoechstes_level !== 0 ? p.hoechstes_level : "–"}</b>
          </span>
          <span class="profile-stat">
            Bestes Ergebnis <b>{fix(p.bestes, 2)} €</b>
          </span>
          <span class="profile-stat">
            Gespielte Wochen <b>{p.anzahl_wochen}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

function Diagramme({ werte, spieler, level }: { werte: readonly number[]; spieler: string; level: number }) {
  const lernkurve = useMemo(() => lernkurve_spec(werte), [werte]);
  const entwicklung = useMemo(() => ergebnisentwicklung_spec(werte), [werte]);
  const verteilung = useMemo(() => gewinnverteilung_spec(werte, histogramm_klassen(werte.length)), [werte]);
  return (
    <>
      <p class="menu-heading">Lernkurve</p>
      {hat_genug_daten_fuer_verlauf(werte.map((endergebnis) => ({ endergebnis }))) ? (
        <VegaDiagramm spec={lernkurve} beschreibung={`Lernkurve von ${spieler} in Level ${level}`} />
      ) : (
        <Klein>Noch zu wenige Durchläufe (mind. 5) für eine aussagekräftige Lernkurve. Bisher: {werte.length}</Klein>
      )}
      <p class="menu-heading">Details</p>
      <div class="raster raster-2">
        <div>
          <VegaDiagramm spec={entwicklung} beschreibung={`Ergebnisentwicklung von ${spieler} in Level ${level}`} />
        </div>
        <div>
          <VegaDiagramm spec={verteilung} beschreibung={`Gewinnverteilung von ${spieler} in Level ${level}`} />
        </div>
      </div>
    </>
  );
}

export function Dashboard() {
  const z = useSpielzustand();
  const [level_auswahl, setLevel] = useState<number>(DASHBOARD_LEVEL[0] as number);
  useEffect(() => {
    void z.lade_spielstaende(); // wie repo.alle_laden() bei jedem Aufruf
  }, [z]);

  const spieler = z.spieler;
  const df_alle = z.log_zeilen();
  const df = spieler === null ? [] : daten_fuer_level(df_alle, spieler, level_auswahl);
  const werte = useMemo(() => df.map((r) => r.endergebnis), [df.map((r) => r.endergebnis).join("|")]);

  const kopf = (
    <div class="db-hero">
      <p class="db-hero-titel">📊 Dashboard</p>
      <p class="db-hero-text">Deine Handelsstatistik im Überblick.</p>
    </div>
  );

  if (spieler === null) {
    return (
      <div class="seite-db">
        {kopf}
        <Meldung art="info">Wähle auf der Startseite zuerst einen Händler aus, um dein Dashboard zu sehen.</Meldung>
      </div>
    );
  }
  if (df_alle.length === 0) {
    return (
      <div class="seite-db">
        {kopf}
        <Meldung art="info">Noch keine Durchläufe vorhanden. Spiel zuerst eine Runde.</Meldung>
      </div>
    );
  }

  const streuung = ergebnis_streuung(df);
  return (
    <div class="seite-db">
      {kopf}
      <Profil spieler={spieler} p={profil(df_alle, spieler)} />
      <Auswahl
        beschriftung="Level"
        optionen={DASHBOARD_LEVEL}
        wert={level_auswahl}
        anzeige={(l) => `Level ${l}`}
        onChange={setLevel}
      />
      {df.length === 0 ? (
        <Meldung art="info">Noch keine Durchläufe für dieses Level. Spiel zuerst eine Runde.</Meldung>
      ) : (
        <div class="raster raster-haupt-seite">
          <div>
            <div class="raster raster-4">
              <KpiKarte label="Durchschnitt" wert={`${fix(durchschnittsergebnis(df) as number, 2)} €`} />
              <KpiKarte label="Bestes Ergebnis" wert={`${fix(bestes_ergebnis(df) as number, 2)} €`} />
              <KpiKarte label="Schlechtestes Ergebnis" wert={`${fix(schlechtestes_ergebnis(df) as number, 2)} €`} />
              <KpiKarte label="Stabilität" wert={streuung !== null ? `${fix(streuung, 2)} €` : "–"} />
            </div>
            <Diagramme werte={werte} spieler={spieler} level={level_auswahl} />
          </div>
          <div>
            <p class="menu-heading">Achievements</p>
            {ermittele_badges(df).map((erfolg) => (
              <div class={erfolg.freigeschaltet ? "badge-card unlocked" : "badge-card locked"} key={erfolg.titel}>
                <div class="badge-icon">{erfolg.icon}</div>
                <div>
                  <p class="badge-title">{erfolg.titel}</p>
                  <p class="badge-desc">{erfolg.beschreibung}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
