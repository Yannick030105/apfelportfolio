"""
Schema fuer das zentrale Ergebnis-Log (siehe Konzept Abschnitt 5).

Dies ist die EINZIGE Datenquelle, aus der das gesamte Dashboard gespeist
wird. Jede Zeile entspricht einem abgeschlossenen Spieldurchlauf.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date

# Spaltenreihenfolge ist verbindlich fuer CSV-Export/-Import
LOG_SPALTEN: list[str] = [
    "spieler",
    "datum",
    "level",
    "endergebnis",
    "rest_long_short",
    "anteil_spot",
    "anteil_grundlast",
    "prognosefehler",
    "referenzergebnis_nichthandeln",
]


@dataclass(frozen=True)
class LogZeile:
    """Eine Zeile im zentralen Log - ein abgeschlossener Durchlauf."""

    spieler: str
    datum: date
    level: int
    endergebnis: float
    rest_long_short: float
    anteil_spot: float          # 0..1
    anteil_grundlast: float     # 0..1
    prognosefehler: float | None  # None vor Level 3
    referenzergebnis_nichthandeln: float

    def to_dict(self) -> dict:
        d = asdict(self)
        d["datum"] = self.datum.isoformat()
        return d
