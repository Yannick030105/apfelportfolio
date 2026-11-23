"""
Phase 0 der TypeScript-Migration: Wuerfelwerte sind als Parameter
uebergebbar. Diese Tests sichern ab, dass sich das Spielverhalten dadurch
nicht aendert:

* Ohne Parameter wird exakt wie vorher gewuerfelt (gleicher Zufallsverbrauch,
  gleiche Ergebnisse bei gleichem Seed).
* Mit Parameter entsteht dasselbe Ergebnis wie beim Wuerfeln desselben Werts,
  und der globale Zufallsgenerator wird nicht angefasst.
"""

from __future__ import annotations

import random

import pytest

from apfelportfolio.domain.models import Regelwerk, Tageseinkauf
from apfelportfolio.levels.level1_grundlast import WOCHENTAGE, Level1Grundlast
from apfelportfolio.levels.level2_ereignisse import (
    STANDARD_EREIGNISSE,
    Level2Ereignisse,
    waehle_ereignis,
)

REGELWERKE = [
    Regelwerk(),
    Regelwerk(
        importeur_limit=300,
        wochenmarkt_limit_tag=300,
        schulessen_menge=90,
        schulessen_preis=0.4,
        obstbauer_menge=200,
        obstbauer_preis=0.35,
        baeckerei_preis_aufschlag=0.2,
        baeckerei_preis_min=1,
        baeckerei_preis_max=6,
        baeckerei_menge_min=10,
        baeckerei_menge_max=60,
    ),
]


# ---------------------------------------------------------------------------
# Nachbau der urspruenglichen Wuerfel-Logik (Stand vor Phase 0) als Referenz.
# ---------------------------------------------------------------------------
def _alt_w1(rw: Regelwerk) -> int:
    return random.randint(rw.baeckerei_preis_min, rw.baeckerei_preis_max)


def _alt_baeckerei(rw: Regelwerk) -> float:
    return float(random.randint(int(rw.baeckerei_menge_min), int(rw.baeckerei_menge_max)))


@pytest.mark.parametrize("rw", REGELWERKE)
def test_level1_ohne_parameter_wuerfelt_wie_vorher(rw: Regelwerk) -> None:
    level = Level1Grundlast(regelwerk=rw)
    for seed in range(50):
        random.seed(seed)
        erwartet_w1 = _alt_w1(rw)
        erwartet_menge = _alt_baeckerei(rw)
        erwarteter_folgewert = random.random()

        random.seed(seed)
        markt = level.erzeuge_tagesmarkt()
        nachfrage = level.erzeuge_tagesnachfrage()
        folgewert = random.random()

        assert markt.zufallspreis == float(erwartet_w1)
        assert markt.preis_baeckerei == erwartet_w1 / 10 + rw.baeckerei_preis_aufschlag
        assert nachfrage.baeckerei_bestellt == erwartet_menge
        assert nachfrage.schulessen == rw.schulessen_menge
        # gleicher Zufallsverbrauch
        assert folgewert == erwarteter_folgewert


@pytest.mark.parametrize("rw", REGELWERKE)
def test_level1_mit_parameter_identisch_und_ohne_zufall(rw: Regelwerk) -> None:
    level = Level1Grundlast(regelwerk=rw)
    for w1 in range(rw.baeckerei_preis_min, rw.baeckerei_preis_max + 1):
        random.seed(w1)
        zustand = random.getstate()
        markt = level.erzeuge_tagesmarkt(w1=w1)
        assert random.getstate() == zustand
        assert markt.zufallspreis == float(w1)
        assert markt.preis_overrides == {
            "preis_baeckerei": w1 / 10 + rw.baeckerei_preis_aufschlag
        }
    for menge in range(rw.baeckerei_menge_min, rw.baeckerei_menge_max + 1):
        zustand = random.getstate()
        nachfrage = level.erzeuge_tagesnachfrage(baeckerei_menge=menge)
        assert random.getstate() == zustand
        assert nachfrage.baeckerei_bestellt == float(menge)
        assert isinstance(nachfrage.baeckerei_bestellt, float)


def test_waehle_ereignis_ohne_parameter_wie_vorher() -> None:
    for seed in range(100):
        random.seed(seed)
        erwartet = random.choice(STANDARD_EREIGNISSE)
        random.seed(seed)
        assert waehle_ereignis() is erwartet


def test_waehle_ereignis_mit_index() -> None:
    zustand = random.getstate()
    for i, ereignis in enumerate(STANDARD_EREIGNISSE):
        assert waehle_ereignis(ereignis_index=i) is ereignis
    assert random.getstate() == zustand


@pytest.mark.parametrize("rw", REGELWERKE)
def test_level2_wuerfelt_wie_vorher(rw: Regelwerk) -> None:
    level = Level2Ereignisse(regelwerk=rw)
    for seed in range(50):
        random.seed(seed)
        erwartet_w1 = _alt_w1(rw)
        erwartet_menge = _alt_baeckerei(rw)
        erwartet_ereignis = random.choice(STANDARD_EREIGNISSE)

        random.seed(seed)
        assert level.erzeuge_tagesmarkt().zufallspreis == float(erwartet_w1)
        assert level.erzeuge_tagesnachfrage().baeckerei_bestellt == erwartet_menge
        assert level.erzeuge_ereignis() is erwartet_ereignis

        assert level.erzeuge_tagesmarkt(w1=erwartet_w1).zufallspreis == float(erwartet_w1)
        assert (
            level.erzeuge_tagesnachfrage(baeckerei_menge=int(erwartet_menge)).baeckerei_bestellt
            == erwartet_menge
        )
        idx = STANDARD_EREIGNISSE.index(erwartet_ereignis)
        assert level.erzeuge_ereignis(ereignis_index=idx) is erwartet_ereignis


@pytest.mark.parametrize("rw", REGELWERKE)
def test_ganze_woche_gewuerfelt_gleich_vorgegeben(rw: Regelwerk) -> None:
    """Eine komplette Woche: gewuerfelt (Seed) vs. dieselben Werte vorgegeben."""
    random.seed(1234)
    gewuerfelt = Level1Grundlast(regelwerk=rw)
    vorgegeben = Level1Grundlast(regelwerk=rw)
    for i, tag in enumerate(WOCHENTAGE):
        markt_a = gewuerfelt.erzeuge_tagesmarkt()
        nachfrage_a = gewuerfelt.erzeuge_tagesnachfrage()
        markt_b = vorgegeben.erzeuge_tagesmarkt(w1=int(markt_a.zufallspreis))
        nachfrage_b = vorgegeben.erzeuge_tagesnachfrage(
            baeckerei_menge=int(nachfrage_a.baeckerei_bestellt)
        )
        einkauf = Tageseinkauf(
            importeur_menge=20.0 if i <= 2 else 0.0, wochenmarkt_menge=10.0
        )
        a = gewuerfelt.rechne_tag_ab(tag, i, markt_a, nachfrage_a, einkauf)
        b = vorgegeben.rechne_tag_ab(tag, i, markt_b, nachfrage_b, einkauf)
        assert a == b
    assert gewuerfelt.portfoliostand == vorgegeben.portfoliostand
