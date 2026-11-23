#!/usr/bin/env python3
"""
Erzeugt tests/daten/home_referenz.json: Soll-Werte fuer die Startseite.

Ruft die ORIGINAL-Funktion _spieler_kennzahlen aus ui/pages/home.py auf
(streamlit wird durch eine Attrappe ersetzt) und wertet die Textausdruecke aus
_render_trader_card und _render_vorschau aus. Datengrundlage: dieselben
Log-Zeilen wie tests/daten/ranking_referenz.json (ueber das alte LogRepository).

Mehrdeutigkeit: "letzte Zeile" = sort_values("datum").iloc[-1]; bei mehreren
Durchlaeufen am letzten Datum entscheidet numpys nicht stabile Sortierung
(prozessorabhaengig). Solche Spieler werden markiert ("letzte_eindeutig": false)
und ihre letzte-Zeile-Werte nicht verglichen.

    python3 tools/home_referenz_erzeugen.py [--pruefen] [--legacy PFAD]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import tempfile
from datetime import date
from pathlib import Path
from unittest import mock

WEB_ROOT = Path(__file__).resolve().parent.parent
QUELLE = WEB_ROOT / "tests" / "daten" / "ranking_referenz.json"
ZIEL = WEB_ROOT / "tests" / "daten" / "home_referenz.json"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy", type=Path, default=WEB_ROOT / "legacy")
    parser.add_argument("--pruefen", action="store_true")
    args = parser.parse_args()
    legacy = args.legacy.resolve()
    sys.modules["streamlit"] = mock.MagicMock()
    sys.path.insert(0, str(legacy))
    import pandas as pd
    from src.apfelportfolio.data.repository import LogRepository
    from src.apfelportfolio.data.schema import LogZeile

    spec = importlib.util.spec_from_file_location("home_seite", legacy / "src/apfelportfolio/ui/pages/home.py")
    seite = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(seite)

    zeilen = json.loads(QUELLE.read_text(encoding="utf-8"))["zeilen"]
    with tempfile.TemporaryDirectory() as tmp:
        repo = LogRepository(Path(tmp) / "spiellog.csv")
        for z in zeilen:
            repo.anhaengen(LogZeile(spieler=z["spieler"], datum=date.fromisoformat(z["datum"]), level=z["level"],
                                    endergebnis=z["endergebnis"], rest_long_short=0.0, anteil_spot=0.0,
                                    anteil_grundlast=1.0, prognosefehler=None, referenzergebnis_nichthandeln=0.0))
        df = repo.alle_laden()

    faelle = []
    for spieler in sorted(df["spieler"].unique()) + ["Niemand"]:
        k = seite._spieler_kennzahlen(df, spieler)
        eigene = df[df["spieler"] == spieler]
        eindeutig = eigene.empty or int((eigene["datum"] == eigene["datum"].max()).sum()) == 1
        # Ausdruecke aus _render_trader_card / _render_vorschau
        best_text = f"{k['best']:.2f} €" if k["best"] is not None else "–"
        badge_icons = "".join(b["icon"] for b in k["badges"] if b["freigeschaltet"])
        rang_text = f"#{k['letzter_rang']}" if k["letzter_rang"] else "–"
        gewinn_text = f"{k['letzter_gewinn']:.2f} €" if k["letzter_gewinn"] is not None else "–"
        wochen_text = str(k["wochen"]) if k["wochen"] else "0"
        faelle.append({
            "spieler": spieler,
            "letzte_eindeutig": bool(eindeutig),
            "kennzahlen": {
                "level_label": k["level_label"], "best": k["best"], "letzter_rang": k["letzter_rang"],
                "letzter_gewinn": k["letzter_gewinn"], "wochen": k["wochen"], "badges": k["badges"],
            },
            "texte": {"best_text": best_text, "badge_icons": badge_icons, "rang_text": rang_text,
                      "gewinn_text": gewinn_text, "wochen_text": wochen_text},
        })
    leer = seite._spieler_kennzahlen(df.iloc[0:0], "Anna")
    doc = {"pandas": pd.__version__, "faelle": faelle, "leeres_log": leer}
    text = json.dumps(doc, ensure_ascii=False, indent=1, allow_nan=False) + "\n"
    if args.pruefen:
        ok = ZIEL.exists() and ZIEL.read_text(encoding="utf-8") == text
        print("ok" if ok else "ABWEICHUNG")
        return 0 if ok else 1
    ZIEL.write_text(text, encoding="utf-8")
    print(f"geschrieben: {ZIEL} ({len(faelle)} Spieler, davon mehrdeutig: "
          f"{sum(1 for f in faelle if not f['letzte_eindeutig'])})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
