#!/usr/bin/env python3
"""
Erzeugt tests/daten/dashboard_referenz.json: Soll-Werte fuer die Dashboard-Seite.

Datengrundlage: dieselben Log-Zeilen wie tests/daten/ranking_referenz.json
(echte spiellog.csv + Referenzwochen, ueber das alte LogRepository gelesen).
Je Spieler und Level werden die Ausdruecke aus ui/pages/2_dashboard.py
ausgewertet (Profil, KPI-Texte, Lernkurven-Schwelle, Balkenfarben,
Histogramm-Klassenzahl, Achievements) - mit den ORIGINAL-KPI-Funktionen.

    python3 tools/dashboard_referenz_erzeugen.py [--pruefen] [--legacy PFAD]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parent.parent
QUELLE = WEB_ROOT / "tests" / "daten" / "ranking_referenz.json"
ZIEL = WEB_ROOT / "tests" / "daten" / "dashboard_referenz.json"
AKZENT = "#C0392B"
GOLD = "#E8A33D"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy", type=Path, default=WEB_ROOT.parent)
    parser.add_argument("--pruefen", action="store_true")
    args = parser.parse_args()
    sys.path.insert(0, str(args.legacy.resolve()))
    import pandas as pd
    from src.apfelportfolio.dashboard.kpis import (
        bestes_ergebnis, durchschnittsergebnis, ergebnis_streuung, ermittele_badges,
        hat_genug_daten_fuer_verlauf, schlechtestes_ergebnis,
    )

    zeilen = json.loads(QUELLE.read_text(encoding="utf-8"))["zeilen"]
    df_alle = pd.DataFrame(zeilen)
    spieler_liste = sorted(df_alle["spieler"].unique()) + ["Niemand"]

    faelle = []
    for spieler in spieler_liste:
        # _render_profil
        df_spieler_alle_level = df_alle[df_alle["spieler"] == spieler]
        hoechstes_level = int(df_spieler_alle_level["level"].max()) if not df_spieler_alle_level.empty else 0
        bestes = float(df_spieler_alle_level["endergebnis"].max()) if not df_spieler_alle_level.empty else 0.0
        anzahl_wochen = int(len(df_spieler_alle_level))
        profil = {
            "level_text": f"{hoechstes_level if hoechstes_level else '–'}",
            "bestes_text": f"{bestes:.2f} €",
            "wochen_text": f"{anzahl_wochen}",
        }
        je_level = {}
        for level in (1, 2, 3, 4):
            df_level = df_alle[df_alle["level"] == level].reset_index(drop=True)
            df = df_level[df_level["spieler"] == spieler]
            if df.empty:
                je_level[str(level)] = None
                continue
            streuung = ergebnis_streuung(df)
            verlauf = list(df.reset_index()["endergebnis"])
            je_level[str(level)] = {
                "kpis": [f"{durchschnittsergebnis(df):.2f} €", f"{bestes_ergebnis(df):.2f} €",
                         f"{schlechtestes_ergebnis(df):.2f} €",
                         f"{streuung:.2f} €" if streuung is not None else "–"],
                "lernkurve": hat_genug_daten_fuer_verlauf(df),
                "lernkurve_hinweis": ("Noch zu wenige Durchläufe (mind. 5) für eine aussagekräftige "
                                      "Lernkurve. Bisher: " + str(len(df))),
                "verlauf": [float(v) for v in verlauf],
                "balkenfarben": [GOLD if v >= 0 else AKZENT for v in verlauf],
                "nbinsx": min(10, max(3, len(df) // 2 or 1)),
                "badges": ermittele_badges(df),
            }
        faelle.append({"spieler": spieler, "profil": profil, "level": je_level})

    # Klassenzahl fuer alle Anzahlen 0..40
    klassen = {str(n): min(10, max(3, n // 2 or 1)) for n in range(0, 41)}
    doc = {"pandas": pd.__version__, "faelle": faelle, "histogramm_klassen": klassen}
    text = json.dumps(doc, ensure_ascii=False, indent=1, allow_nan=False) + "\n"
    if args.pruefen:
        ok = ZIEL.exists() and ZIEL.read_text(encoding="utf-8") == text
        print("ok" if ok else "ABWEICHUNG")
        return 0 if ok else 1
    ZIEL.write_text(text, encoding="utf-8")
    print(f"geschrieben: {ZIEL} ({len(faelle)} Spieler)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
