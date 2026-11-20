/**
 * Ranking-Seite: Highscore-Bildschirm im Spiel-Design.
 *
 * Quelle (Python): src/apfelportfolio/ui/pages/3_ranking.py
 * (set_page_config(layout="centered")). Texte, Aufbau und Formate wie dort;
 * die Berechnungen liegen in src/dashboard/ranking.ts.
 *
 * Nachgebildetes Streamlit-Verhalten (MIGRATION_NOTES, Phase 6/2):
 *   - Das Original liest bei jedem Aufruf das Log neu (repo.alle_laden()) -
 *     hier werden beim Oeffnen der Seite die Spielstaende neu geladen.
 *   - st.tabs: beide Level-Reiter sind gezeichnet, Umschalten ohne Neustart.
 *   - st.expander mit Plotly-Diagramm: Diagramm erst beim Aufklappen.
 */
import { useEffect, useMemo } from "preact/hooks";
import { badge_icons, eigene_statistik, highscores_je_level, verlauf, type Bestenplatz } from "../../dashboard/ranking";
import { LEVEL_REGISTRY } from "../../levels/registry";
import type { LogZeile } from "../../storage/schema";
import { verlauf_spec } from "../charts/verlauf";
import { Expander, Klein, Meldung, Reiter } from "../components/streamlit";
import { VegaDiagramm } from "../components/VegaDiagramm";
import { fix } from "../format";
import { useSpielzustand } from "../zustandKontext";

const MEDAILLEN: Readonly<Record<number, string>> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const GOLD = "#E8A33D";

/** Top-3 als gross hervorgehobenes Siegertreppchen (Reihenfolge 2. - 1. - 3.). */
function Podium({ bestenliste, df_level }: { bestenliste: readonly Bestenplatz[]; df_level: readonly LogZeile[] }) {
  const top3 = bestenliste.slice(0, 3);
  if (top3.length === 0) return null;
  const reihenfolge = [2, 1, 3].filter((r) => r <= top3.length);
  const hoehen: Record<number, number> = { 1: 200, 2: 150, 3: 115 };
  return (
    <div class="podium" style={{ gridTemplateColumns: `repeat(${reihenfolge.length}, minmax(0, 1fr))` }}>
      {reihenfolge.map((rang) => {
        const zeile = top3[rang - 1] as Bestenplatz;
        const farbe =
          rang === 1
            ? `linear-gradient(180deg, #FFE3AE 0%, ${GOLD} 60%, #C97B1F 100%)`
            : rang === 2
              ? "linear-gradient(180deg, #F1F3F5 0%, #C9CDD3 60%, #9AA0A8 100%)"
              : "linear-gradient(180deg, #E8B98A 0%, #CE8946 60%, #A6621F 100%)";
        return (
          <div key={rang}>
            <div class="podium-medal">{MEDAILLEN[rang] ?? ""}</div>
            <div class="podium-name">{zeile.spieler}</div>
            <div class="podium-badges">{badge_icons(df_level, zeile.spieler)}</div>
            <div class="podium-block" style={{ background: farbe, height: `${hoehen[rang] ?? 100}px` }}>
              <span class="podium-score">{fix(zeile.endergebnis, 0)} €</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Vollstaendige Rangliste als Spielerkarten, aktiver Spieler deutlich hervorgehoben. */
function Bestenliste({
  bestenliste,
  aktiver_spieler,
  level,
  df_level,
}: {
  bestenliste: readonly Bestenplatz[];
  aktiver_spieler: string | null;
  level: number;
  df_level: readonly LogZeile[];
}) {
  return (
    <>
      {bestenliste.map((zeile) => {
        const ist_aktiv = aktiver_spieler !== null && zeile.spieler === aktiver_spieler;
        const medaille = MEDAILLEN[zeile.rang] ?? `${zeile.rang}.`;
        return (
          <div class={ist_aktiv ? "rank-card is-active" : "rank-card"} key={zeile.spieler}>
            <div class="rank-left">
              <span class="rank-num">{medaille}</span>
              <div class="rank-avatar">👤</div>
              <div>
                <div class="rank-name">
                  {zeile.spieler}
                  {ist_aktiv ? " 🎮" : ""}
                </div>
                <span class="rank-level">Level {level}</span>
              </div>
            </div>
            <div class="rank-right">
              <span class="rank-badges">{badge_icons(df_level, zeile.spieler)}</span>
              <span class="rank-score">{fix(zeile.endergebnis, 2)} €</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Score-Verlauf ueber die Zeit fuer einen einzelnen Spieler. */
function Verlaufschart({ zeilen, level, spieler }: { zeilen: readonly LogZeile[]; level: number; spieler: string }) {
  const punkte = useMemo(
    () => verlauf(zeilen, level, spieler).map((z) => ({ datum: z.datum ?? "", endergebnis: z.endergebnis })),
    [zeilen, level, spieler],
  );
  const spec = useMemo(() => verlauf_spec(punkte), [punkte]);
  if (punkte.length < 2) {
    return <Klein>Spiele mindestens zwei Durchläufe, um deinen Verlauf zu sehen.</Klein>;
  }
  return <VegaDiagramm spec={spec} beschreibung={`Verlauf der Endergebnisse von ${spieler} in Level ${level}`} />;
}

/** Eigener Rang, Abstand zu Platz 1, Bestes Ergebnis und persoenlicher Verlauf. */
function EigeneStatistik({
  bestenliste,
  aktiver_spieler,
  level,
  zeilen,
}: {
  bestenliste: readonly Bestenplatz[];
  aktiver_spieler: string;
  level: number;
  zeilen: readonly LogZeile[];
}) {
  const s = eigene_statistik(bestenliste, aktiver_spieler);
  if (s === null) return null;
  const abstand_text = s.abstand === null ? "0.00 €" : `${fix(s.abstand, 2)} €`;
  return (
    <>
      {s.abstand === null ? (
        <Meldung art="erfolg">🏆 Du führst die Bestenliste in Level {level} an!</Meldung>
      ) : (
        <Meldung art="info">
          Du stehst auf Platz {s.eigener_rang} von {s.gesamt}. Nur {fix(s.abstand, 2)} € fehlen dir zu Platz 1 – weiterspielen lohnt sich!
        </Meldung>
      )}
      <p class="menu-heading">Deine Statistik</p>
      <div class="stats-strip">
        <div class="stats-chip">
          <span class="num">#{s.eigener_rang}</span>
          <span class="cap">Dein Rang</span>
        </div>
        <div class="stats-chip">
          <span class="num">{abstand_text}</span>
          <span class="cap">Abstand zu Platz 1</span>
        </div>
        <div class="stats-chip">
          <span class="num">{fix(s.bestes_ergebnis, 2)} €</span>
          <span class="cap">Bestes Ergebnis</span>
        </div>
      </div>
      <Expander titel="📈 Dein persönlicher Verlauf" erst_beim_oeffnen>
        <Verlaufschart zeilen={zeilen} level={level} spieler={aktiver_spieler} />
      </Expander>
    </>
  );
}

export function Ranking() {
  const z = useSpielzustand();
  useEffect(() => {
    void z.lade_spielstaende(); // wie repo.alle_laden() bei jedem Aufruf
  }, [z]);

  const df = z.log_zeilen();
  const aktiver_spieler = z.spieler;
  // Im Original fest ["Level 1", "Level 2"]; hier aus der Level-Registry (gleiches Ergebnis).
  const level_liste = LEVEL_REGISTRY.map((e) => e.nummer);

  return (
    <div class="seite-schmal ranking-seite">
      <div class="rk-hero">
        <div class="icon">🥇🍎</div>
        <h1>Ranking</h1>
        <p>Die besten Wochenergebnisse aller Obsthändler.</p>
      </div>
      {df.length === 0 ? (
        <Meldung art="info">Es liegen noch keine ausgewerteten Durchläufe vor. Spiele eine Runde, um in der Bestenliste zu erscheinen!</Meldung>
      ) : (
        <Reiter
          titel={level_liste.map((l) => `Level ${l}`)}
          inhalt={(i) => {
            const level = level_liste[i] as number;
            const bestenliste = highscores_je_level(df, level);
            if (bestenliste.length === 0) {
              return <Meldung art="info">Für Level {level} liegen noch keine Ergebnisse vor.</Meldung>;
            }
            const df_level = df.filter((r) => r.level === level);
            return (
              <>
                <Podium bestenliste={bestenliste} df_level={df_level} />
                <div style={{ height: "1.3rem" }} />
                <p class="menu-heading">Alle Händler</p>
                <Bestenliste bestenliste={bestenliste} aktiver_spieler={aktiver_spieler} level={level} df_level={df_level} />
                {aktiver_spieler !== null && bestenliste.some((b) => b.spieler === aktiver_spieler) ? (
                  <EigeneStatistik bestenliste={bestenliste} aktiver_spieler={aktiver_spieler} level={level} zeilen={df} />
                ) : null}
              </>
            );
          }}
        />
      )}
    </div>
  );
}
