#!/usr/bin/env python3
"""
Erzeugt tests/daten/kpi_referenz.json: Soll-Werte fuer dashboard/kpis.py.

Weg wie in der alten App: Aus den Wochenergebnissen der Referenzwochen
(tests/referenz/level*_*.json, Feld woche.log_zeile) werden LogZeilen gebaut,
mit dem ALTEN LogRepository in eine CSV-Datei geschrieben, mit
alle_laden()/fuer_level()/fuer_spieler() wieder eingelesen und dann mit den
ALTEN KPI-Funktionen ausgewertet. Gespeichert werden je Szenario die
Eingabe so, wie die KPI-Funktion sie sieht (Spalte endergebnis nach dem
CSV-Einlesen; NaN als null) und alle KPI-Ergebnisse.

Die Datei liegt bewusst in tests/daten/ und NICHT in tests/referenz/
(eingefroren, siehe CLAUDE.md). Deterministisch; --pruefen vergleicht.

    python3 tools/kpi_referenz_erzeugen.py [--pruefen] [--legacy PFAD]
"""

from __future__ import annotations

import argparse
import json
import math
import platform
import random
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parent.parent
REFERENZ = WEB_ROOT / "tests" / "referenz"
ZIEL = WEB_ROOT / "tests" / "daten" / "kpi_referenz.json"
SEED = 4711
SPIELER = ["Anna", "Ben", "Cem", "Dana", "Emil", "Fritzi"]


def zahl(x):
    """JSON-taugliche Darstellung: NaN als "NaN", sonst float/None/bool."""
    if x is None or isinstance(x, bool):
        return x
    x = float(x)
    if math.isnan(x):
        return "NaN"
    return x


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy", type=Path, default=WEB_ROOT.parent)
    parser.add_argument("--pruefen", action="store_true")
    args = parser.parse_args()
    legacy = args.legacy.resolve()

    # repository.py importiert "src.apfelportfolio...", kpis.py nur pandas.
    sys.path.insert(0, str(legacy))
    import pandas as pd
    from src.apfelportfolio.dashboard import kpis
    from src.apfelportfolio.data.repository import LogRepository
    from src.apfelportfolio.data.schema import LogZeile

    rng = random.Random(SEED)
    zeilen: list[LogZeile] = []
    start = date(2026, 1, 5)
    for datei in sorted(REFERENZ.glob("level*_*.json")):
        doc = json.loads(datei.read_text(encoding="utf-8"))
        for fall in doc["faelle"]:
            lz = fall["woche"]["log_zeile"]
            if lz is None:
                continue
            zeilen.append(
                LogZeile(
                    spieler=rng.choice(SPIELER),
                    datum=start + timedelta(days=len(zeilen) // 7),
                    level=lz["level"],
                    endergebnis=lz["endergebnis"],
                    rest_long_short=lz["rest_long_short"],
                    anteil_spot=lz["anteil_spot"],
                    anteil_grundlast=lz["anteil_grundlast"],
                    prognosefehler=lz["prognosefehler"],
                    referenzergebnis_nichthandeln=lz["referenzergebnis_nichthandeln"],
                )
            )
    # Zeilen mit fehlendem Endergebnis (leere CSV-Zelle -> NaN), wie sie in einer
    # von Hand bearbeiteten spiellog.csv vorkommen koennen.
    for name in ("Nina", "Nina", "Nina", "Otto"):
        zeilen.append(LogZeile(spieler=name, datum=start, level=1, endergebnis=None,  # type: ignore[arg-type]
                               rest_long_short=0.0, anteil_spot=0.0, anteil_grundlast=1.0,
                               prognosefehler=None, referenzergebnis_nichthandeln=0.0))
    zeilen.append(LogZeile(spieler="Nina", datum=start, level=1, endergebnis=612.25,
                           rest_long_short=0.0, anteil_spot=0.0, anteil_grundlast=1.0,
                           prognosefehler=None, referenzergebnis_nichthandeln=0.0))

    with tempfile.TemporaryDirectory() as tmp:
        repo = LogRepository(Path(tmp) / "spiellog.csv")
        for z in zeilen:
            repo.anhaengen(z)
        df_alle = repo.alle_laden()

        # Wie viele Werte aendert der CSV-Umweg? (nur Info, Phase 5)
        geaendert = sum(
            1 for z, v in zip(zeilen, df_alle["endergebnis"])
            if z.endergebnis is not None and float(v) != z.endergebnis
        )

        szenarien: list[tuple[str, pd.DataFrame]] = [("leer", df_alle.iloc[0:0]), ("alle", df_alle)]
        for level in (1, 2):
            df_level = repo.fuer_level(level)
            szenarien.append((f"level{level}", df_level))
            for n in range(0, 13):
                szenarien.append((f"level{level}_erste_{n}", df_level.head(n)))
            for n in (127, 128, 129, 136, 200, 257):
                szenarien.append((f"level{level}_erste_{n}", df_level.head(n)))
        for spieler in SPIELER + ["Nina", "Otto"]:
            df_sp = repo.fuer_spieler(spieler)
            szenarien.append((f"spieler_{spieler}", df_sp))
            for level in (1, 2):
                df_level = repo.fuer_level(level)
                szenarien.append(
                    (f"spieler_{spieler}_level{level}",
                     df_level[df_level["spieler"] == spieler].reset_index(drop=True))
                )

        faelle = []
        for name, df in szenarien:
            faelle.append({
                "name": name,
                "anzahl_zeilen": len(df),
                "endergebnisse": [None if math.isnan(float(v)) else float(v) for v in df["endergebnis"]],
                "durchschnittsergebnis": zahl(kpis.durchschnittsergebnis(df)),
                "bestes_ergebnis": zahl(kpis.bestes_ergebnis(df)),
                "schlechtestes_ergebnis": zahl(kpis.schlechtestes_ergebnis(df)),
                "ergebnis_streuung": zahl(kpis.ergebnis_streuung(df)),
                "hat_genug_daten_fuer_verlauf": bool(kpis.hat_genug_daten_fuer_verlauf(df)),
                "badges": kpis.ermittele_badges(df),
            })

    doc = {
        "python": platform.python_version(),
        "pandas": pd.__version__,
        "seed": SEED,
        "csv_umweg_geaenderte_werte": geaendert,
        "faelle": faelle,
    }
    text = json.dumps(doc, ensure_ascii=False, indent=1, allow_nan=False) + "\n"
    if args.pruefen:
        ok = ZIEL.exists() and ZIEL.read_text(encoding="utf-8") == text
        print("ok" if ok else "ABWEICHUNG")
        return 0 if ok else 1
    ZIEL.write_text(text, encoding="utf-8")
    print(f"geschrieben: {ZIEL} ({len(faelle)} Szenarien, {len(zeilen)} Log-Zeilen, "
          f"durch CSV-Umweg geaenderte Werte: {geaendert})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
