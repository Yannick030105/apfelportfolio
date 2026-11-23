/**
 * Zeigt ein Vega-Lite-Diagramm (Ersatz fuer st.plotly_chart / st.altair_chart).
 * Ohne Aktionsmenue (das enthielte Links ins Internet) und ohne Netzwerkzugriff:
 * alle Daten stehen in der Spezifikation.
 */
import { useEffect, useRef } from "preact/hooks";
import embed from "vega-embed";
import type { TopLevelSpec } from "vega-lite";

export function VegaDiagramm({ spec, beschreibung }: { spec: TopLevelSpec; beschreibung: string }) {
  const ziel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ziel.current;
    if (el === null) return;
    let beendet = false;
    let aufraeumen: (() => void) | null = null;
    embed(el, spec, { actions: false, renderer: "svg" })
      .then((ergebnis) => {
        if (beendet) ergebnis.finalize();
        else aufraeumen = () => ergebnis.finalize();
      })
      .catch((e: unknown) => {
        el.textContent = `Diagramm konnte nicht gezeichnet werden: ${(e as Error).message}`;
      });
    return () => {
      beendet = true;
      aufraeumen?.();
    };
  }, [spec]);
  return <div ref={ziel} role="img" aria-label={beschreibung} style={{ width: "100%" }} />;
}
