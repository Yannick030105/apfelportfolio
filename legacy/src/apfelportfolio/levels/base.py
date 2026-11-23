"""
Abstrakte Basisklasse fuer alle Level.

Jedes Level implementiert dasselbe Interface, damit Level 5+ spaeter
ergaenzt werden kann, ohne bestehende Level anzufassen (siehe
Projektstruktur-Dokument Abschnitt 4).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from apfelportfolio.domain.models import (
    Beschaffungsentscheidung,
    Bedarf,
    Bilanzkreis,
    Kostenaufstellung,
    Marktpreise,
    Quellentyp,
    Rundenergebnis,
)


class Level(ABC):
    """Gemeinsames Interface aller Spiel-Level."""

    nummer: int
    titel: str

    @abstractmethod
    def verfuegbare_quellen(self) -> list[Quellentyp]:
        """Welche Bezugsquellen sind in diesem Level aktiv."""

    @abstractmethod
    def neue_achse_beschreibung(self) -> str:
        """Text fuer die in diesem Level neu eingefuehrte Entscheidungsachse."""

    @abstractmethod
    def erzeuge_marktpreise(self) -> Marktpreise:
        """Preise fuer die aktuelle Runde erzeugen (ggf. mit Zufall)."""

    @abstractmethod
    def erzeuge_bedarf(self) -> Bedarf:
        """Bedarf (Absatz) der aktuellen Runde erzeugen."""

    def berechne_bilanzkreis(
        self, entscheidung: Beschaffungsentscheidung, bedarf: Bedarf
    ) -> Bilanzkreis:
        """Rest Long/Short = Beschaffung minus Bedarf (Basislogik, ueberschreibbar)."""
        return Bilanzkreis(saldo=entscheidung.gesamtmenge - bedarf.menge)

    @abstractmethod
    def berechne_kosten(
        self,
        entscheidung: Beschaffungsentscheidung,
        preise: Marktpreise,
        bilanzkreis: Bilanzkreis,
        bedarf: Bedarf,
    ) -> Kostenaufstellung:
        """Levelspezifische Kostenlogik (z.B. ab Level 4 Bilanzkreis-Strafgebuehr)."""

    def berechne_referenz_nichthandeln(
        self, preise: Marktpreise, bedarf: Bedarf
    ) -> float:
        """
        Referenzkosten, wenn der Spieler den gesamten Bedarf ueber die
        teuerste verfuegbare Quelle deckt (Baseline fuer Leit-KPI).
        """
        return bedarf.menge * preise.spotmarkt_preis

    def spiele_runde(
        self, runde: int, entscheidung: Beschaffungsentscheidung
    ) -> Rundenergebnis:
        """Orchestriert eine komplette Runde. Wird von der UI aufgerufen."""
        preise = self.erzeuge_marktpreise()
        bedarf = self.erzeuge_bedarf()
        bilanzkreis = self.berechne_bilanzkreis(entscheidung, bedarf)
        kosten = self.berechne_kosten(entscheidung, preise, bilanzkreis, bedarf)
        referenz = self.berechne_referenz_nichthandeln(preise, bedarf)
        return Rundenergebnis(
            level=self.nummer,
            runde=runde,
            entscheidung=entscheidung,
            bedarf=bedarf,
            bilanzkreis=bilanzkreis,
            kosten=kosten,
            referenzkosten_nichthandeln=referenz,
        )
