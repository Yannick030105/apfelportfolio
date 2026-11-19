#!/usr/bin/env python3
"""
Erzeugt die Referenzdaten (Soll-Ergebnisse) fuer die TypeScript-Portierung.

Laeuft gegen das alte Python-Projekt (Standard: der Ordner oberhalb von
apfelportfolio-web/) und schreibt nach apfelportfolio-web/tests/referenz/:

    level1_wochen.json                    300 Zufallswochen, Regelwerk aus config/config.json
    level1_wochen_standardregelwerk.json   50 Zufallswochen, Regelwerk() mit Default-Werten
    level1_grenzfaelle.json               gezielte Grenzfaelle
    level2_wochen.json                    300 Zufallswochen, Regelwerk aus config/config.json
    level2_wochen_standardregelwerk.json   50 Zufallswochen, Regelwerk() mit Default-Werten
    level2_grenzfaelle.json               Grenzfaelle inkl. jedes Ereignis einzeln

Alle Zufallswerte (Wuerfel W1, Baeckerei-Menge, Ereignis) stammen aus einem
festen Seed und werden explizit als Parameter an die Level-Klassen
uebergeben (siehe Phase 0). Die Spielerentscheidungen werden so gewaehlt,
wie die Streamlit-Oberflaeche sie zulaesst (Slider-Grenzen exakt wie in
ui/pages/1_spielen.py bzw. ui/pages/level_2.py berechnet).

Die Ausgabe ist deterministisch (kein Zeitstempel). Damit kann jederzeit
geprueft werden, ob die eingecheckten Dateien noch zum Python-Code passen:

    python tools/referenz_erzeugen.py --pruefen

Vorhandene Dateien werden NICHT ueberschrieben (tests/referenz/ ist nach der
einmaligen Erzeugung eingefroren).

DATEIFORMAT
-----------
{
  "format": "apfelportfolio-referenz", "formatVersion": 1,
  "level": 1 | 2, "art": "wochen" | "grenzfaelle",
  "quelle": {python, seed, sha256 der Legacy-Quelldateien},
  "faelle": [
    {
      "name": str, "beschreibung": str,
      "regelwerk": {...alle Regelwerk-Felder...},
      "schritte": [                       # ein Schritt = ein Klick auf "Handel abschliessen"
        {
          "tag_index": 0..4, "tag": "Montag",
          "eingabe": {
            "w1": int, "baeckerei_menge": int,
            # nur Level 2:
            "ereignis_index": int, "ereignis_key": str, "zugestimmt": bool,
            "einkauf": {"importeur_menge", "wochenmarkt_menge", "mosterei_menge"}
          },
          "markt": {...},                  # Tagesmarkt aus erzeuge_tagesmarkt(w1)
          "nachfrage": {...},              # Tagesnachfrage aus erzeuge_tagesnachfrage(menge)
          "kontext": {...},                # nur Level 2: Ergebnis von wende_ereignis_an
          "ui_grenzen": {"importeur_max", "wochenmarkt_max", "mosterei_max"},  # null = Slider ausgeblendet
          "abrechnung": {...} | "fehler": str,   # genau eines von beiden
          "zustand_danach": {"portfoliostand", "importeur_menge_woche"}
        }
      ],
      "woche": {"anzahl_tage", "ist_komplett", "wochenergebnis",
                "rest_long_short", "log_zeile": {...} | null}
    }
  ]
}

Schlaegt ein Schritt mit ValueError fehl, folgt ein weiterer Schritt fuer
denselben Tag (gleiche Wuerfelwerte) - so wie in der Oberflaeche, in der die
Session nach einem Fehler erhalten bleibt und der Spieler erneut klickt. Der
Level-Zustand nach dem Fehler (teilweise Mutation!) ist in zustand_danach
festgehalten.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import random
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any, Callable

WEB_ROOT = Path(__file__).resolve().parent.parent
STANDARD_LEGACY = WEB_ROOT.parent
STANDARD_ZIEL = WEB_ROOT / "tests" / "referenz"

FORMAT_VERSION = 1
ANZAHL_WOCHEN = 300
ANZAHL_WOCHEN_STANDARDREGELWERK = 50
SEED_LEVEL1 = 1_000_001
SEED_LEVEL2 = 2_000_002
SEED_LEVEL1_STANDARD = 1_000_003
SEED_LEVEL2_STANDARD = 2_000_004

LEGACY_DATEIEN = [
    "src/apfelportfolio/domain/models.py",
    "src/apfelportfolio/levels/level1_grundlast.py",
    "src/apfelportfolio/levels/level2_ereignisse.py",
    "config/config.json",
]

# Wird in main() nach dem Import des Legacy-Codes befuellt.
M: Any = None   # apfelportfolio.domain.models
L1: Any = None  # apfelportfolio.levels.level1_grundlast
L2: Any = None  # apfelportfolio.levels.level2_ereignisse


def legacy_importieren(legacy: Path) -> None:
    global M, L1, L2
    sys.path.insert(0, str(legacy / "src"))
    import apfelportfolio.domain.models as models
    import apfelportfolio.levels.level1_grundlast as level1
    import apfelportfolio.levels.level2_ereignisse as level2

    M, L1, L2 = models, level1, level2


def regelwerk_aus_config(legacy: Path):
    """Wie RegelwerkRepository.laden(): Regelwerk(**json) ohne validiert()."""
    daten = json.loads((legacy / "config" / "config.json").read_text(encoding="utf-8"))
    return M.Regelwerk(**daten)


# ---------------------------------------------------------------------------
# Serialisierung (inkl. berechneter Properties)
# ---------------------------------------------------------------------------
def markt_dict(m) -> dict:
    return {
        "zufallspreis": m.zufallspreis,
        "preis_overrides": dict(m.preis_overrides),
        "preis_importeur": m.preis_importeur,
        "preis_wochenmarkt": m.preis_wochenmarkt,
        "preis_baeckerei": m.preis_baeckerei,
        "preis_mosterei": m.preis_mosterei,
    }


def nachfrage_dict(n) -> dict:
    return {
        "schulessen": n.schulessen,
        "baeckerei_bestellt": n.baeckerei_bestellt,
        "gesamt": n.gesamt,
    }


def einkauf_dict(e) -> dict:
    return {
        "importeur_menge": e.importeur_menge,
        "wochenmarkt_menge": e.wochenmarkt_menge,
        "mosterei_menge": e.mosterei_menge,
        "zukauf_gesamt": e.zukauf_gesamt,
    }


def abrechnung_dict(a) -> dict:
    return {
        "tag": a.tag,
        "markt": markt_dict(a.markt),
        "einkauf": einkauf_dict(a.einkauf),
        "nachfrage": nachfrage_dict(a.nachfrage),
        "an_schulessen_geliefert": a.an_schulessen_geliefert,
        "an_baeckerei_geliefert": a.an_baeckerei_geliefert,
        "bilanzkreis_saldo": a.bilanzkreis_saldo,
        "einkaufskosten": a.einkaufskosten,
        "erloes": a.erloes,
        "ausgleichskosten": a.ausgleichskosten,
        "an_mosterei_geliefert": a.an_mosterei_geliefert,
        "portfoliostand": a.portfoliostand,
        "portfolioergebnis": a.portfolioergebnis,
        "ereignis_titel": a.ereignis_titel,
        "tagesergebnis": a.tagesergebnis,
    }


def kontext_dict(k) -> dict:
    return {
        "tag_index": k.tag_index,
        "markt": markt_dict(k.markt),
        "nachfrage": nachfrage_dict(k.nachfrage),
        "obstbauer_menge": k.obstbauer_menge,
        "importeur_verfuegbar": k.importeur_verfuegbar,
        "wochenmarkt_verfuegbar": k.wochenmarkt_verfuegbar,
        "wochenmarkt_limit": k.wochenmarkt_limit,
        "importeur_slider_max": k.importeur_slider_max,
    }


def woche_dict(woche) -> dict:
    rest = sum(t.bilanzkreis_saldo for t in woche.tage)
    log_zeile = None
    if woche.ist_komplett:
        # exakt die Werte, die 1_spielen.py / level_2.py in die LogZeile schreiben
        log_zeile = {
            "level": woche.level,
            "endergebnis": woche.wochenergebnis,
            "rest_long_short": rest,
            "anteil_spot": 0.0,
            "anteil_grundlast": 1.0,
            "prognosefehler": None,
            "referenzergebnis_nichthandeln": 0.0,
        }
    return {
        "anzahl_tage": len(woche.tage),
        "ist_komplett": woche.ist_komplett,
        "wochenergebnis": woche.wochenergebnis,
        "rest_long_short": rest,
        "log_zeile": log_zeile,
    }


# ---------------------------------------------------------------------------
# Entscheidungen: Einkauf als Funktion der aktuellen Lage
# ---------------------------------------------------------------------------
# Signatur: (lage) -> (importeur, wochenmarkt, mosterei)
# lage enthaelt: tag_index, versuch, grenzen_basis (importeur_max,
# wochenmarkt_max), mosterei_max(imp, wm) und rng (fuer Zufallswochen).
Entscheider = Callable[[dict], tuple[float, float, float]]


def fester_einkauf(imp: float = 0.0, wm: float = 0.0, mo: float = 0.0) -> Entscheider:
    return lambda lage: (float(imp), float(wm), float(mo))


def zufallsmenge(rng: random.Random, maximum: int | None) -> float:
    """Zufaellige Slider-Stellung, gewichtet zu typischen Spielzuegen."""
    if maximum is None or maximum <= 0:
        return 0.0
    r = rng.random()
    if r < 0.35:
        return 0.0
    if r < 0.45:
        return float(maximum)
    if r < 0.75:
        return float(rng.randint(0, max(maximum // 3, 0)))
    return float(rng.randint(0, maximum))


def zufallsentscheider(lage: dict) -> tuple[float, float, float]:
    rng = lage["rng"]
    if lage["versuch"] > 0:
        # Wiederholung nach Fehler: Mosterei auf 0, Rest gleich.
        imp, wm, _ = lage["letzter_einkauf"]
        return imp, wm, 0.0
    imp = zufallsmenge(rng, lage["importeur_max"])
    wm = zufallsmenge(rng, lage["wochenmarkt_max"])
    mo = zufallsmenge(rng, lage["mosterei_max"](imp, wm))
    return imp, wm, mo


def maximal_entscheider(lage: dict) -> tuple[float, float, float]:
    """Alle sichtbaren Slider auf Anschlag (Mosterei nach Fehler auf 0)."""
    imp = float(lage["importeur_max"] or 0)
    wm = float(lage["wochenmarkt_max"] or 0)
    mo = 0.0 if lage["versuch"] > 0 else float(lage["mosterei_max"](imp, wm) or 0)
    return imp, wm, mo


def nur_mosterei_maximal(lage: dict) -> tuple[float, float, float]:
    """Kein Zukauf, Mosterei-Slider auf Anschlag (Mo-Do)."""
    mo = 0.0 if lage["versuch"] > 0 else float(lage["mosterei_max"](0.0, 0.0) or 0)
    return 0.0, 0.0, mo


def je_tag(*entscheider: Entscheider) -> Entscheider:
    """Pro Tag ein eigener Entscheider; Versuche > 0 nutzen den Eintrag nach dem Tag."""

    def f(lage: dict):
        return entscheider[lage["tag_index"]](lage)

    return f


def mit_fehlversuch(tag_index: int, falsch: tuple, richtig: Entscheider) -> Entscheider:
    """Am gegebenen Tag zuerst einen ungueltigen Einkauf, danach `richtig`."""

    def f(lage: dict):
        if lage["tag_index"] == tag_index and lage["versuch"] == 0:
            return tuple(float(x) for x in falsch)
        return richtig(lage)

    return f


# ---------------------------------------------------------------------------
# Wochen-Simulation
# ---------------------------------------------------------------------------
MAX_VERSUCHE = 3


def mosterei_max_l1(level, rw, nachfrage, tag_index):
    """Exakt wie 1_spielen.py: None = Slider ausgeblendet (Freitag)."""

    def f(imp: float, wm: float):
        if tag_index == len(L1.WOCHENTAGE) - 1:
            return None
        verfuegbarer_bestand = (
            level.portfoliostand
            + rw.obstbauer_menge
            + imp
            + wm
            - nachfrage.schulessen
            - nachfrage.baeckerei_bestellt
        )
        return max(int(verfuegbarer_bestand), 0)

    return f


def mosterei_max_l2(level, kontext, nachfrage, tag_index):
    """Exakt wie level_2.py - beachte: nutzt die NICHT ereignisbereinigte
    Nachfrage (nachfrage), aber die ereignisbereinigte Obstbauer-Menge."""

    def f(imp: float, wm: float):
        if tag_index == len(L1.WOCHENTAGE) - 1:
            return None
        verfuegbarer_bestand = (
            level.portfoliostand
            + kontext.obstbauer_menge
            + imp
            + wm
            - nachfrage.schulessen
            - nachfrage.baeckerei_bestellt
        )
        return max(int(verfuegbarer_bestand), 0)

    return f


def spiele_woche_l1(
    name: str,
    beschreibung: str,
    rw,
    wuerfel: list[tuple[int, int]],
    entscheider: Entscheider,
    rng: random.Random | None = None,
) -> dict:
    level = L1.Level1Grundlast(regelwerk=rw)
    woche = M.Wochenverlauf(level=level.nummer)
    schritte: list[dict] = []

    for tag_index, tag in enumerate(L1.WOCHENTAGE):
        w1, menge = wuerfel[tag_index]
        letzter = None
        for versuch in range(MAX_VERSUCHE):
            markt = level.erzeuge_tagesmarkt(w1=w1)
            nachfrage = level.erzeuge_tagesnachfrage(baeckerei_menge=menge)
            importeur_max = (
                int(level.regelwerk.importeur_limit)
                if level.importeur_verfuegbar(tag_index)
                else None
            )
            wochenmarkt_max = int(level.regelwerk.wochenmarkt_limit_tag)
            mo_max = mosterei_max_l1(level, rw, nachfrage, tag_index)
            lage = {
                "tag_index": tag_index,
                "versuch": versuch,
                "importeur_max": importeur_max,
                "wochenmarkt_max": wochenmarkt_max,
                "mosterei_max": mo_max,
                "letzter_einkauf": letzter,
                "rng": rng,
            }
            imp, wm, mo = entscheider(lage)
            letzter = (imp, wm, mo)
            einkauf = M.Tageseinkauf(
                importeur_menge=imp, wochenmarkt_menge=wm, mosterei_menge=mo
            )
            schritt: dict = {
                "tag_index": tag_index,
                "tag": tag,
                "eingabe": {
                    "w1": w1,
                    "baeckerei_menge": menge,
                    "einkauf": {
                        "importeur_menge": imp,
                        "wochenmarkt_menge": wm,
                        "mosterei_menge": mo,
                    },
                },
                "markt": markt_dict(markt),
                "nachfrage": nachfrage_dict(nachfrage),
                "ui_grenzen": {
                    "importeur_max": importeur_max,
                    "wochenmarkt_max": wochenmarkt_max,
                    "mosterei_max": mo_max(imp, wm),
                },
            }
            try:
                abrechnung = level.rechne_tag_ab(
                    tag=tag,
                    tag_index=tag_index,
                    markt=markt,
                    nachfrage=nachfrage,
                    einkauf=einkauf,
                )
            except ValueError as fehler:
                schritt["fehler"] = str(fehler)
                schritt["zustand_danach"] = zustand_l1(level)
                schritte.append(schritt)
                continue
            woche.tage.append(abrechnung)
            schritt["abrechnung"] = abrechnung_dict(abrechnung)
            schritt["zustand_danach"] = zustand_l1(level)
            schritte.append(schritt)
            break
        else:
            raise RuntimeError(f"{name}: Tag {tag} nach {MAX_VERSUCHE} Versuchen nicht abrechenbar")

    return {
        "name": name,
        "beschreibung": beschreibung,
        "regelwerk": asdict(rw),
        "schritte": schritte,
        "woche": woche_dict(woche),
    }


def zustand_l1(level) -> dict:
    return {
        "portfoliostand": level.portfoliostand,
        "importeur_menge_woche": level._importeur_menge_woche,
    }


def spiele_woche_l2(
    name: str,
    beschreibung: str,
    rw,
    wuerfel: list[tuple[int, int, int, bool]],
    entscheider: Entscheider,
    rng: random.Random | None = None,
) -> dict:
    level = L2.Level2Ereignisse(regelwerk=rw)
    woche = M.Wochenverlauf(level=level.nummer)
    schritte: list[dict] = []

    for tag_index, tag in enumerate(L1.WOCHENTAGE):
        w1, menge, ereignis_index, zugestimmt = wuerfel[tag_index]
        letzter = None
        for versuch in range(MAX_VERSUCHE):
            markt = level.erzeuge_tagesmarkt(w1=w1)
            nachfrage = level.erzeuge_tagesnachfrage(baeckerei_menge=menge)
            ereignis = level.erzeuge_ereignis(ereignis_index=ereignis_index)
            kontext = level.wende_ereignis_an(
                tag_index=tag_index,
                markt=markt,
                nachfrage=nachfrage,
                ereignis=ereignis,
                zugestimmt=zugestimmt,
            )
            importeur_max = (
                int(kontext.importeur_slider_max)
                if kontext.importeur_verfuegbar and level.importeur_verfuegbar(tag_index)
                else None
            )
            wochenmarkt_max = (
                int(kontext.wochenmarkt_limit) if kontext.wochenmarkt_verfuegbar else None
            )
            mo_max = mosterei_max_l2(level, kontext, nachfrage, tag_index)
            lage = {
                "tag_index": tag_index,
                "versuch": versuch,
                "importeur_max": importeur_max,
                "wochenmarkt_max": wochenmarkt_max,
                "mosterei_max": mo_max,
                "letzter_einkauf": letzter,
                "rng": rng,
            }
            imp, wm, mo = entscheider(lage)
            letzter = (imp, wm, mo)
            einkauf = M.Tageseinkauf(
                importeur_menge=imp, wochenmarkt_menge=wm, mosterei_menge=mo
            )
            schritt: dict = {
                "tag_index": tag_index,
                "tag": tag,
                "eingabe": {
                    "w1": w1,
                    "baeckerei_menge": menge,
                    "ereignis_index": ereignis_index,
                    "ereignis_key": ereignis.key,
                    "zugestimmt": zugestimmt,
                    "einkauf": {
                        "importeur_menge": imp,
                        "wochenmarkt_menge": wm,
                        "mosterei_menge": mo,
                    },
                },
                "markt": markt_dict(markt),
                "nachfrage": nachfrage_dict(nachfrage),
                "kontext": kontext_dict(kontext),
                "ui_grenzen": {
                    "importeur_max": importeur_max,
                    "wochenmarkt_max": wochenmarkt_max,
                    "mosterei_max": mo_max(imp, wm),
                },
            }
            try:
                abrechnung = level.rechne_tag_ab(
                    tag=tag,
                    kontext=kontext,
                    einkauf=einkauf,
                    ereignis_titel=ereignis.titel,
                )
            except ValueError as fehler:
                schritt["fehler"] = str(fehler)
                schritt["zustand_danach"] = zustand_l1(level._level1)
                schritte.append(schritt)
                continue
            woche.tage.append(abrechnung)
            schritt["abrechnung"] = abrechnung_dict(abrechnung)
            schritt["zustand_danach"] = zustand_l1(level._level1)
            schritte.append(schritt)
            break
        else:
            raise RuntimeError(f"{name}: Tag {tag} nach {MAX_VERSUCHE} Versuchen nicht abrechenbar")

    return {
        "name": name,
        "beschreibung": beschreibung,
        "regelwerk": asdict(rw),
        "schritte": schritte,
        "woche": woche_dict(woche),
    }


# ---------------------------------------------------------------------------
# Zufallswochen
# ---------------------------------------------------------------------------
def zufallswochen_l1(rw, anzahl: int, seed: int, praefix: str) -> list[dict]:
    rng = random.Random(seed)
    faelle = []
    for nr in range(anzahl):
        wuerfel = [
            (
                rng.randint(rw.baeckerei_preis_min, rw.baeckerei_preis_max),
                rng.randint(int(rw.baeckerei_menge_min), int(rw.baeckerei_menge_max)),
            )
            for _ in L1.WOCHENTAGE
        ]
        faelle.append(
            spiele_woche_l1(
                f"{praefix}_{nr + 1:03d}",
                f"Zufallswoche {nr + 1} (Seed {seed})",
                rw,
                wuerfel,
                zufallsentscheider,
                rng,
            )
        )
    return faelle


def zufallswochen_l2(rw, anzahl: int, seed: int, praefix: str) -> list[dict]:
    rng = random.Random(seed)
    ereignisse = L2.STANDARD_EREIGNISSE
    faelle = []
    for nr in range(anzahl):
        wuerfel = []
        for _ in L1.WOCHENTAGE:
            w1 = rng.randint(rw.baeckerei_preis_min, rw.baeckerei_preis_max)
            menge = rng.randint(int(rw.baeckerei_menge_min), int(rw.baeckerei_menge_max))
            idx = rng.randrange(len(ereignisse))
            # Toggle existiert nur bei Entscheidungsereignissen, sonst False (wie UI)
            zugestimmt = (
                rng.random() < 0.5 if ereignisse[idx].entscheidung_text is not None else False
            )
            wuerfel.append((w1, menge, idx, zugestimmt))
        faelle.append(
            spiele_woche_l2(
                f"{praefix}_{nr + 1:03d}",
                f"Zufallswoche {nr + 1} (Seed {seed})",
                rw,
                wuerfel,
                zufallsentscheider,
                rng,
            )
        )
    return faelle


# ---------------------------------------------------------------------------
# Grenzfaelle
# ---------------------------------------------------------------------------
W_GEMISCHT = [(1, 10), (3, 35), (6, 60), (2, 22), (5, 47)]


def konst(w1: int, menge: int) -> list[tuple[int, int]]:
    return [(w1, menge)] * 5


def grenzfaelle_l1(rw_config, rw_standard) -> list[dict]:
    f = []
    rc, rs = rw_config, rw_standard
    s = spiele_woche_l1

    f.append(s("null_zukauf", "Kein Zukauf, keine Mosterei an allen Tagen.",
               rc, W_GEMISCHT, fester_einkauf()))
    f.append(s("null_zukauf_standardregelwerk", "Kein Zukauf mit Default-Regelwerk (Fehlmengen).",
               rs, W_GEMISCHT, fester_einkauf()))
    f.append(s("wochenmarkt_limit_exakt", "Wochenmarkt jeden Tag exakt am Tageslimit.",
               rc, W_GEMISCHT, fester_einkauf(wm=rc.wochenmarkt_limit_tag)))
    f.append(s("wochenmarkt_limit_exakt_standardregelwerk", "Wochenmarkt exakt am Default-Limit (140).",
               rs, W_GEMISCHT, fester_einkauf(wm=rs.wochenmarkt_limit_tag)))
    f.append(s("importeur_slider_max_mo_bis_mi",
               "Importeur Mo-Mi jeweils exakt am Slider-Maximum (importeur_limit pro Tag); "
               "Summe ueberschreitet importeur_limit - es gibt keine Wochenpruefung.",
               rc, W_GEMISCHT,
               je_tag(*([fester_einkauf(imp=rc.importeur_limit)] * 3 + [fester_einkauf()] * 2))))
    f.append(s("importeur_wochenlimit_verteilt",
               "Importeur-Summe Mo-Mi exakt importeur_limit (100/100/100).",
               rc, W_GEMISCHT,
               je_tag(*([fester_einkauf(imp=rc.importeur_limit / 3)] * 3 + [fester_einkauf()] * 2))))
    f.append(s("importeur_ueber_slider_max",
               "Importeur ueber Slider-Maximum (nur per UI begrenzt, Logik akzeptiert).",
               rc, W_GEMISCHT,
               je_tag(fester_einkauf(imp=rc.importeur_limit + 1), *[fester_einkauf()] * 4)))
    f.append(s("maximale_nachfrage", "Baeckerei-Menge und W1 jeden Tag am Maximum.",
               rc, konst(rc.baeckerei_preis_max, rc.baeckerei_menge_max), fester_einkauf()))
    f.append(s("maximale_nachfrage_standardregelwerk", "Maximale Nachfrage mit Default-Regelwerk.",
               rs, konst(rs.baeckerei_preis_max, rs.baeckerei_menge_max), fester_einkauf(wm=20)))
    f.append(s("minimale_nachfrage", "Baeckerei-Menge und W1 jeden Tag am Minimum.",
               rc, konst(rc.baeckerei_preis_min, rc.baeckerei_menge_min), fester_einkauf()))
    for w1 in range(rc.baeckerei_preis_min, rc.baeckerei_preis_max + 1):
        f.append(s(f"w1_konstant_{w1}", f"W1 = {w1} an allen Tagen, gemischte Einkaeufe.",
                   rc, [(w1, m) for _, m in W_GEMISCHT],
                   je_tag(fester_einkauf(imp=50, wm=10), fester_einkauf(imp=0, wm=0, mo=20),
                          fester_einkauf(imp=25, wm=5, mo=5), fester_einkauf(wm=30),
                          fester_einkauf(wm=7))))
    f.append(s("mosterei_maximal_mo_bis_do",
               "Mosterei-Slider Mo-Do auf Anschlag (Mosterei-Menge wird beim Saldo doppelt abgezogen).",
               rc, W_GEMISCHT, nur_mosterei_maximal))
    f.append(s("mosterei_maximal_mit_zukauf", "Alle Slider auf Anschlag.",
               rc, W_GEMISCHT, maximal_entscheider))
    f.append(s("freitag_ueberschuss", "Bestand aufbauen, Freitag automatischer Mosterei-Verkauf.",
               rc, W_GEMISCHT, fester_einkauf(wm=50)))
    f.append(s("freitag_fehlmenge", "Default-Regelwerk, hohe Nachfrage: Freitag automatischer Zukauf.",
               rs, konst(4, 60), fester_einkauf()))
    f.append(s("freitag_fehlmenge_durch_mosterei",
               "Mosterei Mo-Do auf Anschlag treibt den Bestand ins Minus; Freitag Zukauf.",
               rc, konst(3, 60), nur_mosterei_maximal))
    f.append(s("freitag_ausgeglichen", "Default-Regelwerk, Bestand exakt 0 am Freitag (100 - 80 - 20).",
               rs, konst(2, 20), fester_einkauf()))
    f.append(s("mosterei_eingabe_am_freitag_ignoriert",
               "Mosterei-Menge am Freitag gesetzt (UI setzt 0) - Logik ignoriert sie.",
               rc, W_GEMISCHT, je_tag(*[fester_einkauf()] * 4, fester_einkauf(mo=50))))
    f.append(s("fehler_wochenmarkt_ueber_limit", "Montag Wochenmarkt Limit+1 -> Fehler, dann exakt Limit.",
               rc, W_GEMISCHT,
               mit_fehlversuch(0, (0, rc.wochenmarkt_limit_tag + 1, 0),
                               fester_einkauf(wm=rc.wochenmarkt_limit_tag))))
    f.append(s("fehler_importeur_am_donnerstag", "Donnerstag Importeur > 0 -> Fehler, dann 0.",
               rc, W_GEMISCHT, mit_fehlversuch(3, (10, 0, 0), fester_einkauf())))
    f.append(s("fehler_importeur_am_freitag", "Freitag Importeur > 0 -> Fehler, dann 0.",
               rc, W_GEMISCHT, mit_fehlversuch(4, (1, 0, 0), fester_einkauf())))
    f.append(s("fehler_mosterei_ueber_bestand", "Dienstag Mosterei > Bestand -> Fehler, dann 0.",
               rc, W_GEMISCHT, mit_fehlversuch(1, (0, 0, 10_000), fester_einkauf())))
    f.append(s("fehler_mosterei_nach_importeur",
               "Montag Importeur 50 + Mosterei zu hoch -> Fehler NACH Hochzaehlen der "
               "Importeur-Wochensumme (Teil-Mutation), dann gueltiger Einkauf.",
               rc, W_GEMISCHT,
               mit_fehlversuch(0, (50, 0, 10_000),
                               je_tag(fester_einkauf(imp=50), *[fester_einkauf()] * 4))))
    f.append(s("fehler_mosterei_bei_negativem_bestand",
               "Default-Regelwerk mit Fehlmenge: Mosterei 1 bei negativem Bestand -> Fehler "
               "(Meldung mit negativem Bestand und :.0f-Rundung).",
               rs, konst(4, 60), mit_fehlversuch(2, (0, 0, 1), fester_einkauf())))
    abweichend = M.Regelwerk(
        importeur_limit=120, wochenmarkt_limit_tag=75, schulessen_menge=55,
        schulessen_preis=0.45, obstbauer_menge=90.5, obstbauer_preis=0.3,
        baeckerei_preis_aufschlag=0.25, baeckerei_preis_min=2, baeckerei_preis_max=9,
        baeckerei_menge_min=0, baeckerei_menge_max=100,
    )
    f.append(s("regelwerk_abweichend", "Alle Regelwerk-Parameter abweichend, Zufallsentscheidungen.",
               abweichend, [(2, 0), (9, 100), (5, 33), (7, 71), (3, 12)],
               zufallsentscheider, random.Random(77)))
    return f


def grenzfaelle_l2(rw_config, rw_standard) -> list[dict]:
    f = []
    rc, rs = rw_config, rw_standard
    s = spiele_woche_l2
    ereignisse = L2.STANDARD_EREIGNISSE

    def wuerfel(idx: int, zugestimmt: bool, basis=W_GEMISCHT):
        return [(w1, m, idx, zugestimmt) for w1, m in basis]

    # Jedes Ereignis einzeln: an allen 5 Tagen dasselbe Ereignis.
    for idx, e in enumerate(ereignisse):
        varianten = [True, False] if e.entscheidung_text is not None else [False]
        for zugestimmt in varianten:
            suffix = ("_zugestimmt" if zugestimmt else "_abgelehnt") if e.entscheidung_text else ""
            f.append(s(f"ereignis_{e.key}{suffix}_null_zukauf",
                       f"Ereignis '{e.key}' an allen Tagen, kein Zukauf.",
                       rc, wuerfel(idx, zugestimmt), fester_einkauf()))
            f.append(s(f"ereignis_{e.key}{suffix}_maximal",
                       f"Ereignis '{e.key}' an allen Tagen, alle sichtbaren Slider auf Anschlag.",
                       rc, wuerfel(idx, zugestimmt), maximal_entscheider))
            f.append(s(f"ereignis_{e.key}{suffix}_standardregelwerk",
                       f"Ereignis '{e.key}' an allen Tagen, Default-Regelwerk, moderater Zukauf.",
                       rs, wuerfel(idx, zugestimmt, konst(4, 60)),
                       lambda lage: (min(30.0, float(lage["importeur_max"] or 0)),
                                     min(20.0, float(lage["wochenmarkt_max"] or 0)), 0.0)))

    idx = {e.key: i for i, e in enumerate(ereignisse)}

    f.append(s("zugestimmt_bei_ereignis_ohne_entscheidung",
               "zugestimmt=True bei Ereignis ohne Entscheidung (Ernteausfall) - wirkt wie immer.",
               rc, wuerfel(idx["ernteausfall"], True), fester_einkauf(wm=10)))
    f.append(s("fehler_importeur_bei_streik", "Importeur trotz Streik -> Fehler, dann 0.",
               rc, wuerfel(idx["importeur_streik"], False),
               mit_fehlversuch(0, (10, 0, 0), fester_einkauf())))
    f.append(s("fehler_wochenmarkt_bei_feiertag", "Wochenmarkt trotz Feiertag -> Fehler, dann 0.",
               rc, wuerfel(idx["wochenmarkt_feiertag"], False),
               mit_fehlversuch(1, (0, 5, 0), fester_einkauf())))
    f.append(s("fehler_wochenmarkt_ueber_halbiertem_limit",
               "Knappheit: Wochenmarkt halbiertes Limit + 1 -> Fehler, dann exakt Limit.",
               rc, wuerfel(idx["wochenmarkt_knappheit"], False),
               mit_fehlversuch(0, (0, rc.wochenmarkt_limit_tag * 0.5 + 1, 0),
                               fester_einkauf(wm=rc.wochenmarkt_limit_tag * 0.5))))
    f.append(s("fehler_wochenmarkt_ueber_regelwerk_limit",
               "Wochenmarkt Regelwerk-Limit + 1 an ruhigem Tag -> Fehler (Level-1-Pruefung zuerst).",
               rc, wuerfel(idx["ruhiger_tag"], False),
               mit_fehlversuch(0, (0, rc.wochenmarkt_limit_tag + 1, 0), fester_einkauf())))
    f.append(s("importeur_rabatt_slider_max_exakt",
               "Rabatt angenommen: Importeur Mo-Mi exakt am erhoehten Slider-Maximum.",
               rc, wuerfel(idx["importeur_rabatt"], True),
               lambda lage: (float(lage["importeur_max"] or 0), 0.0, 0.0)))
    f.append(s("grossauftrag_mosterei_ui_max_fehler",
               "Grossauftrag: Mosterei-Slider (UI rechnet mit unverdoppelter Baeckerei-Menge) "
               "auf Anschlag -> Fehler in der Logik, dann 0.",
               rc, wuerfel(idx["baeckerei_grossauftrag"], False), nur_mosterei_maximal))
    f.append(s("projektwoche_mosterei_ui_max",
               "Projektwoche: Mosterei-Slider auf Anschlag (UI rechnet mit voller Schulessen-Menge).",
               rc, wuerfel(idx["schulessen_projektwoche"], False), nur_mosterei_maximal))
    f.append(s("freitag_feiertag_fehlmenge",
               "Default-Regelwerk, Feiertag am Freitag mit Fehlmenge: automatischer "
               "Wochenmarkt-Zukauf trotz geschlossenem Wochenmarkt.",
               rs, [(4, 60, idx["ruhiger_tag"], False)] * 4
               + [(4, 60, idx["wochenmarkt_feiertag"], False)], fester_einkauf()))
    f.append(s("freitag_knappheit_fehlmenge",
               "Default-Regelwerk, Knappheit am Freitag: Ausgleich zum erhoehten Wochenmarktpreis.",
               rs, [(4, 60, idx["ruhiger_tag"], False)] * 4
               + [(4, 60, idx["wochenmarkt_knappheit"], False)], fester_einkauf()))
    f.append(s("freitag_mosterei_nachfrage_ueberschuss",
               "Mosterei sucht Aepfel am Freitag: Ueberschuss zum erhoehten Mostereipreis.",
               rc, [(w1, m, idx["ruhiger_tag"], False) for w1, m in W_GEMISCHT[:4]]
               + [(5, 47, idx["mosterei_nachfrage"], False)], fester_einkauf(wm=40)))
    f.append(s("alle_ereignisse_nacheinander",
               "Montag bis Freitag fuenf verschiedene Ereignisse, gemischter Einkauf.",
               rc, [(1, 10, 5, True), (3, 35, 3, False), (6, 60, 6, False),
                    (2, 22, 4, False), (5, 47, 7, False)],
               zufallsentscheider, random.Random(4242)))
    return f


# ---------------------------------------------------------------------------
# Ausgabe
# ---------------------------------------------------------------------------
def quelle(legacy: Path, seed: int | None) -> dict:
    hashes = {}
    for rel in LEGACY_DATEIEN:
        hashes[rel] = hashlib.sha256((legacy / rel).read_bytes()).hexdigest()
    return {
        "python": platform.python_version(),
        "seed": seed,
        "sha256": hashes,
    }


def dokument(level: int, art: str, faelle: list[dict], legacy: Path, seed: int | None) -> dict:
    return {
        "format": "apfelportfolio-referenz",
        "formatVersion": FORMAT_VERSION,
        "level": level,
        "art": art,
        "quelle": quelle(legacy, seed),
        "anzahl_faelle": len(faelle),
        "faelle": faelle,
    }


def als_text(doc: dict) -> str:
    # allow_nan=False: NaN/Infinity waeren kein gueltiges JSON.
    return json.dumps(doc, ensure_ascii=False, indent=1, allow_nan=False) + "\n"


def alle_dokumente(legacy: Path) -> dict[str, dict]:
    rc = regelwerk_aus_config(legacy)
    rs = M.Regelwerk()
    return {
        "level1_wochen.json": dokument(
            1, "wochen", zufallswochen_l1(rc, ANZAHL_WOCHEN, SEED_LEVEL1, "l1_woche"),
            legacy, SEED_LEVEL1),
        "level1_wochen_standardregelwerk.json": dokument(
            1, "wochen",
            zufallswochen_l1(rs, ANZAHL_WOCHEN_STANDARDREGELWERK, SEED_LEVEL1_STANDARD, "l1_std"),
            legacy, SEED_LEVEL1_STANDARD),
        "level1_grenzfaelle.json": dokument(
            1, "grenzfaelle", grenzfaelle_l1(rc, rs), legacy, None),
        "level2_wochen.json": dokument(
            2, "wochen", zufallswochen_l2(rc, ANZAHL_WOCHEN, SEED_LEVEL2, "l2_woche"),
            legacy, SEED_LEVEL2),
        "level2_wochen_standardregelwerk.json": dokument(
            2, "wochen",
            zufallswochen_l2(rs, ANZAHL_WOCHEN_STANDARDREGELWERK, SEED_LEVEL2_STANDARD, "l2_std"),
            legacy, SEED_LEVEL2_STANDARD),
        "level2_grenzfaelle.json": dokument(
            2, "grenzfaelle", grenzfaelle_l2(rc, rs), legacy, None),
    }


def statistik(name: str, doc: dict) -> str:
    schritte = [s for fall in doc["faelle"] for s in fall["schritte"]]
    fehler = sum(1 for s in schritte if "fehler" in s)
    komplett = sum(1 for fall in doc["faelle"] if fall["woche"]["ist_komplett"])
    return (f"  {name}: {doc['anzahl_faelle']} Faelle, {len(schritte)} Schritte, "
            f"{fehler} Fehlerschritte, {komplett} komplette Wochen")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--legacy", type=Path, default=STANDARD_LEGACY,
                        help="Pfad zum alten Python-Projekt (Standard: %(default)s)")
    parser.add_argument("--ziel", type=Path, default=STANDARD_ZIEL,
                        help="Zielordner (Standard: %(default)s)")
    parser.add_argument("--pruefen", action="store_true",
                        help="Nur pruefen, ob die vorhandenen Dateien exakt reproduziert werden")
    args = parser.parse_args()

    legacy = args.legacy.resolve()
    legacy_importieren(legacy)
    dokumente = alle_dokumente(legacy)

    if args.pruefen:
        abweichungen = 0
        for name, doc in dokumente.items():
            pfad = args.ziel / name
            if not pfad.exists() or pfad.read_text(encoding="utf-8") != als_text(doc):
                print(f"ABWEICHUNG: {name}")
                abweichungen += 1
            else:
                print(f"ok: {name}")
        return 1 if abweichungen else 0

    vorhanden = [n for n in dokumente if (args.ziel / n).exists()]
    if vorhanden:
        print("Abbruch: Referenzdateien existieren bereits und werden nicht ueberschrieben:")
        for n in vorhanden:
            print(f"  {args.ziel / n}")
        return 1

    args.ziel.mkdir(parents=True, exist_ok=True)
    print(f"Schreibe Referenzdaten nach {args.ziel}")
    for name, doc in dokumente.items():
        (args.ziel / name).write_text(als_text(doc), encoding="utf-8")
        print(statistik(name, doc))
    return 0


if __name__ == "__main__":
    sys.exit(main())
