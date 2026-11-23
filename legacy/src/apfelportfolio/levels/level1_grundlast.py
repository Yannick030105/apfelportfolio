"""
Level 1 - Bedarf decken, tageweise Entscheidung (Mo-Fr).

Ueberarbeitung ggue. vorheriger Fassung, abgeglichen mit der Excel-
Beispielrechnung "Apfelportfolio Plan.xlsx":

- Obstbauer liefert fix 100 Stueck/Tag zu 0,35 EUR, Schulessen nimmt fix
  80 Stueck/Tag zu 0,40 EUR ab (beides konstant, nicht zufaellig).
- Alle vier Marktpreise (Baeckerei, Wochenmarkt, Importeur, Mosterei)
  leiten sich aus EINEM gemeinsamen taeglichen Wuerfelwurf W1 (1-6) ab:
      Importeur   = W1 / 10
      Wochenmarkt = W1 / 10 + 0,1
      Baeckerei   = W1 / 10 + 0,2
      Mosterei    = 0,8 * Wochenmarktpreis
- Die Baeckerei-Bestellmenge kommt aus einem zweiten, unabhaengigen
  Wuerfelwurf W2 (1-6): Menge = 10 * W2. Diese Menge wird IMMER voll
  geliefert (kein Deckel durch den verfuegbaren Bestand).
- Keine monetaeren Straf-/Entsorgungskosten mehr. Stattdessen gibt es
  einen automatischen Freitags-Ausgleich: ein Ueberschuss (Long) wird
  zum Mosterei-Preis verkauft, eine Fehlmenge (Short) wird zum
  Wochenmarkt-Preis zugekauft - beides automatisch, keine
  Spielerentscheidung.
- Der laufende Portfoliostand summiert Obstbauer + Importeur +
  Wochenmarkt (Zukaeufe) abzueglich Schulessen + Baeckerei
  (Lieferungen). Anders als die Excel-Formel (die den Importeur beim
  Bestand faelschlich ausser Acht laesst) wird der Importeur hier
  korrekt mitgezaehlt (Fachliche Korrektur, mit Auftraggeber
  abgestimmt).
- Portfolioergebnis pro Tag = Erloese - Einkaufskosten (keine weiteren
  Kostenpositionen).

ANNAHME: Tagesabrechnung wurde um zwei Felder erweitert:
    portfoliostand: float       # kumulierter Bestand nach diesem Tag
    portfolioergebnis: float    # Tagesgewinn = Erloese - Einkaufskosten
Falls das Domain-Model dies noch nicht unterstuetzt, muss es dort
ergaenzt werden.
"""

from __future__ import annotations

import random

from apfelportfolio.domain.models import (
    Tageseinkauf,
    Tagesabrechnung,
    Tagesmarkt,
    Tagesnachfrage,
    Regelwerk,
)

WOCHENTAGE: list[str] = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"]
LETZTER_IMPORTEUR_TAG_INDEX = 2  # 0=Montag ... 2=Mittwoch (Bestellung bis Mittwoch)
LETZTER_TAG_INDEX = len(WOCHENTAGE) - 1  # 4=Freitag

OBSTBAUER_MENGE = 100.0
OBSTBAUER_PREIS = 0.35

SCHULESSEN_MENGE = 80.0
SCHULESSEN_PREIS = 0.4

# Wuerfelwerte: ganzzahlig 1-6, steuern Preise (W1) bzw. Baeckerei-Menge (W2)
WUERFEL_MIN = 1
WUERFEL_MAX = 6
BAECKEREI_MENGE_FAKTOR = 10.0

# Mengenlimits gemaess "Randbedingungen" (Excel-Tabelle)
WOCHENMARKT_MAX_PRO_TAG = 140.0
IMPORTEUR_MAX_GESAMT_MO_MI = 200.0


def _pruefe_einkaufslimits(tag_index: int, einkauf: Tageseinkauf, regelwerk: Regelwerk) -> None:
    if einkauf.wochenmarkt_menge > regelwerk.wochenmarkt_limit_tag:
        raise ValueError(
            f"Wochenmarkt-Menge {einkauf.wochenmarkt_menge} ueberschreitet "
            f"das Tageslimit von {regelwerk.wochenmarkt_limit_tag} Stueck."
        )
    if einkauf.importeur_menge > 0 and tag_index > LETZTER_IMPORTEUR_TAG_INDEX:
        raise ValueError(
            "Importeur kann nur Montag bis Mittwoch bestellt werden."
        )


class Level1Grundlast:
    """Level 1: tageweise Kaufentscheidungen ueber eine Woche (Mo-Fr)."""

    nummer = 1
    titel = "Level 1 - Bedarf decken (tageweise, Mo-Fr)"

    def __init__(self, regelwerk: Regelwerk | None = None) -> None:
        self.regelwerk = regelwerk if regelwerk is not None else Regelwerk()
        self.portfoliostand: float = 0.0
        self._importeur_menge_woche: float = 0.0

    def importeur_verfuegbar(self, tag_index: int) -> bool:
        return tag_index <= LETZTER_IMPORTEUR_TAG_INDEX

    def erzeuge_tagesmarkt(self, w1: int | None = None) -> Tagesmarkt:
        """Wuerfelt W1 in der im Regelwerk eingestellten Spanne. Der Baeckerei-Preis
        wird sofort als Override gesetzt, da sein Aufschlag ebenfalls einstellbar ist -
        alle anderen Preise leiten sich weiterhin per Property aus W1 ab.

        w1: optional vorgegebener Wuerfelwert (fuer Tests/Referenzdaten). Ohne
        Angabe wird wie bisher gewuerfelt."""
        if w1 is None:
            w1 = random.randint(self.regelwerk.baeckerei_preis_min, self.regelwerk.baeckerei_preis_max)
        preis_baeckerei = w1 / 10 + self.regelwerk.baeckerei_preis_aufschlag
        return Tagesmarkt(
            zufallspreis=float(w1),
            preis_overrides={"preis_baeckerei": preis_baeckerei},
        )

    def erzeuge_tagesnachfrage(self, baeckerei_menge: int | None = None) -> Tagesnachfrage:
        """Zieht die Baeckerei-Menge gleichverteilt aus der Regelwerk-Spanne
        (kein Wuerfel mehr, keine 10er-Schritte).

        baeckerei_menge: optional vorgegebener Zufallswert (fuer Tests/
        Referenzdaten). Ohne Angabe wird wie bisher gezogen."""
        if baeckerei_menge is None:
            baeckerei_menge = random.randint(
                int(self.regelwerk.baeckerei_menge_min),
                int(self.regelwerk.baeckerei_menge_max),
            )
        baeckerei = float(baeckerei_menge)
        return Tagesnachfrage(
            schulessen=self.regelwerk.schulessen_menge, baeckerei_bestellt=baeckerei
        )

    def rechne_tag_ab(
            self, tag, tag_index, markt, nachfrage, einkauf,
            obstbauer_menge: float | None = None,
    ) -> Tagesabrechnung:
        if obstbauer_menge is None:
            obstbauer_menge = self.regelwerk.obstbauer_menge

        _pruefe_einkaufslimits(tag_index, einkauf, self.regelwerk)

        if self.importeur_verfuegbar(tag_index):
            neue_importeur_summe = self._importeur_menge_woche + einkauf.importeur_menge
            self._importeur_menge_woche = neue_importeur_summe

        an_schulessen = nachfrage.schulessen
        an_baeckerei = nachfrage.baeckerei_bestellt

        zukauf = obstbauer_menge + einkauf.importeur_menge + einkauf.wochenmarkt_menge

        # Manueller Mosterei-Verkauf: nur Mo-Do, am Freitag uebernimmt der
        # automatische Ausgleich (siehe unten) - keine doppelte Verrechnung.
        an_mosterei = 0.0
        if tag_index != LETZTER_TAG_INDEX:
            verfuegbarer_bestand = self.portfoliostand + zukauf - an_schulessen - an_baeckerei
            if einkauf.mosterei_menge > max(verfuegbarer_bestand, 0.0):
                raise ValueError(
                    f"Verkauf an Mosterei ({einkauf.mosterei_menge:.0f}) uebersteigt "
                    f"den verfuegbaren Bestand ({verfuegbarer_bestand:.0f})."
                )
            an_mosterei = einkauf.mosterei_menge

        lieferung = an_schulessen + an_baeckerei + an_mosterei

        # Automatischer Ausgleich am Freitag: Ueberschuss -> Mosterei,
        # Fehlmenge -> Wochenmarkt-Zukauf. Beides zum Tagespreis.
        zusatz_wochenmarkt_menge = 0.0
        if tag_index == LETZTER_TAG_INDEX:
            voraussichtlicher_saldo = self.portfoliostand + zukauf - lieferung
            if voraussichtlicher_saldo > 0:
                an_mosterei = voraussichtlicher_saldo
            elif voraussichtlicher_saldo < 0:
                zusatz_wochenmarkt_menge = abs(voraussichtlicher_saldo)
                zukauf += zusatz_wochenmarkt_menge

        saldo = zukauf - lieferung - an_mosterei
        self.portfoliostand += saldo

        erloes = (
                an_schulessen * self.regelwerk.schulessen_preis
                + an_baeckerei * markt.preis_baeckerei
                + an_mosterei * markt.preis_mosterei
        )
        einkaufskosten = (
                obstbauer_menge * self.regelwerk.obstbauer_preis
                + einkauf.importeur_menge * markt.preis_importeur
                + (einkauf.wochenmarkt_menge + zusatz_wochenmarkt_menge) * markt.preis_wochenmarkt
        )
        portfolioergebnis = erloes - einkaufskosten

        return Tagesabrechnung(
            tag=tag,
            markt=markt,
            einkauf=einkauf,
            nachfrage=nachfrage,
            an_schulessen_geliefert=an_schulessen,
            an_baeckerei_geliefert=an_baeckerei,
            an_mosterei_geliefert=an_mosterei,
            bilanzkreis_saldo=saldo,
            einkaufskosten=einkaufskosten,
            erloes=erloes,
            portfoliostand=self.portfoliostand,
            portfolioergebnis=portfolioergebnis,
        )
