/**
 * Schlichte Nachbildungen der Streamlit-Elemente, die die Seiten verwenden
 * (st.title, st.caption, st.write, st.divider, st.expander, st.table,
 * st.button, st.success/error/warning/info, st.caption, st.toggle, st.slider).
 */
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

export function Titel({ children }: { children: ComponentChildren }) {
  return <h1 class="st-titel">{children}</h1>;
}

export function Caption({ children }: { children: ComponentChildren }) {
  return <p class="st-caption">{children}</p>;
}

/** st.caption innerhalb von Spalten (kleiner, ohne Abstand nach unten) */
export function Klein({ children }: { children: ComponentChildren }) {
  return <p class="st-klein">{children}</p>;
}

export function Text({ children }: { children: ComponentChildren }) {
  return <p class="st-text">{children}</p>;
}

export function Trenner() {
  return <hr class="st-divider" />;
}

/**
 * st.expander. Mit erst_beim_oeffnen wird der Inhalt erst gezeichnet, wenn der
 * Bereich offen ist (noetig fuer Diagramme, die ihre Breite messen).
 */
export function Expander({
  titel,
  children,
  offen = false,
  erst_beim_oeffnen = false,
}: {
  titel: string;
  children: ComponentChildren;
  offen?: boolean;
  erst_beim_oeffnen?: boolean;
}) {
  const [istOffen, setOffen] = useState(offen);
  return (
    <details class="st-expander" open={offen} onToggle={(e) => setOffen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{titel}</summary>
      <div class="st-expander-inhalt">{!erst_beim_oeffnen || istOffen ? children : null}</div>
    </details>
  );
}

/**
 * st.tabs([...]): alle Reiter sind gezeichnet, nur der gewaehlte ist sichtbar;
 * Umschalten loest wie in Streamlit keinen Neustart aus (Zustand bleibt).
 */
export function Reiter({ titel, inhalt }: { titel: readonly string[]; inhalt: (index: number) => ComponentChildren }) {
  const [aktiv, setAktiv] = useState(0);
  return (
    <div class="st-tabs">
      <div class="st-tabs-leiste" role="tablist">
        {titel.map((t, i) => (
          <button type="button" role="tab" key={t} aria-selected={i === aktiv} class="st-tab" onClick={() => setAktiv(i)}>
            {t}
          </button>
        ))}
      </div>
      {titel.map((t, i) => (
        <div role="tabpanel" key={t} hidden={i !== aktiv} class="st-tab-inhalt">
          {inhalt(i)}
        </div>
      ))}
    </div>
  );
}

/** st.table(liste_von_dicts): Spaltenkoepfe = Schluessel, mit Zeilenindex 0..n-1 wie Streamlit. */
export function Tabelle<T extends object>({ zeilen }: { zeilen: readonly T[] }) {
  const spalten = zeilen.length > 0 ? (Object.keys(zeilen[0] as object) as (keyof T)[]) : [];
  return (
    <table class="st-tabelle">
      <thead>
        <tr>
          <th />
          {spalten.map((s) => (
            <th key={String(s)}>{String(s)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {zeilen.map((z, i) => (
          <tr key={i}>
            <td class="index">{i}</td>
            {spalten.map((s) => (
              <td key={String(s)}>{String(z[s])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Knopf({
  children,
  onClick,
  disabled = false,
  klasse = "st-button",
}: {
  children: ComponentChildren;
  onClick: () => void;
  disabled?: boolean;
  klasse?: string;
}) {
  return (
    <button type="button" class={klasse} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export type MeldungsArt = "erfolg" | "fehler" | "warnung" | "info";

export function Meldung({ art, children }: { art: MeldungsArt; children: ComponentChildren }) {
  return (
    <div class={`st-meldung ${art}`} role={art === "fehler" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function Schalter({ beschriftung, wert, onChange }: { beschriftung: string; wert: boolean; onChange: (w: boolean) => void }) {
  return (
    <label class="st-schalter">
      <input type="checkbox" role="switch" checked={wert} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
      <span>{beschriftung}</span>
    </label>
  );
}

/**
 * st.slider(label, min_value, max_value, value, label_visibility="collapsed").
 * Den Wert verwaltet der Aufrufer (WidgetZustand), damit das Streamlit-Verhalten
 * beim Rerun erhalten bleibt. min >= max fuehrt in Streamlit zu einer Ausnahme -
 * hier eine Fehlermeldung an derselben Stelle.
 */
export function Schieberegler({
  beschriftung,
  min,
  max,
  wert,
  onChange,
}: {
  beschriftung: string;
  min: number;
  max: number;
  wert: number;
  onChange: (w: number) => void;
}) {
  if (min >= max) {
    return (
      <Meldung art="fehler">
        <span class="fehlertyp">StreamlitAPIException:</span> Slider `min_value` must be less than the `max_value`. The
        values were {min} and {max}.
      </Meldung>
    );
  }
  return (
    <div class="st-slider">
      <div class="st-slider-wert" aria-hidden="true">
        {wert}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={wert}
        aria-label={beschriftung}
        onInput={(e) => onChange(Number((e.currentTarget as HTMLInputElement).value))}
      />
      <div class="st-slider-grenzen" aria-hidden="true">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

/** st.selectbox(label, options, format_func=...) mit sichtbarer Beschriftung. */
export function Auswahl<T extends string | number>({
  beschriftung,
  optionen,
  wert,
  anzeige,
  onChange,
}: {
  beschriftung: string;
  optionen: readonly T[];
  wert: T;
  anzeige: (option: T) => string;
  onChange: (wert: T) => void;
}) {
  return (
    <label class="st-auswahl">
      <span class="st-auswahl-titel">{beschriftung}</span>
      <select
        value={String(wert)}
        onChange={(e) => {
          const i = (e.currentTarget as HTMLSelectElement).selectedIndex;
          const neu = optionen[i];
          if (neu !== undefined) onChange(neu);
        }}
      >
        {optionen.map((o) => (
          <option key={String(o)} value={String(o)}>
            {anzeige(o)}
          </option>
        ))}
      </select>
    </label>
  );
}
