/** Start der App. */
import { render } from "preact";
import { Spielzustand } from "./state/spielzustand";
import { App } from "./ui/App";
import "./ui/styles.css";

const wurzel = document.getElementById("app");
if (wurzel === null) {
  throw new Error("Element #app fehlt in index.html.");
}
render(<App zustand={new Spielzustand()} />, wurzel);
