"""
Level 2 - Bedarf decken mit taeglichem Zufallsereignis (Mo-Fr).

Baut auf Level 1 (level1_grundlast.py) auf und verwendet dessen geprüfte
Abrechnung wieder (Limits, Freitags-Ausgleich, Ergebnis). Level 2 legt pro
Tag GENAU EIN Zufallsereignis darueber, das temporaer Stellschrauben
veraendert:

    * Preise         (Importeur, Wochenmarkt, Baeckerei-Verkauf, Mosterei)
    * Mengen         (Obstbauer-Produktion, Schulessen-/Baeckerei-Nachfrage)
    * Verfuegbarkeit (Importeur / Wochenmarkt an einem Tag gesperrt)
    * Kauf-Limits    (Wochenmarkt-Tageslimit, Importeur-Slider-Maximum)

Ein Ereignis kann optional eine JA/NEIN-Entscheidung anbieten. Die Effekte
greifen dann nur bei Zustimmung.

VORAUSSETZUNGEN (siehe models_ergaenzung.py):
    * Tagesmarkt.preis_overrides: dict[str, float]  (Properties beruecksichtigen es)
    * Tagesabrechnung.ereignis_titel: str
    * Level1Grundlast.rechne_tag_ab(..., obstbauer_menge=OBSTBAUER_MENGE)

ERWEITERN
---------
Neue Szenarien NUR in STANDARD_EREIGNISSE ergaenzen - das ist reine Daten-
Konfiguration. Neue Wirkungsarten genau einmal in EFFEKT_FUNKTIONEN.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field, replace
from typing import Callable

from apfelportfolio.domain.models import (
    Tageseinkauf,
    Tagesabrechnung,
    Tagesmarkt,
    Tagesnachfrage,
    Regelwerk,
)
from apfelportfolio.levels.level1_grundlast import (
    OBSTBAUER_MENGE,
    SCHULESSEN_MENGE,
    WOCHENMARKT_MAX_PRO_TAG,
    Level1Grundlast,
)

# Slider-Obergrenze fuer den Importeur-Zukauf (per Ereignis veraenderbar).
IMPORTEUR_SLIDER_MAX = 100.0


# ---------------------------------------------------------------------------
# Tageskontext: alle pro Tag veraenderbaren Stellschrauben an einem Ort.
# ---------------------------------------------------------------------------
@dataclass
class Tageskontext:
    tag_index: int
    markt: Tagesmarkt
    nachfrage: Tagesnachfrage
    obstbauer_menge: float = OBSTBAUER_MENGE
    importeur_verfuegbar: bool = True
    wochenmarkt_verfuegbar: bool = True
    wochenmarkt_limit: float = WOCHENMARKT_MAX_PRO_TAG
    importeur_slider_max: float = IMPORTEUR_SLIDER_MAX


# ---------------------------------------------------------------------------
# Effekt-Bausteine: (kontext, wert) -> neuer kontext.
# Neue Wirkungsarten hier EINMAL ergaenzen und in EFFEKT_FUNKTIONEN eintragen.
# ---------------------------------------------------------------------------
def _skaliere_preis(kontext: Tageskontext, faktor: float, feld: str) -> Tageskontext:
    overrides = dict(kontext.markt.preis_overrides)
    overrides[feld] = getattr(kontext.markt, feld) * faktor
    return replace(kontext, markt=replace(kontext.markt, preis_overrides=overrides))


def _skaliere_nachfrage(kontext: Tageskontext, faktor: float, feld: str) -> Tageskontext:
    neu = replace(kontext.nachfrage, **{feld: getattr(kontext.nachfrage, feld) * faktor})
    return replace(kontext, nachfrage=neu)


EFFEKT_FUNKTIONEN: dict[str, Callable[[Tageskontext, float], Tageskontext]] = {
    "importeur_preis": lambda k, w: _skaliere_preis(k, w, "preis_importeur"),
    "wochenmarkt_preis": lambda k, w: _skaliere_preis(k, w, "preis_wochenmarkt"),
    "baeckerei_preis": lambda k, w: _skaliere_preis(k, w, "preis_baeckerei"),
    "mosterei_preis": lambda k, w: _skaliere_preis(k, w, "preis_mosterei"),
    "obstbauer_menge": lambda k, w: replace(k, obstbauer_menge=k.obstbauer_menge * w),
    "schulessen_menge": lambda k, w: _skaliere_nachfrage(k, w, "schulessen"),
    "baeckerei_menge": lambda k, w: _skaliere_nachfrage(k, w, "baeckerei_bestellt"),
    "importeur_gesperrt": lambda k, _: replace(k, importeur_verfuegbar=False),
    "wochenmarkt_gesperrt": lambda k, _: replace(k, wochenmarkt_verfuegbar=False),
    "wochenmarkt_limit": lambda k, w: replace(k, wochenmarkt_limit=k.wochenmarkt_limit * w),
    "importeur_slider_max": lambda k, w: replace(
        k, importeur_slider_max=k.importeur_slider_max * w
    ),
}


# ---------------------------------------------------------------------------
# Ereignis-Definition (reine Daten).
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Effekt:
    name: str  # Schluessel in EFFEKT_FUNKTIONEN
    wert: float = 1.0


@dataclass(frozen=True)
class Ereignis:
    """entscheidung_text gesetzt -> UI bietet JA/NEIN, Effekte nur bei Zustimmung.
    entscheidung_text None       -> Effekte wirken automatisch.
    """

    key: str
    titel: str
    beschreibung: str
    effekte: tuple[Effekt, ...] = field(default_factory=tuple)
    entscheidung_text: str | None = None
    hinweis: str = ""


# ---------------------------------------------------------------------------
# Standard-Szenarien - frei erweiterbar. Faktor 1.0 = keine Aenderung.
# ---------------------------------------------------------------------------
STANDARD_EREIGNISSE: tuple[Ereignis, ...] = (
    Ereignis(
        key="ruhiger_tag",
        titel="Ruhiger Tag",
        beschreibung="Nichts Besonderes am Markt. Alles laeuft wie gewohnt.",
        hinweis="Gute Gelegenheit, Bestand fuer teurere Tage aufzubauen.",
    ),
    Ereignis(
        key="importeur_streik",
        titel="Streik beim Importeur",
        beschreibung="Der Importeur liefert heute nicht. Zukauf nur ueber den Wochenmarkt.",
        effekte=(Effekt("importeur_gesperrt"),),
        hinweis="Fehlmengen muessen heute teurer am Wochenmarkt gedeckt werden.",
    ),
    Ereignis(
        key="wochenmarkt_feiertag",
        titel="Feiertag - Wochenmarkt geschlossen",
        beschreibung="Der Wochenmarkt hat heute zu. Kein Zukauf hier.",
        effekte=(Effekt("wochenmarkt_gesperrt"),),
        hinweis="Bist du short, hilft heute nur der Importeur (Mo-Mi).",
    ),
    Ereignis(
        key="ernteausfall",
        titel="Ernteausfall beim Obstbauer",
        beschreibung="Unwetter: der Obstbauer liefert heute nur die Haelfte.",
        effekte=(Effekt("obstbauer_menge", 0.5),),
        hinweis="Weniger Grundlast - ggf. zukaufen, um das Schulessen zu decken.",
    ),
    Ereignis(
        key="baeckerei_grossauftrag",
        titel="Grossauftrag der Baeckerei",
        beschreibung="Die Baeckerei feiert Jubilaeum und verdoppelt ihre Bestellung.",
        effekte=(Effekt("baeckerei_menge", 2.0),),
        hinweis="Hoehere Auslieferung - Bestand kann knapp werden.",
    ),
    Ereignis(
        key="importeur_rabatt",
        titel="Sonderangebot beim Importeur",
        beschreibung="Der Importeur raeumt sein Lager: 30 % Rabatt auf den Tagespreis.",
        effekte=(
            Effekt("importeur_preis", 0.7),
            Effekt("importeur_slider_max", 1.5),  # hebt Slider-Max auf 150
        ),
        entscheidung_text="Grosslieferung annehmen? (Rabatt + hoeheres Kauflimit)",
        hinweis="Guenstig kaufen lohnt nur, wenn du den Bestand auch los wirst.",
    ),
    Ereignis(
        key="wochenmarkt_knappheit",
        titel="Knappheit am Wochenmarkt",
        beschreibung="Aepfel sind knapp: Wochenmarktpreis +50 %, Tageslimit halbiert.",
        effekte=(
            Effekt("wochenmarkt_preis", 1.5),
            Effekt("wochenmarkt_limit", 0.5),
        ),
        hinweis="Kurzfristiges Zukaufen wird teuer - vorausschauend disponieren.",
    ),
    Ereignis(
        key="mosterei_nachfrage",
        titel="Mosterei sucht Aepfel",
        beschreibung="Die Mosterei zahlt heute 40 % mehr fuer Ueberschuss.",
        effekte=(Effekt("mosterei_preis", 1.4),),
        hinweis="Ein Long lohnt sich heute - v. a. mit Blick auf den Freitag.",
    ),
    Ereignis(
        key="schulessen_projektwoche",
        titel="Projektwoche in der Schule",
        beschreibung="Das Schulessen nimmt heute 25 % weniger ab.",
        effekte=(Effekt("schulessen_menge", 0.75),),
        hinweis="Geringere Auslieferung - Ueberschuss droht.",
    ),
)


def waehle_ereignis(
    ereignisse: tuple[Ereignis, ...] = STANDARD_EREIGNISSE,
) -> Ereignis:
    """Zieht genau ein Ereignis (Gleichverteilung)."""
    return random.choice(ereignisse)


class Level2Ereignisse:
    """Level 2: Level-1-Mechanik plus taegliches Zufallsereignis."""

    nummer = 2
    titel = "Level 2 - Ereignisse meistern (tageweise, Mo-Fr)"

    def __init__(self, regelwerk: Regelwerk | None = None) -> None:
        self.regelwerk = regelwerk if regelwerk is not None else Regelwerk()
        self._level1 = Level1Grundlast(regelwerk=self.regelwerk)

    # -- Zustand an Level 1 durchreichen -----------------------------------
    @property
    def portfoliostand(self) -> float:
        return self._level1.portfoliostand

    def zuruecksetzen(self) -> None:
        self._level1 = Level1Grundlast(regelwerk=self.regelwerk)

    def importeur_verfuegbar(self, tag_index: int) -> bool:
        return self._level1.importeur_verfuegbar(tag_index)

    def erzeuge_tagesmarkt(self) -> Tagesmarkt:
        return self._level1.erzeuge_tagesmarkt()

    def erzeuge_tagesnachfrage(self) -> Tagesnachfrage:
        return self._level1.erzeuge_tagesnachfrage()

    def erzeuge_ereignis(self) -> Ereignis:
        return waehle_ereignis()

    # -- Effekte anwenden ---------------------------------------------------
    def wende_ereignis_an(
        self,
        tag_index: int,
        markt: Tagesmarkt,
        nachfrage: Tagesnachfrage,
        ereignis: Ereignis,
        zugestimmt: bool = False,
    ) -> Tageskontext:
        """Baut den Tageskontext und wendet die Effekte an, wenn das Ereignis
        keine Entscheidung verlangt oder der Spieler zugestimmt hat."""
        importeur_rest_heute = self.regelwerk.importeur_limit
        kontext = Tageskontext(
            tag_index=tag_index,
            markt=markt,
            nachfrage=nachfrage,
            obstbauer_menge=self.regelwerk.obstbauer_menge,
            wochenmarkt_limit=self.regelwerk.wochenmarkt_limit_tag,
            importeur_slider_max=importeur_rest_heute,
        )
        wirkt = ereignis.entscheidung_text is None or zugestimmt
        if not wirkt:
            return kontext
        for effekt in ereignis.effekte:
            kontext = EFFEKT_FUNKTIONEN[effekt.name](kontext, effekt.wert)
        return kontext

    # -- Tagesabrechnung ----------------------------------------------------
    def rechne_tag_ab(
        self,
        tag: str,
        kontext: Tageskontext,
        einkauf: Tageseinkauf,
        ereignis_titel: str = "",
    ) -> Tagesabrechnung:
        """Rechnet den Tag ab - Effekte stecken bereits im Kontext.

        Preise wirken ueber markt.preis_overrides, die variable Obstbauer-
        Menge und die Nachfrage werden an Level 1 durchgereicht. Verfuegbar-
        keit und Limits werden hier als harte Regeln vor der Abrechnung
        geprueft.
        """
        self._pruefe_verfuegbarkeit(kontext, einkauf)
        abrechnung = self._level1.rechne_tag_ab(
            tag=tag,
            tag_index=kontext.tag_index,
            markt=kontext.markt,
            nachfrage=kontext.nachfrage,
            einkauf=einkauf,
            obstbauer_menge=kontext.obstbauer_menge,
        )
        return replace(abrechnung, ereignis_titel=ereignis_titel)

    def _pruefe_verfuegbarkeit(
        self, kontext: Tageskontext, einkauf: Tageseinkauf
    ) -> None:
        if not kontext.importeur_verfuegbar and einkauf.importeur_menge > 0:
            raise ValueError("Der Importeur ist heute (Ereignis) nicht verfuegbar.")
        if not kontext.wochenmarkt_verfuegbar and einkauf.wochenmarkt_menge > 0:
            raise ValueError("Der Wochenmarkt ist heute (Ereignis) geschlossen.")
        if einkauf.wochenmarkt_menge > kontext.wochenmarkt_limit:
            raise ValueError(
                f"Wochenmarkt-Menge {einkauf.wochenmarkt_menge} ueberschreitet "
                f"das heutige Limit von {kontext.wochenmarkt_limit} Stueck."
            )
