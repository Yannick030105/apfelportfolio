"""Persistenz fuer das Regelwerk - unabhaengig von Streamlit."""

from __future__ import annotations
from dataclasses import asdict

import json
from pathlib import Path

from src.apfelportfolio.domain.models import Regelwerk

STANDARD_PFAD = Path(__file__).resolve().parent.parent.parent.parent / "config/config.json"


class RegelwerkRepository:
    """Laedt und speichert ein Regelwerk als JSON-Datei."""

    def __init__(self, pfad: Path = STANDARD_PFAD) -> None:
        self.pfad = pfad

    def laden(self) -> Regelwerk:
        """Laedt das gespeicherte Regelwerk oder liefert die Standardwerte."""
        if not self.pfad.exists():
            return Regelwerk()
        try:
            daten = json.loads(self.pfad.read_text(encoding="utf-8"))
            return Regelwerk(**daten)
        except (json.JSONDecodeError, TypeError):
            # Defekte oder veraltete Datei -> auf Standardwerte zurueckfallen,
            # statt die App abstuerzen zu lassen.
            return Regelwerk()

    def speichern(self, regelwerk: Regelwerk) -> None:
        self.pfad.parent.mkdir(parents=True, exist_ok=True)
        self.pfad.write_text(json.dumps(asdict(regelwerk), indent=2), encoding="utf-8")