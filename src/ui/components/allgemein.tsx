/**
 * Wiederverwendbare Bausteine fuer mehrere Seiten.
 * Quelle (Python): ui/components.py (zeige_kopfzeile, zeige_uebersetzungstabelle)
 * sowie _kpi_karte und st.balloons() aus den Spielseiten.
 */
import { useEffect, useState } from "preact/hooks";
import { UEBERSETZUNG } from "../../content/translations";
import { Caption, Expander, Tabelle, Titel } from "./streamlit";

/** Einheitlicher Seitenkopf ueber allen Level-Seiten. */
export function Kopfzeile({ titel }: { titel: string }) {
  return (
    <>
      <Titel>{titel}</Titel>
      <Caption>Apfelportfolio</Caption>
    </>
  );
}

/** Begleitspalte: Apfel <-> Energiewirtschaft (Konzept Abschnitt 2). */
export function Uebersetzungstabelle() {
  return (
    <Expander titel="Was bedeutet das im Energiehandel?">
      <Tabelle zeilen={UEBERSETZUNG} />
    </Expander>
  );
}

export function KpiKarte({ label, wert }: { label: string; wert: string }) {
  return (
    <div class="kpi-card">
      <div class="kpi-label">{label}</div>
      <div class="kpi-value">{wert}</div>
    </div>
  );
}

/** st.balloons(): aufsteigende Ballons, die nach einigen Sekunden verschwinden. */
export function Ballons() {
  const [sichtbar, setSichtbar] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSichtbar(false), 5000);
    return () => clearTimeout(t);
  }, []);
  if (!sichtbar) return null;
  return (
    <div class="ballons" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span class="ballon" key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.18}s` }}>
          🎈
        </span>
      ))}
    </div>
  );
}
