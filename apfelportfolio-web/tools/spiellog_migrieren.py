#!/usr/bin/env python3
"""
Wandelt data_store/spiellog.csv EINMALIG in Spielstand-Dateien (JSON) um.

Jede CSV-Zeile (= eine abgeschlossene Woche) wird zu einer Datei
    migriert_<zeile>_<levelId>_<spieler>.json
im Format von src/storage/schema.ts (status "abgeschlossen", ohne Tagesdetails,
die das alte Log nicht kennt; die Log-Zeile und die unveraenderten Zelltexte
werden uebernommen). Die Dateien gehoeren danach in den Ordner "spielstaende"
des gemeinsamen Spielordners.

Zahlen: Massgeblich ist der exakte Wert des CSV-Textes (Python float(), z. B.
"-478.05999999999995"). Die alte App las mit pandas.read_csv (Standard
float_precision="high") manche Werte eine Binaerstelle daneben ein - der Bericht
weist aus, wie viele Werte das betrifft (MIGRATION_NOTES, Auffaelligkeit 19).

Bericht am Ende: Zeilenanzahl, Summen der Ergebnisse je Spieler (alt/neu) und
5 Stichproben alt/neu nebeneinander. Vorhandene Dateien werden nie ueberschrieben.

    python3 tools/spiellog_migrieren.py --ziel <ordner> [--csv <spiellog.csv>]
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parent.parent
STANDARD_CSV = WEB_ROOT.parent / "data_store" / "spiellog.csv"

SPIELSTAND_FORMAT = "apfelportfolio-spielstand"
SPIELSTAND_FORMAT_VERSION = 1
LOG_SPALTEN = [
    "spieler", "datum", "level", "endergebnis", "rest_long_short",
    "anteil_spot", "anteil_grundlast", "prognosefehler", "referenzergebnis_nichthandeln",
]
ZAHL_SPALTEN = LOG_SPALTEN[3:]
# Texte, die pandas.read_csv standardmaessig als "fehlend" (NaN) liest
PANDAS_NA = {"", "#N/A", "#N/A N/A", "#NA", "-1.#IND", "-1.#QNAN", "-NaN", "-nan", "1.#IND", "1.#QNAN",
             "<NA>", "N/A", "NA", "NULL", "NaN", "None", "n/a", "nan", "null"}


def app_version() -> str:
    return json.loads((WEB_ROOT / "package.json").read_text(encoding="utf-8"))["version"]


def dateinamen_teil(text: str, max_laenge: int) -> str:
    teil = "".join(z if (z.isalnum() or z in "_-") else "_" for z in unicodedata.normalize("NFC", text))
    return teil[:max_laenge] or "_"


def zahl_oder_none(text: str) -> float | None:
    if text.strip() == "":
        return None
    wert = float(text)
    if not math.isfinite(wert):
        raise ValueError(f"keine endliche Zahl: {text!r}")
    return wert


def migriere_zeile(nr: int, zeile: dict[str, str], quelle: str, version: str) -> dict:
    spieler = zeile["spieler"]
    if spieler.strip() == "":
        raise ValueError("kein Spielername")
    level_text = zeile["level"].strip()
    if not re.fullmatch(r"[0-9]+", level_text) or int(level_text) < 1:
        raise ValueError(f"ungueltiges Level {zeile['level']!r}")
    level = int(level_text)
    datum = zeile["datum"].strip()
    if datum != "" and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", datum):
        raise ValueError(f"ungueltiges Datum {zeile['datum']!r} (erwartet JJJJ-MM-TT)")
    werte = {}
    for spalte in ZAHL_SPALTEN:
        try:
            werte[spalte] = zahl_oder_none(zeile[spalte])
        except ValueError:
            raise ValueError(f"Spalte {spalte}: keine Zahl {zeile[spalte]!r}") from None
    if werte["endergebnis"] is None:
        raise ValueError("kein Endergebnis")
    return {
        "format": SPIELSTAND_FORMAT,
        "formatVersion": SPIELSTAND_FORMAT_VERSION,
        "appVersion": version,
        "id": f"migriert-{nr:04d}",
        "levelId": f"level{level}",
        "level": level,
        "spieler": spieler,
        "status": "abgeschlossen",
        "gestartet_am": None,
        "abgeschlossen_am": None,
        "regelwerk": None,
        "tage": [],
        "zustand": None,
        "offener_tag": None,
        "log_zeile": {"spieler": spieler, "datum": datum or None, "level": level, **werte},
        "migriert": {"quelle": quelle, "zeile": nr, "original": {k: zeile[k] for k in LOG_SPALTEN}},
    }


def dateiname(stand: dict) -> str:
    return (f"migriert_{stand['migriert']['zeile']:04d}_{stand['levelId']}_"
            f"{dateinamen_teil(stand['spieler'], 30)}.json")


def tabelle(kopf: list[str], zeilen: list[list[str]]) -> str:
    breiten = [max(len(str(x)) for x in spalte) for spalte in zip(kopf, *zeilen)]
    linie = "  ".join("-" * b for b in breiten)
    fmt = lambda z: "  ".join(str(x).ljust(b) for x, b in zip(z, breiten))  # noqa: E731
    return "\n".join([fmt(kopf), linie, *(fmt(z) for z in zeilen)])


def main() -> int:
    parser = argparse.ArgumentParser(description="spiellog.csv -> Spielstand-Dateien (einmalig)")
    parser.add_argument("--csv", type=Path, default=STANDARD_CSV, help="Pfad zur spiellog.csv")
    parser.add_argument("--ziel", type=Path, required=True, help="Zielordner fuer die JSON-Dateien")
    args = parser.parse_args()

    if not args.csv.exists():
        print(f"FEHLER: {args.csv} nicht gefunden.")
        return 1
    with args.csv.open(encoding="utf-8-sig", newline="") as f:
        leser = csv.DictReader(f)
        kopf = leser.fieldnames or []
        fehlend = [s for s in LOG_SPALTEN if s not in kopf]
        if fehlend:
            print(f"FEHLER: Spalten fehlen in {args.csv.name}: {', '.join(fehlend)}")
            return 1
        rohzeilen = list(leser)

    version = app_version()
    staende: list[dict] = []
    uebersprungen: list[tuple[int, str]] = []
    for nr, zeile in enumerate(rohzeilen, start=1):
        if None in zeile or any(zeile[s] is None for s in LOG_SPALTEN):
            uebersprungen.append((nr, "falsche Spaltenanzahl"))
            continue
        try:
            staende.append(migriere_zeile(nr, zeile, args.csv.name, version))
        except ValueError as e:
            uebersprungen.append((nr, str(e)))

    args.ziel.mkdir(parents=True, exist_ok=True)
    namen = [dateiname(s) for s in staende]
    vorhanden = [n for n in namen if (args.ziel / n).exists()]
    if vorhanden:
        print(f"ABBRUCH: {len(vorhanden)} Zieldatei(en) existieren bereits (z. B. {vorhanden[0]}). Nichts geschrieben.")
        return 1
    for stand, name in zip(staende, namen):
        text = json.dumps(stand, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        (args.ziel / name).write_text(text, encoding="utf-8")

    # Kontrolle: geschriebene Dateien wieder einlesen und gegen den CSV-Text pruefen
    abweichungen = 0
    neu_gelesen = []
    for stand, name in zip(staende, namen):
        gelesen = json.loads((args.ziel / name).read_text(encoding="utf-8"))
        neu_gelesen.append(gelesen)
        for spalte in ZAHL_SPALTEN:
            text = gelesen["migriert"]["original"][spalte]
            erwartet = None if text.strip() == "" else float(text)
            if gelesen["log_zeile"][spalte] != erwartet:
                abweichungen += 1

    # Alte Sicht: wie die alte App (pandas.read_csv mit Standardeinstellungen)
    alt_endergebnis: dict[int, float] = {}
    pandas_hinweis = ""
    na_namen: list[str] = []
    try:
        import pandas as pd
    except ImportError:
        pd = None
        pandas_hinweis = "(pandas nicht installiert - alte Sicht = exakter CSV-Wert)"
    if pd is not None:
        try:
            df_alt = pd.read_csv(args.csv)
            for nr, wert in enumerate(df_alt["endergebnis"], start=1):
                try:
                    alt_endergebnis[nr] = float(wert)
                except (TypeError, ValueError):
                    alt_endergebnis[nr] = math.nan  # alte App: Spalte waere Text, KPIs nicht berechenbar
            na_namen = sorted({s["spieler"] for s in staende if s["spieler"] in PANDAS_NA})
        except Exception as e:  # noqa: BLE001 - alte App haette die Datei gar nicht lesen koennen
            pandas_hinweis = f"(alte App konnte die Datei nicht lesen: {e})"

    def alt(nr: int, exakt: float) -> float:
        return alt_endergebnis.get(nr, exakt)

    binaerstelle = sum(
        1 for s in neu_gelesen
        if not math.isnan(alt(s["migriert"]["zeile"], s["log_zeile"]["endergebnis"]))
        and alt(s["migriert"]["zeile"], s["log_zeile"]["endergebnis"]) != s["log_zeile"]["endergebnis"]
    )

    print("=" * 78)
    print(f"Spiellog-Migration: {args.csv}  ->  {args.ziel}")
    print("=" * 78)
    print("\n1) Zeilenanzahl")
    print(f"   CSV-Datenzeilen:        {len(rohzeilen)}")
    print(f"   migriert (Dateien):     {len(staende)}")
    print(f"   uebersprungen:          {len(uebersprungen)}")
    for nr, grund in uebersprungen:
        print(f"     - Zeile {nr}: {grund}")
    print(f"   Kontrolle nach dem Schreiben: {abweichungen} abweichende Zahlenwerte")
    print(f"   Endergebnisse, die die alte App eine Binaerstelle anders einlas: {binaerstelle} {pandas_hinweis}")
    if na_namen:
        print(f"   WARNUNG: Spielernamen, die die alte App als 'fehlend' las: {', '.join(na_namen)}")

    print("\n2) Summen der Endergebnisse je Spieler (alt = wie die alte App eingelesen, neu = migrierte Dateien)")
    spieler_reihenfolge = sorted({s["spieler"] for s in neu_gelesen})
    zeilen = []
    for name in spieler_reihenfolge:
        eigene = [s for s in neu_gelesen if s["spieler"] == name]
        werte_neu = [s["log_zeile"]["endergebnis"] for s in eigene]
        werte_alt = [alt(s["migriert"]["zeile"], s["log_zeile"]["endergebnis"]) for s in eigene]
        if pd is not None:
            summe_neu = float(pd.Series(werte_neu, dtype="float64").sum())
            summe_alt = float(pd.Series(werte_alt, dtype="float64").sum())
        else:
            summe_neu = summe_alt = sum(werte_neu)
        zeilen.append([name, str(len(eigene)), f"{summe_alt:.2f}", f"{summe_neu:.2f}",
                       repr(summe_alt), repr(summe_neu), "gleich" if summe_alt == summe_neu else "Binaerstelle"])
    print(tabelle(["Spieler", "Wochen", "alt", "neu", "alt (exakt)", "neu (exakt)", "Vergleich"], zeilen))
    summe_alt_ges = sum(float(z[4]) for z in zeilen)
    summe_neu_ges = sum(float(z[5]) for z in zeilen)
    print(f"   Gesamt: alt {summe_alt_ges:.2f} | neu {summe_neu_ges:.2f}")

    print("\n3) Stichproben alt (CSV-Zeile) / neu (Spielstand-Datei)")
    n = len(neu_gelesen)
    auswahl = sorted({0, n // 4, n // 2, (3 * n) // 4, n - 1}) if n else []
    for i in auswahl:
        s = neu_gelesen[i]
        o = s["migriert"]["original"]
        lz = s["log_zeile"]
        print(f"\n   Zeile {s['migriert']['zeile']} -> {namen[i]}")
        paare = [["spieler", o["spieler"], s["spieler"]], ["datum", o["datum"], str(lz["datum"])],
                 ["level", o["level"], f"{lz['level']} ({s['levelId']})"]]
        paare += [[sp, o[sp], "null" if lz[sp] is None else repr(lz[sp])] for sp in ZAHL_SPALTEN]
        print("   " + tabelle(["Feld", "alt (CSV-Text)", "neu (JSON)"], paare).replace("\n", "\n   "))
    print()
    return 0 if abweichungen == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
