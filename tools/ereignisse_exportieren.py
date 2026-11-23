#!/usr/bin/env python3
"""
Exportiert STANDARD_EREIGNISSE aus dem alten Python-Code nach config/ereignisse.json.

Reihenfolge, Schluessel, Texte (woertlich) und Effekt-Werte bleiben exakt
erhalten - die Reihenfolge ist relevant, weil der Ereignis-Wuerfel einen Index
in diese Liste liefert (random.choice).

    python3 tools/ereignisse_exportieren.py            # schreibt die Datei
    python3 tools/ereignisse_exportieren.py --pruefen  # vergleicht nur
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parent.parent
ZIEL = WEB_ROOT / "config" / "ereignisse.json"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy", type=Path, default=WEB_ROOT / "legacy")
    parser.add_argument("--pruefen", action="store_true")
    args = parser.parse_args()

    sys.path.insert(0, str(args.legacy.resolve() / "src"))
    from apfelportfolio.levels.level2_ereignisse import STANDARD_EREIGNISSE

    doc = {
        "formatVersion": 1,
        "beschreibung": (
            "Tagesereignisse fuer Level 2 (bisher STANDARD_EREIGNISSE in "
            "levels/level2_ereignisse.py). Reihenfolge ist relevant (Wuerfel-Index). "
            "Effekt-Namen siehe src/levels/effekte.ts; wert 1.0 = keine Aenderung. "
            "entscheidung_text gesetzt -> JA/NEIN-Entscheidung, Effekte nur bei Zustimmung."
        ),
        "ereignisse": [asdict(e) for e in STANDARD_EREIGNISSE],
    }
    text = json.dumps(doc, ensure_ascii=False, indent=2, allow_nan=False) + "\n"

    if args.pruefen:
        ok = ZIEL.exists() and ZIEL.read_text(encoding="utf-8") == text
        print("ok" if ok else "ABWEICHUNG")
        return 0 if ok else 1
    ZIEL.write_text(text, encoding="utf-8")
    print(f"geschrieben: {ZIEL} ({len(STANDARD_EREIGNISSE)} Ereignisse)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
