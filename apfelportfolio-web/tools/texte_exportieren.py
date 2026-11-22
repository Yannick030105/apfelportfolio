#!/usr/bin/env python3
"""
Exportiert redaktionelle Texte der Streamlit-Seiten woertlich nach
src/content/texte/*.md (Quelle der Web-Version) und legt je Seite einen
JSON-Abzug als Test-Soll unter tests/daten/ ab.

Bisher: Tutorial (SCHRITTE aus ui/pages/4_tutorial.py).
Format von tutorial.md je Schritt:

    ## <icon> | <titel>

    <erklaerung>

    > <beispiel>

    python3 tools/texte_exportieren.py [--pruefen] [--legacy PFAD]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from unittest import mock

WEB_ROOT = Path(__file__).resolve().parent.parent
TEXTE = WEB_ROOT / "src" / "content" / "texte"
DATEN = WEB_ROOT / "tests" / "daten"


def lade_seite(legacy: Path, datei: str):
    sys.modules["streamlit"] = mock.MagicMock()
    spec = importlib.util.spec_from_file_location(Path(datei).stem, legacy / "src/apfelportfolio/ui/pages" / datei)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


def tutorial(legacy: Path) -> dict[Path, str]:
    schritte = lade_seite(legacy, "4_tutorial.py").SCHRITTE
    teile = ["<!-- Automatisch erzeugt aus SCHRITTE in ui/pages/4_tutorial.py "
             "(tools/texte_exportieren.py). Texte woertlich; Format: '## icon | titel', "
             "Absatz = Erklaerung, '> ' = Beispiel. -->\n"]
    for s in schritte:
        for feld in ("icon", "titel", "erklaerung", "beispiel"):
            if "\n" in s[feld] or (feld != "erklaerung" and " | " in s[feld]):
                raise ValueError(f"Schritt {s['titel']!r}: Feld {feld} passt nicht ins Format")
        teile.append(f"## {s['icon']} | {s['titel']}\n\n{s['erklaerung']}\n\n> {s['beispiel']}\n")
    return {
        TEXTE / "tutorial.md": "\n".join(teile),
        DATEN / "tutorial_schritte.json": json.dumps(schritte, ensure_ascii=False, indent=1) + "\n",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy", type=Path, default=WEB_ROOT.parent)
    parser.add_argument("--pruefen", action="store_true")
    args = parser.parse_args()
    dateien = tutorial(args.legacy.resolve())
    if args.pruefen:
        abw = [p for p, t in dateien.items() if not p.exists() or p.read_text(encoding="utf-8") != t]
        print("ok" if not abw else "ABWEICHUNG: " + ", ".join(str(p) for p in abw))
        return 1 if abw else 0
    for pfad, text in dateien.items():
        pfad.write_text(text, encoding="utf-8")
        print(f"geschrieben: {pfad}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
