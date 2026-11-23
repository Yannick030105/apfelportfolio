/**
 * Tutorial-Seite: interaktive Einfuehrung ins Spiel.
 *
 * Quelle (Python): src/apfelportfolio/ui/pages/4_tutorial.py
 * (layout="centered", max. 720 px). Inhalt woertlich aus SCHRITTE
 * (src/content/texte/tutorial.md), Fortschritt nur im Sitzungszustand.
 *
 * Nachgebildetes Streamlit-Verhalten (MIGRATION_NOTES, Phase 6/5):
 *   - st.session_state.tutorial_schritt: der Schritt bleibt beim Seitenwechsel
 *     erhalten (im Original gemessen) und wird auf 0..n-1 begrenzt.
 *   - "⬅ Zurueck" ist auf Schritt 1 deaktiviert; auf dem letzten Schritt wird
 *     "Weiter ➜" zu "🚀 Zur Startseite" (Schritt auf 0, st.switch_page).
 */
import { SCHRITTE } from "../../content/tutorial";
import { Knopf } from "../components/streamlit";
import { useNavigation } from "../navigation";
import { useSpielzustand } from "../zustandKontext";

export function Tutorial() {
  const z = useSpielzustand();
  const navigiere = useNavigation();
  const gesamt = SCHRITTE.length;
  const index = Math.max(0, Math.min(z.tutorial_schritt, gesamt - 1));
  const schritt = SCHRITTE[index] as (typeof SCHRITTE)[number];

  return (
    <div class="seite-tutorial">
      <div class="tut-hero">
        <p class="tut-hero-icon">🎓🍎</p>
        <h1>Tutorial</h1>
        <p>So funktioniert dein Apfelhandel – Schritt für Schritt.</p>
      </div>

      <div class="progress-dots" role="progressbar" aria-valuemin={1} aria-valuemax={gesamt} aria-valuenow={index + 1}>
        {SCHRITTE.map((_, i) => (
          <span key={i} class={i === index ? "dot current" : i < index ? "dot done" : "dot"} />
        ))}
      </div>

      <div class="step-card">
        <div class="step-illustration">{schritt.icon}</div>
        <p class="step-label">
          Schritt {index + 1} von {gesamt}
        </p>
        <p class="step-title">{schritt.titel}</p>
        <p class="step-text">{schritt.erklaerung}</p>
        <div class="step-example">💡 {schritt.beispiel}</div>
      </div>

      <div class="raster raster-2 nav-row">
        <div>
          <Knopf klasse="tut-knopf" onClick={() => z.setze_tutorial_schritt(Math.max(0, index - 1))} disabled={index === 0}>
            ⬅ Zurück
          </Knopf>
        </div>
        <div>
          {index < gesamt - 1 ? (
            <Knopf klasse="tut-knopf gold" onClick={() => z.setze_tutorial_schritt(index + 1)}>
              Weiter ➜
            </Knopf>
          ) : (
            <Knopf
              klasse="tut-knopf gold"
              onClick={() => {
                z.setze_tutorial_schritt(0);
                navigiere("home");
              }}
            >
              🚀 Zur Startseite
            </Knopf>
          )}
        </div>
      </div>
    </div>
  );
}
