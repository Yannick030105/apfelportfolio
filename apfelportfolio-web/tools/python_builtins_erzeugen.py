#!/usr/bin/env python3
"""
Erzeugt tests/daten/python_builtins.json: Soll-Werte fuer die Python-Bausteine,
die die TypeScript-Portierung exakt nachbilden muss:

    round(x)            -> src/domain/runden.ts  pythonRound(x)
    round(x, n)         -> src/domain/runden.ts  pythonRound(x, n)
    f"{x:.{n}f}"        -> src/domain/runden.ts  formatFixed(x, n)
    repr(x)  (float)    -> src/domain/pythonText.ts  pythonRepr(x)
    sum(xs)  (floats)   -> src/domain/summe.ts  pythonSumme(xs)
    str.strip/lower/len, sorted(str) -> src/domain/pythonString.ts

Deterministisch (fester Seed). Unabhaengig vom alten Spielcode; die Datei
liegt bewusst NICHT unter tests/referenz/.

Aufruf: python3 tools/python_builtins_erzeugen.py [--pruefen]
"""

from __future__ import annotations

import argparse
import json
import math
import platform
import random
import sys
from pathlib import Path

ZIEL = Path(__file__).resolve().parent.parent / "tests" / "daten" / "python_builtins.json"
SEED = 31415


STRING_BEISPIELE = [
    "Anna", "anna", "  Ben  ", "\u00c4rne", "Zoe", "zoe", "\u00e9mile", "Emil", "\u0130lker", "\u03a3\u039f\u03a3",
    "\x1cX\x1f", "\x85Y\xa0", "\ufeffZ", "\u3000Kai\u2029", "\U0001F34Ea", "a\U0001F34E", "\uff21", "10", "9",
    "Stra\u00dfe", "\u1e9e", "A" * 30, " " + "B" * 31 + " ", "\U0001F34E" * 30, "\t", "", "\u00df",
]


def werte(rng: random.Random) -> list[float]:
    xs: list[float] = [
        0.0, -0.0, 0.5, 1.5, 2.5, 3.5, -0.5, -1.5, -2.5, 0.49999999999999994,
        2.675, 1.005, 0.125, 0.375, -0.125, 1.25, 2.5e-5, 1e-5, 1e-4, 0.0001234,
        1e15, 1e16, 1e17, 123456789012345680.0, 9007199254740993.0, 4503599627370495.5,
        1e22, 1e300, 5e-324, 2.2250738585072014e-308, 1.7976931348623157e308,
        0.1, 0.2, 0.30000000000000004, 1 / 3, 2 / 3, 100.0, 301.0, 36.25, 0.035,
        8.799999999999983, 436.71999999999997, 81.19999999999987, -120.0, -0.4, -0.6,
        999.5, 1000.5, 12345.678, -12345.678, 0.045, 0.055, 0.065, 1.115, 1.125,
    ]
    for _ in range(400):
        xs.append(rng.uniform(-1000, 1000))
    for _ in range(200):
        xs.append(round(rng.uniform(-500, 500), 2))
    for _ in range(200):
        xs.append(rng.randint(-4000, 4000) / 8)  # viele exakte Gleichstaende
    for _ in range(100):
        xs.append(rng.randint(-100000, 100000) / 1000)
    for _ in range(100):
        xs.append(rng.uniform(-1, 1) * 10 ** rng.randint(-12, 25))
    return xs


def round_mit(x: float, n: int):
    try:
        return round(x, n)
    except OverflowError:
        return "OverflowError"


def erzeugen() -> dict:
    rng = random.Random(SEED)
    xs = werte(rng)
    stellen = [-3, -2, -1, 0, 1, 2, 3, 5, 10]
    summen = []
    for _ in range(3000):
        n = rng.randint(0, 9)
        liste = [
            rng.choice([
                rng.uniform(-500, 500), round(rng.uniform(-500, 500), 2),
                rng.randint(-50, 50) * 0.1, 0.1, 0.2, 1e16, -1e16, -0.0, 0.0,
            ])
            for _ in range(n)
        ]
        summen.append([liste, sum(liste)])
    return {
        "python": platform.python_version(),
        "seed": SEED,
        "round_ohne": [[x, round(x)] for x in xs if abs(x) < 2 ** 53],
        "round_mit": [[x, n, round_mit(x, n)] for x in xs for n in stellen]
        + [[1.7976931348623157e308, -308, round_mit(1.7976931348623157e308, -308)],
           [123.456, -400, round(123.456, -400)], [-123.456, -400, round(-123.456, -400)],
           [123.456, 400, round(123.456, 400)]],
        "format_fixed": [[x, n, f"{x:.{n}f}"] for x in xs for n in (0, 1, 2) if abs(x) < 1e25],
        "repr": [[x, repr(x)] for x in xs],
        "summe": summen,
        # Strings (Spielernamen, data/players.py): str.isspace (fuer strip()),
        # str.lower() fuer alle Zeichen, die sich aendern, und sorted()-Beispiele.
        "isspace": [c for c in range(0x110000) if chr(c).isspace()],
        "lower": [[c, chr(c).lower()] for c in range(0x110000)
                  if 0xD800 > c or c > 0xDFFF if chr(c).lower() != chr(c)],
        "strings": [
            [t, t.strip(), t.strip().lower(), len(t.strip())]
            for t in STRING_BEISPIELE
        ],
        "sortiert": sorted(STRING_BEISPIELE),
    }


def als_text(doc: dict) -> str:
    return json.dumps(doc, ensure_ascii=False, indent=0, allow_nan=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pruefen", action="store_true")
    args = parser.parse_args()
    if sys.version_info < (3, 12):
        print("Python >= 3.12 noetig (kompensierte Float-Summation in sum()).")
        return 1
    text = als_text(erzeugen())
    if args.pruefen:
        ok = ZIEL.exists() and ZIEL.read_text(encoding="utf-8") == text
        print("ok" if ok else "ABWEICHUNG")
        return 0 if ok else 1
    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    ZIEL.write_text(text, encoding="utf-8")
    print(f"geschrieben: {ZIEL}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
