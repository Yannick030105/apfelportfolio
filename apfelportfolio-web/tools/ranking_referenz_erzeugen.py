#!/usr/bin/env python3
"""
Erzeugt tests/daten/ranking_referenz.json: Soll-Werte fuer die Ranking-Seite.

Ruft die ORIGINAL-Funktionen aus ui/pages/3_ranking.py auf (_highscores_je_level,
_badge_icons); streamlit und plotly werden dafuer durch Attrappen ersetzt (die
Funktionen brauchen nur pandas). Die eigene Statistik und der Verlauf werden
mit genau den Ausdruecken aus _render_eigene_statistik/_render_verlaufschart
berechnet.

Datengrundlage wie in der App: die echte data_store/spiellog.csv plus die
Wochenergebnisse der Referenzwochen (zufaellig auf Spieler verteilt), ueber das
ALTE LogRepository als CSV geschrieben und wieder eingelesen.

Gleichstaende: pandas sortiert mit numpy-quicksort, der auf x86 mit SIMD (AVX-512/
AVX2) NICHT stabil und prozessorabhaengig ist. Die Daten werden daher so gewaehlt,
dass es keine gleichen Bestwerte und keine gleichen Daten je Spieler/Level gibt
(das Skript prueft das); die Gleichstand-Regel der TS-Version ist separat getestet.

    python3 tools/ranking_referenz_erzeugen.py [--pruefen] [--legacy PFAD]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import random
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path
from unittest import mock

WEB_ROOT = Path(__file__).resolve().parent.parent
REFERENZ = WEB_ROOT / "tests" / "referenz"
ZIEL = WEB_ROOT / "tests" / "daten" / "ranking_referenz.json"
SEED = 815
SPIELER = ["Anna", "anna", "Ärne", "Ben", "Zoe", "Mia", "Leon", "Clara"]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy", type=Path, default=WEB_ROOT.parent)
    parser.add_argument("--pruefen", action="store_true")
    args = parser.parse_args()
    legacy = args.legacy.resolve()

    for modul in ("streamlit", "plotly", "plotly.graph_objects"):
        sys.modules[modul] = mock.MagicMock()
    sys.path.insert(0, str(legacy))
    import pandas as pd
    from src.apfelportfolio.data.repository import LogRepository
    from src.apfelportfolio.data.schema import LogZeile

    spec = importlib.util.spec_from_file_location("ranking_seite", legacy / "src/apfelportfolio/ui/pages/3_ranking.py")
    seite = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(seite)

    zeilen: list[LogZeile] = []
    # 1) echte spiellog.csv (Werte als Text uebernommen -> gleiche CSV-Zeichen)
    echt = pd.read_csv(legacy / "data_store" / "spiellog.csv", dtype=str, keep_default_na=False)
    for _, r in echt.iterrows():
        zeilen.append(LogZeile(spieler=r["spieler"], datum=date.fromisoformat(r["datum"]), level=int(r["level"]),
                               endergebnis=float(r["endergebnis"]), rest_long_short=float(r["rest_long_short"]),
                               anteil_spot=float(r["anteil_spot"]), anteil_grundlast=float(r["anteil_grundlast"]),
                               prognosefehler=None, referenzergebnis_nichthandeln=float(r["referenzergebnis_nichthandeln"])))
    # 2) Referenzwochen, verteilt auf Spieler; jedes Datum einmalig
    rng = random.Random(SEED)
    start = date(2026, 9, 1)
    nr = 0
    for datei in sorted(REFERENZ.glob("level*_wochen.json")):
        doc = json.loads(datei.read_text(encoding="utf-8"))
        for fall in doc["faelle"][:60]:
            lz = fall["woche"]["log_zeile"]
            zeilen.append(LogZeile(spieler=rng.choice(SPIELER), datum=start + timedelta(days=nr), level=lz["level"],
                                   endergebnis=lz["endergebnis"], rest_long_short=lz["rest_long_short"],
                                   anteil_spot=0.0, anteil_grundlast=1.0, prognosefehler=None,
                                   referenzergebnis_nichthandeln=0.0))
            nr += 1

    with tempfile.TemporaryDirectory() as tmp:
        repo = LogRepository(Path(tmp) / "spiellog.csv")
        for z in zeilen:
            repo.anhaengen(z)
        df = repo.alle_laden()

    ergebnis_level = []
    for level in (1, 2):
        bestenliste = seite._highscores_je_level(df, level)
        df_level = df[df["level"] == level]
        # Eindeutigkeit pruefen (siehe Docstring)
        if bestenliste["endergebnis"].duplicated().any():
            print(f"FEHLER: gleiche Bestwerte in Level {level} - Daten anpassen.")
            return 1
        for (sp, lv), gruppe in df_level.groupby(["spieler", "level"]):
            if gruppe["datum"].duplicated().any():
                print(f"FEHLER: gleiches Datum bei {sp} / Level {lv} - Daten anpassen.")
                return 1

        statistik = {}
        verlauf = {}
        for spieler in sorted(df_level["spieler"].unique()):
            # _render_eigene_statistik
            eigener_rang = int(bestenliste.loc[bestenliste["spieler"] == spieler, "rang"].iloc[0])
            bestes_ergebnis = float(bestenliste.loc[bestenliste["spieler"] == spieler, "endergebnis"].iloc[0])
            gesamt = len(bestenliste)
            if eigener_rang == 1:
                meldung = f"🏆 Du führst die Bestenliste in Level {level} an!"
                abstand_text = "0.00 €"
            else:
                diff = bestenliste.loc[bestenliste["rang"] == 1, "endergebnis"].iloc[0] - bestes_ergebnis
                meldung = (f"Du stehst auf Platz {eigener_rang} von {gesamt}. "
                           f"Nur {diff:.2f} € fehlen dir zu Platz 1 – weiterspielen lohnt sich!")
                abstand_text = f"{diff:.2f} €"
            statistik[spieler] = {"eigener_rang": eigener_rang, "bestes_ergebnis": bestes_ergebnis, "gesamt": gesamt,
                                  "meldung": meldung, "abstand_text": abstand_text,
                                  "bestes_text": f"{bestes_ergebnis:.2f} €"}
            # _render_verlaufschart
            v = df[(df["level"] == level) & (df["spieler"] == spieler)].sort_values("datum")
            verlauf[spieler] = None if len(v) < 2 else [
                {"datum": d.date().isoformat(), "endergebnis": float(e)} for d, e in zip(v["datum"], v["endergebnis"])
            ]

        ergebnis_level.append({
            "level": level,
            "bestenliste": [
                {"rang": int(r["rang"]), "spieler": r["spieler"], "endergebnis": float(r["endergebnis"]),
                 "podium_text": f"{r['endergebnis']:.0f} €", "karten_text": f"{r['endergebnis']:.2f} €"}
                for _, r in bestenliste.iterrows()
            ],
            "badges": {sp: seite._badge_icons(df_level, sp) for sp in bestenliste["spieler"]},
            "statistik": statistik,
            "verlauf": verlauf,
        })

    doc = {
        "seed": SEED,
        "pandas": pd.__version__,
        "zeilen": [
            {"spieler": s, "datum": d.date().isoformat(), "level": int(lv), "endergebnis": float(e)}
            for s, d, lv, e in zip(df["spieler"], df["datum"], df["level"], df["endergebnis"])
        ],
        "level": ergebnis_level,
    }
    text = json.dumps(doc, ensure_ascii=False, indent=1, allow_nan=False) + "\n"
    if args.pruefen:
        ok = ZIEL.exists() and ZIEL.read_text(encoding="utf-8") == text
        print("ok" if ok else "ABWEICHUNG")
        return 0 if ok else 1
    ZIEL.write_text(text, encoding="utf-8")
    print(f"geschrieben: {ZIEL} ({len(doc['zeilen'])} Log-Zeilen, "
          + ", ".join(f"Level {l['level']}: {len(l['bestenliste'])} Spieler" for l in ergebnis_level) + ")")
    return 0


if __name__ == "__main__":
    sys.exit(main())
