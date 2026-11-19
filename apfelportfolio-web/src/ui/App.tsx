/**
 * Hauptkomponente mit Navigation ueber Reiter.
 *
 * Quelle (Python): app.py (st.navigation)
 * Wird befuellt in: Phase 6 - bis dahin nur ein Platzhalter, damit Build und
 * Doppelklick-Start pruefbar sind.
 */
import { APP_VERSION } from "../version";

export function App() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>🍎 Apfelportfolio</h1>
      <p>Version {APP_VERSION} – Gerüst der Web-Version, noch ohne Spielinhalt.</p>
    </main>
  );
}
