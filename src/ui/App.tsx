/**
 * Hauptkomponente mit Navigation ueber Reiter.
 *
 * Quelle (Python): app.py (st.navigation mit den Gruppen "Spiel", "Analyse",
 * "Hilfe", Seitentitel und -symbole wie dort) und set_page_config der Seiten.
 * Statt der Streamlit-Seitenleiste: Reiter oben, gruppiert wie im Original.
 * Level 1 und Level 2 sind zwei Reiter, die dieselbe Spielseite zeigen.
 */
import { useEffect, useState } from "preact/hooks";
import type { LevelId } from "../levels/registry";
import type { Spielzustand } from "../state/spielzustand";
import { SpeicherLeiste } from "./components/SpeicherLeiste";
import { Dashboard } from "./pages/Dashboard";
import { Home } from "./pages/Home";
import { Ranking } from "./pages/Ranking";
import { Regelwerk } from "./pages/Regelwerk";
import { Tutorial } from "./pages/Tutorial";
import { Wiki } from "./pages/Wiki";
import { NavigationKontext, type SeitenId } from "./navigation";
import { SEITENKOPF, Spielen } from "./pages/Spielen";
import { starte_verbindung, type Verbindung } from "./speicherVerbindung";
import { ZustandKontext } from "./zustandKontext";

interface Seite {
  id: SeitenId;
  titel: string;
  icon: string;
}

/** Wie pg = st.navigation({...}) in app.py */
const NAVIGATION: readonly { gruppe: string; seiten: readonly Seite[] }[] = [
  {
    gruppe: "Spiel",
    seiten: [
      { id: "home", titel: "Home", icon: "🏠" },
      { id: "level1", titel: "Level 1", icon: "1️⃣" },
      { id: "level2", titel: "Level 2", icon: "2️⃣" },
    ],
  },
  {
    gruppe: "Analyse",
    seiten: [
      { id: "dashboard", titel: "Dashboard", icon: "📊" },
      { id: "ranking", titel: "Ranking", icon: "🥇" },
    ],
  },
  {
    gruppe: "Hilfe",
    seiten: [
      { id: "tutorial", titel: "Tutorial", icon: "📕" },
      { id: "wiki", titel: "Wiki", icon: "📖" },
      { id: "regelwerk", titel: "Regelwerk", icon: "⚙️" },
    ],
  },
];

/** set_page_config(page_title, page_icon) */
function seitenkopf(id: SeitenId): { titel: string; icon: string } {
  if (id === "level1" || id === "level2") return SEITENKOPF[id as LevelId];
  if (id === "ranking") return { titel: "Ranking – Apfelportfolio", icon: "🥇" };
  if (id === "dashboard") return { titel: "Dashboard – Apfelportfolio", icon: "📊" };
  if (id === "tutorial") return { titel: "Tutorial – Apfelportfolio", icon: "🎓" };
  if (id === "wiki") return { titel: "Wiki – Apfelportfolio", icon: "📖" };
  if (id === "regelwerk") return { titel: "Regelwerk – Apfelportfolio", icon: "📜" };
  return { titel: "Apfelportfolio", icon: "🍎" };
}

function setzeBrowserkopf(titel: string, icon: string): void {
  document.title = titel;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icon}</text></svg>`;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (link === null) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.append(link);
  }
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function App({ zustand }: { zustand: Spielzustand }) {
  const [seite, setSeite] = useState<SeitenId>("home"); // erste Seite wie in st.navigation
  const [verbindung, setVerbindung] = useState<Verbindung | null>(null);
  const [, setZaehler] = useState(0);
  const neu_zeichnen = () => setZaehler((n) => n + 1);

  useEffect(() => {
    let aktiv = true;
    starte_verbindung(zustand, neu_zeichnen)
      .then((v) => aktiv && setVerbindung(v))
      .catch(() => aktiv && setVerbindung({ ordnerzugriff: false, wartender_ordner: null, datei: null }));
    return () => {
      aktiv = false;
    };
  }, [zustand]);

  useEffect(() => {
    const kopf = seitenkopf(seite);
    setzeBrowserkopf(kopf.titel, kopf.icon);
  }, [seite]);

  return (
    <ZustandKontext.Provider value={zustand}>
      <NavigationKontext.Provider value={setSeite}>
      <header class="app-kopf">
        <div class="app-kopf-innen">
          <nav class="reiter-leiste" aria-label="Seiten">
            {NAVIGATION.map(({ gruppe, seiten }) => (
              <div class="reiter-gruppe" key={gruppe}>
                <span class="reiter-gruppe-titel">{gruppe}</span>
                <div class="reiter-gruppe-reiter" role="tablist">
                  {seiten.map((s) => (
                    <button type="button" role="tab" class="reiter" key={s.id} aria-selected={seite === s.id} onClick={() => setSeite(s.id)}>
                      {s.icon} {s.titel}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <SpeicherLeiste verbindung={verbindung} neu_zeichnen={neu_zeichnen} />
        </div>
      </header>
      <main class="seite">
        {seite === "home" ? <Home /> : null}
        {seite === "level1" || seite === "level2" ? <Spielen key={seite} levelId={seite} /> : null}
        {seite === "dashboard" ? <Dashboard /> : null}
        {seite === "ranking" ? <Ranking /> : null}
        {seite === "tutorial" ? <Tutorial /> : null}
        {seite === "wiki" ? <Wiki /> : null}
        {seite === "regelwerk" ? <Regelwerk /> : null}
      </main>
      </NavigationKontext.Provider>
    </ZustandKontext.Provider>
  );
}
