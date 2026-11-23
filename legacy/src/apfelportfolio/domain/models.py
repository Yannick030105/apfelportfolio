"""
Fachliche Kernmodelle des Spiels - unabhaengig von Streamlit/UI.

Diese Modelle bilden die Energiewirtschafts-Begriffe direkt ab (siehe
Konzept Abschnitt 2), die Apfel-Metapher lebt ausschliesslich in der
UI-Textschicht (content/translations.py).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum


class Quellentyp(str, Enum):
    """Bezugsquelle fuer eine Beschaffungsentscheidung."""

    GRUNDLAST = "grundlast"      # Obstbauer / Grundlastvertrag
    SPOTMARKT = "spotmarkt"      # Wochenmarkt
    TERMIN = "termin"            # Importeur / Forward


@dataclass(frozen=True)
class Marktpreise:
    """Preise, die fuer eine Spielrunde (einen Tag/eine Woche) gelten."""

    grundlast_preis: float
    spotmarkt_preis: float
    termin_preis: float | None = None


@dataclass(frozen=True)
class Beschaffungsentscheidung:
    """Eine Kaufentscheidung des Spielers in einer Runde."""

    grundlast_menge: float = 0.0
    spotmarkt_menge: float = 0.0
    termin_menge: float = 0.0

    @property
    def gesamtmenge(self) -> float:
        return self.grundlast_menge + self.spotmarkt_menge + self.termin_menge


@dataclass(frozen=True)
class Bedarf:
    """Der tatsaechliche Bedarf (Absatz) einer Runde."""

    menge: float
    prognose: float | None = None  # ab Level 3 relevant

    @property
    def prognosefehler(self) -> float | None:
        if self.prognose is None:
            return None
        return self.menge - self.prognose


@dataclass(frozen=True)
class Bilanzkreis:
    """
    Rest-Long/Short-Position nach Abgleich von Beschaffung und Bedarf.

    positiv = Long (Ueberschuss), negativ = Short (Fehlmenge)
    """

    saldo: float

    @property
    def ist_long(self) -> bool:
        return self.saldo > 0

    @property
    def ist_short(self) -> bool:
        return self.saldo < 0

    @property
    def ist_ausgeglichen(self) -> bool:
        return self.saldo == 0


@dataclass(frozen=True)
class Kostenaufstellung:
    """Kosten-Attribution einer Runde (fuer Dashboard-Chart 'Attribution')."""

    beschaffungskosten: float
    ausgleichskosten: float = 0.0
    prognosefehlerkosten: float = 0.0

    @property
    def gesamtkosten(self) -> float:
        return (
            self.beschaffungskosten
            + self.ausgleichskosten
            + self.prognosefehlerkosten
        )


@dataclass(frozen=True)
class Rundenergebnis:
    """Ergebnis einer einzelnen Spielrunde - Rohdaten fuer eine Log-Zeile."""

    level: int
    runde: int
    entscheidung: Beschaffungsentscheidung
    bedarf: Bedarf
    bilanzkreis: Bilanzkreis
    kosten: Kostenaufstellung
    referenzkosten_nichthandeln: float

    @property
    def mehrwert_ggue_nichthandeln(self) -> float:
        """Leit-KPI: wuerfelbereinigter Mehrwert (siehe Konzept Abschnitt 5)."""
        return self.referenzkosten_nichthandeln - self.kosten.gesamtkosten


@dataclass
class Spieldurchlauf:
    """Ein vollstaendiger Durchlauf eines Levels, bestehend aus Runden."""

    level: int
    gestartet_am: date
    runden: list[Rundenergebnis] = field(default_factory=list)

    @property
    def endergebnis(self) -> float:
        return sum(r.mehrwert_ggue_nichthandeln for r in self.runden)

    @property
    def rest_bilanzkreis(self) -> float:
        return self.runden[-1].bilanzkreis.saldo if self.runden else 0.0


@dataclass(frozen=True)
class TagesBedarf:
    """Bedarf eines einzelnen Tages, getrennt nach Fix- und Zufallsanteil."""

    tag: str
    schulessen: float   # Fixprodukt, dem Spieler vorab bekannt
    baeckerei: float    # zufällige Absatzgröße, erst am Tag selbst bekannt

    @property
    def gesamt(self) -> float:
        return self.schulessen + self.baeckerei


@dataclass(frozen=True)
class Tagesmarkt:
    """Ein pro Tag gezogener Zufallspreis, aus dem alle Marktpreise abgeleitet werden."""

    zufallspreis: float  # zwischen 1 und 6 (Wuerfelzahl W1)
    preis_overrides: dict[str, float] = field(default_factory=dict)  # NEU: Ereignis-Overrides

    @property
    def preis_importeur(self) -> float:
        return self.preis_overrides.get("preis_importeur", self.zufallspreis / 10)

    @property
    def preis_wochenmarkt(self) -> float:
        return self.preis_overrides.get("preis_wochenmarkt", self.zufallspreis / 10 + 0.1)

    @property
    def preis_baeckerei(self) -> float:
        return self.preis_overrides.get("preis_baeckerei", self.zufallspreis / 10 + 0.2)

    @property
    def preis_mosterei(self) -> float:
        # Korrektur: Mosterei-Preis = 0,8 * Wochenmarktpreis (nicht Importeurpreis).
        return self.preis_overrides.get("preis_mosterei", 0.8 * self.preis_wochenmarkt)


@dataclass(frozen=True)
class Tagesergebnis:
    """Ergebnis eines einzelnen Tages innerhalb einer Spielwoche."""

    tag: str
    bedarf: TagesBedarf
    entscheidung: "Beschaffungsentscheidung"
    bilanzkreis: "Bilanzkreis"
    kosten: "Kostenaufstellung"
    referenzkosten_nichthandeln: float

    @property
    def mehrwert_ggue_nichthandeln(self) -> float:
        return self.referenzkosten_nichthandeln - self.kosten.gesamtkosten


@dataclass(frozen=True)
class Tageseinkauf:
    """Zukauf-Entscheidung des Spielers für einen Tag (zusätzlich zum Obstbauer)."""

    importeur_menge: float = 0.0
    wochenmarkt_menge: float = 0.0
    mosterei_menge: float = 0.0

    @property
    def zukauf_gesamt(self) -> float:
        return self.importeur_menge + self.wochenmarkt_menge


@dataclass(frozen=True)
class Tagesnachfrage:
    """Nachfrage eines Tages: Fixkunde Schulessen + zufällige Bäckerei."""

    schulessen: float          # fix, 80 Stück
    baeckerei_bestellt: float  # zufällig: 10 * Wuerfelzahl W2 (1-6)

    @property
    def gesamt(self) -> float:
        return self.schulessen + self.baeckerei_bestellt


@dataclass(frozen=True)
class Tagesabrechnung:
    """Vollständige Abrechnung eines Spieltages."""

    tag: str
    markt: Tagesmarkt
    einkauf: Tageseinkauf
    nachfrage: Tagesnachfrage
    an_schulessen_geliefert: float
    an_baeckerei_geliefert: float
    bilanzkreis_saldo: float       # Bestand - Nachfrage, kann +/- sein
    einkaufskosten: float
    erloes: float
    ausgleichskosten: float = 0.0   # nicht mehr aktiv befuellt, bleibt fuer Abwaertskompatibilitaet
    an_mosterei_geliefert: float = 0.0  # automatischer Freitagsausgleich (Ueberschuss -> Mosterei)
    portfoliostand: float = 0.0         # kumulierter Bestand ueber die Woche nach diesem Tag
    portfolioergebnis: float = 0.0  # Erloese - Einkaufskosten (ohne Ausgleichskosten)
    ereignis_titel: str = ""               # Titel des Tagesereignisses (Level 2)

    @property
    def tagesergebnis(self) -> float:
        return self.erloes - self.einkaufskosten



@dataclass
class Wochenergebnis:
    """Kompletter Wochendurchlauf (Mo-Fr) = eine abgeschlossene Spielrunde."""

    level: int
    fixe_tagesmenge: float
    tage: list[Tagesergebnis] = field(default_factory=list)

    @property
    def endergebnis(self) -> float:
        return sum(t.mehrwert_ggue_nichthandeln for t in self.tage)

    @property
    def gesamtkosten(self) -> float:
        return sum(t.kosten.gesamtkosten for t in self.tage)

    @property
    def rest_bilanzkreis_summe(self) -> float:
        """Summe der täglichen Long/Short-Salden über die Woche (kein Übertrag)."""
        return sum(t.bilanzkreis.saldo for t in self.tage)


@dataclass
class Wochenverlauf:
    """Alle bisher abgeschlossenen Tage einer Spielwoche."""

    level: int
    tage: list[Tagesabrechnung] = field(default_factory=list)

    @property
    def wochenergebnis(self) -> float:
        return sum(t.tagesergebnis for t in self.tage)

    @property
    def ist_komplett(self) -> bool:
        return len(self.tage) >= 5

@dataclass
class Regelwerk:
    """Alle vom Spielleiter einstellbaren Parameter. Defaults = Standardregeln."""
    importeur_limit: int = 200         # max. Äpfel Mo–Mi
    wochenmarkt_limit_tag: int = 140   # max. Äpfel/Tag
    schulessen_menge: int = 80     # fixe Tagesabnahme Schulessen
    schulessen_preis: float = 0.4      # €/Stück Schulessen
    obstbauer_menge: float = 100.0  # fixe Tageslieferung Obstbauer
    obstbauer_preis: float = 0.35  # €/Stück Obstbauer
    baeckerei_preis_aufschlag: float = 0.2  # Aufschlag auf W1/10 fuer Baeckerei-Preis
    baeckerei_preis_min: int = 1  # Spanne des Preiswuerfels W1
    baeckerei_preis_max: int = 6
    baeckerei_menge_min: int = 10  # Spanne der Baeckerei-Bestellmenge
    baeckerei_menge_max: int = 60

    def validiert(self) -> "Regelwerk":
        if self.importeur_limit < 0:
            raise ValueError("Importeur-Obergrenze darf nicht negativ sein.")
        if self.schulessen_menge < 0:
            raise ValueError("Schulessen-Menge darf nicht negativ sein.")
        if self.schulessen_preis < 0:
            raise ValueError("Schulessen-Preis darf nicht negativ sein.")
        if self.obstbauer_menge < 0:
            raise ValueError("Obstbauer-Menge darf nicht negativ sein.")
        if self.obstbauer_preis < 0:
            raise ValueError("Obstbauer-Preis darf nicht negativ sein.")
        if self.baeckerei_preis_aufschlag < 0:
            raise ValueError("Baeckerei-Preisaufschlag darf nicht negativ sein.")
        if self.baeckerei_preis_min > self.baeckerei_preis_max:
            raise ValueError("W1-Minimum darf nicht groesser als W1-Maximum sein.")
        if self.baeckerei_menge_min > self.baeckerei_menge_max:
            raise ValueError(
                "Baeckerei-Mengenminimum darf nicht groesser als das Maximum sein."
            )
        return self