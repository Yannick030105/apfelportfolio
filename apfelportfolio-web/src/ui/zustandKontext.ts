/** Stellt den Spielzustand allen Komponenten bereit und zeichnet bei Aenderungen neu (= Streamlit-Rerun). */
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import type { Spielzustand } from "../state/spielzustand";

export const ZustandKontext = createContext<Spielzustand | null>(null);

export function useSpielzustand(): Spielzustand {
  const zustand = useContext(ZustandKontext);
  if (zustand === null) throw new Error("ZustandKontext fehlt");
  const [, setVersion] = useState(0);
  useEffect(() => zustand.abonniere(() => setVersion((v) => v + 1)), [zustand]);
  return zustand;
}
