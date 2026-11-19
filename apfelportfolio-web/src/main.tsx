/** Start der App. */
import { render } from "preact";
import { App } from "./ui/App";

const wurzel = document.getElementById("app");
if (wurzel === null) {
  throw new Error("Element #app fehlt in index.html.");
}
render(<App />, wurzel);
