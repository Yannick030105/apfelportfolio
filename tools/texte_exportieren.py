#!/usr/bin/env python3
"""
Exportiert redaktionelle Texte der Streamlit-Seiten woertlich nach
src/content/texte/*.md (Quelle der Web-Version) und legt je Seite einen
JSON-Abzug als Test-Soll unter tests/daten/ ab.

Bisher: Tutorial (SCHRITTE aus ui/pages/4_tutorial.py) und Wiki (KAPITEL und
REIHENFOLGE aus ui/pages/5_wiki.py). In tutorial.md werden zusaetzlich die
genehmigten Textaenderungen aus tests/daten/tutorial_abweichungen.json
eingesetzt; der JSON-Abzug bleibt woertlich wie im Original.
Format von tutorial.md je Schritt:

    ## <icon> | <titel>

    <erklaerung>

    > <beispiel>

Format von wiki.md (Kapitel in REIHENFOLGE):

    # <schluessel> | <icon> | <titel>

    <intro>

    ## <name>

    <definition>

    Obst: <obst>
    Energie: <energie>

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


ABWEICHUNGEN = DATEN / "tutorial_abweichungen.json"


def genehmigte_abweichungen(schritte: list[dict]) -> list[dict]:
    """Wendet tests/daten/tutorial_abweichungen.json auf eine Kopie der Schritte an."""
    neu = [dict(s) for s in schritte]
    for a in json.loads(ABWEICHUNGEN.read_text(encoding="utf-8"))["aenderungen"]:
        treffer = [s for s in neu if s["titel"] == a["titel"]]
        if len(treffer) != 1 or treffer[0][a["feld"]] != a["alt"]:
            raise ValueError(f"Abweichung {a['titel']!r}/{a['feld']}: Originaltext passt nicht mehr")
        treffer[0][a["feld"]] = a["neu"]
    return neu


def tutorial(legacy: Path) -> dict[Path, str]:
    schritte = lade_seite(legacy, "4_tutorial.py").SCHRITTE
    teile = ["<!-- Automatisch erzeugt aus SCHRITTE in ui/pages/4_tutorial.py "
             "(tools/texte_exportieren.py). Texte woertlich; Format: '## icon | titel', "
             "Absatz = Erklaerung, '> ' = Beispiel. Genehmigte Aenderungen: "
             "tests/daten/tutorial_abweichungen.json. -->\n"]
    for s in genehmigte_abweichungen(schritte):
        for feld in ("icon", "titel", "erklaerung", "beispiel"):
            if "\n" in s[feld] or (feld != "erklaerung" and " | " in s[feld]):
                raise ValueError(f"Schritt {s['titel']!r}: Feld {feld} passt nicht ins Format")
        teile.append(f"## {s['icon']} | {s['titel']}\n\n{s['erklaerung']}\n\n> {s['beispiel']}\n")
    return {
        TEXTE / "tutorial.md": "\n".join(teile),
        DATEN / "tutorial_schritte.json": json.dumps(schritte, ensure_ascii=False, indent=1) + "\n",
    }


def wiki(legacy: Path) -> dict[Path, str]:
    for m in ("plotly", "plotly.graph_objects"):
        sys.modules[m] = mock.MagicMock()
    seite = lade_seite(legacy, "5_wiki.py")
    kapitel, reihenfolge = seite.KAPITEL, seite.REIHENFOLGE
    if sorted(kapitel) != sorted(reihenfolge):
        raise ValueError("KAPITEL und REIHENFOLGE passen nicht zusammen")
    teile = ["<!-- Automatisch erzeugt aus KAPITEL/REIHENFOLGE in ui/pages/5_wiki.py "
             "(tools/texte_exportieren.py). Texte woertlich; Format: '# schluessel | icon | titel', "
             "Absatz = Intro, '## name', Absatz = Definition, 'Obst: ', 'Energie: '. -->\n"]
    for key in reihenfolge:
        k = kapitel[key]
        werte = [key, k["icon"], k["titel"], k["intro"]] + [b[f] for b in k["begriffe"]
                                                            for f in ("name", "definition", "obst", "energie")]
        if any("\n" in w for w in werte) or any(" | " in w for w in (key, k["icon"], k["titel"])):
            raise ValueError(f"Kapitel {key!r} passt nicht ins Format")
        teile.append(f"# {key} | {k['icon']} | {k['titel']}\n\n{k['intro']}\n")
        for b in k["begriffe"]:
            teile.append(f"## {b['name']}\n\n{b['definition']}\n\nObst: {b['obst']}\nEnergie: {b['energie']}\n")
    abzug = {"reihenfolge": reihenfolge, "kapitel": kapitel}
    return {
        TEXTE / "wiki.md": "\n".join(teile),
        DATEN / "wiki_kapitel.json": json.dumps(abzug, ensure_ascii=False, indent=1) + "\n",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy", type=Path, default=WEB_ROOT / "legacy")
    parser.add_argument("--pruefen", action="store_true")
    args = parser.parse_args()
    dateien = {**tutorial(args.legacy.resolve()), **wiki(args.legacy.resolve())}
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
