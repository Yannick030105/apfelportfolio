/** Seitenwechsel aus einer Seite heraus (Ersatz fuer st.switch_page). */
import { createContext } from "preact";
import { useContext } from "preact/hooks";

export type SeitenId = "home" | "level1" | "level2" | "dashboard" | "ranking" | "tutorial" | "wiki" | "regelwerk";

export const NavigationKontext = createContext<(seite: SeitenId) => void>(() => {});

export function useNavigation(): (seite: SeitenId) => void {
  return useContext(NavigationKontext);
}
