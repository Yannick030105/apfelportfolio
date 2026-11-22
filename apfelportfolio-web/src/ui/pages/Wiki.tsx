/**
 * Wiki-Seite: Nachschlagewerk Obsthandel <-> Energiehandel.
 *
 * Quelle (Python): src/apfelportfolio/ui/pages/5_wiki.py (layout="wide",
 * max. 1100 px). Inhalt woertlich aus KAPITEL (src/content/texte/wiki.md),
 * Diagramme aus src/ui/charts/wiki.ts.
 *
 * Nachgebildetes Streamlit-Verhalten (MIGRATION_NOTES, Phase 6/6):
 *   - Kapitelwahl per st.sidebar.radio("Kapitel") unter der Ueberschrift
 *     "📖 Nachschlagewerk": hier als Register links neben dem Inhalt (die
 *     Web-Version hat keine Seitenleiste). Startwert erstes Kapitel; die Wahl
 *     bleibt, solange die Seite offen ist, und ist nach einem Seitenwechsel
 *     wieder beim ersten Kapitel (Widget-Zustand ohne key).
 */
import { useMemo, useState } from "preact/hooks";
import { WIKI } from "../../content/wiki";
import { wiki_diagramm } from "../charts/wiki";
import { VegaDiagramm } from "../components/VegaDiagramm";

export function Wiki() {
  const optionen = WIKI.reihenfolge;
  const [kapitel_key, setKapitel] = useState<string>(optionen[0] as string);
  const kapitel = WIKI.kapitel[kapitel_key];
  const diagramm = useMemo(() => wiki_diagramm(kapitel_key), [kapitel_key]);
  if (kapitel === undefined) return null;

  return (
    <div class="seite-wiki">
      <div class="wk-hero">
        <div class="icon">📖🍎⚡</div>
        <h1>Wiki</h1>
        <p>Vom Apfelkorb zum Stromnetz – wie Obsthandel und Energiehandel zusammenhängen.</p>
      </div>

      <div class="wiki-raster">
        <nav class="wiki-register" aria-label="Kapitel">
          <p class="nav-heading">📖 Nachschlagewerk</p>
          <div role="radiogroup" aria-label="Kapitel">
            {optionen.map((key) => {
              const k = WIKI.kapitel[key];
              if (k === undefined) return null;
              return (
                <label class="wiki-option" key={key}>
                  <input type="radio" name="wiki-kapitel" checked={key === kapitel_key} onChange={() => setKapitel(key)} />
                  <span>
                    {k.icon} {k.titel}
                  </span>
                </label>
              );
            })}
          </div>
        </nav>

        <div>
          <div class="chapter-header">
            <div class="chapter-icon">{kapitel.icon}</div>
            <p class="chapter-title">{kapitel.titel}</p>
          </div>
          <p class="chapter-intro">{kapitel.intro}</p>

          {diagramm !== null ? (
            <div class="wiki-diagramm">
              <VegaDiagramm key={kapitel_key} spec={diagramm} beschreibung={`Beispieldiagramm zum Kapitel ${kapitel.titel}`} />
            </div>
          ) : null}

          {kapitel.begriffe.map((begriff) => (
            <div class="term-card" key={begriff.name}>
              <p class="term-name">{begriff.name}</p>
              <p class="term-def">{begriff.definition}</p>
              <div class="example-row">
                <div class="example-box obst">
                  <span class="example-label">🍎 Obstbeispiel</span>
                  {begriff.obst}
                </div>
                <div class="example-box energie">
                  <span class="example-label">⚡ Energiebeispiel</span>
                  {begriff.energie}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
