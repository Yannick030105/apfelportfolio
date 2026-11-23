"""
Persistenz fuer das zentrale Log. MVP: CSV-Datei.

Austauschbar gegen SQLite o.ae., ohne dass Level-/Dashboard-Code sich
aendern muss - beide sprechen nur mit LogRepository.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.apfelportfolio.data.schema import LOG_SPALTEN, LogZeile

DEFAULT_LOG_PATH = Path("data_store/spiellog.csv")


class LogRepository:
    """Liest und schreibt Spieldurchlaeufe in das zentrale Log."""

    def __init__(self, pfad: Path | str = DEFAULT_LOG_PATH) -> None:
        self._pfad = Path(pfad)

    def anhaengen(self, zeile: LogZeile) -> None:
        """Haengt einen abgeschlossenen Durchlauf an das Log an."""
        self._pfad.parent.mkdir(parents=True, exist_ok=True)
        df_neu = pd.DataFrame([zeile.to_dict()], columns=LOG_SPALTEN)
        schreibe_header = not self._pfad.exists()
        df_neu.to_csv(
            self._pfad, mode="a", header=schreibe_header, index=False
        )

    def alle_laden(self) -> pd.DataFrame:
        """Laedt das komplette Log. Leeres DataFrame, falls noch keine Daten."""
        if not self._pfad.exists():
            return pd.DataFrame(columns=LOG_SPALTEN)
        return pd.read_csv(self._pfad, parse_dates=["datum"])

    def fuer_level(self, level: int) -> pd.DataFrame:
        """Nur Durchlaeufe eines Levels - Vergleiche gelten nur pro Level."""
        df = self.alle_laden()
        return df[df["level"] == level].reset_index(drop=True)

    def bekannte_spieler(self) -> list[str]:
        """Eindeutige, sortierte Liste aller bisher aufgetretenen Spielernamen."""
        df = self.alle_laden()
        if "spieler" not in df.columns or df.empty:
            return []
        return sorted(df["spieler"].dropna().unique().tolist())

    def fuer_spieler(self, spieler: str) -> pd.DataFrame:
        """Nur Durchlaeufe eines bestimmten Spielers."""
        df = self.alle_laden()
        return df[df["spieler"] == spieler].reset_index(drop=True)