"""
KPI-Berechnung fuer das Dashboard (Konzept Abschnitt 6).

Bewusst getrennt von Streamlit, damit die KPI-Logik ohne UI testbar ist.
"""

from __future__ import annotations

import pandas as pd

MIN_DURCHLAEUFE_FUER_VERLAUF = 5


def durchschnittsergebnis(df: pd.DataFrame) -> float | None:
    if df.empty:
        return None
    return float(df["endergebnis"].mean())

def bestes_ergebnis(df: pd.DataFrame) -> float | None:
    if df.empty:
        return None
    return float(df["endergebnis"].max())


def schlechtestes_ergebnis(df: pd.DataFrame) -> float | None:
    if df.empty:
        return None
    return float(df["endergebnis"].min())


def ergebnis_streuung(df: pd.DataFrame) -> float | None:
    """Standardabweichung als einfaches Risikomass."""
    if len(df) < 2:
        return None
    return float(df["endergebnis"].std())


def hat_genug_daten_fuer_verlauf(df: pd.DataFrame) -> bool:
    return len(df) >= MIN_DURCHLAEUFE_FUER_VERLAUF

def ermittele_badges(df_spieler_level: pd.DataFrame) -> list[dict]:
    anzahl_wochen = len(df_spieler_level)
    bestes = bestes_ergebnis(df_spieler_level) if not df_spieler_level.empty else 0.0

    return [
        {"icon": "🥉", "titel": "Erste Woche", "beschreibung": "Spiele deinen ersten Durchlauf.",
         "freigeschaltet": anzahl_wochen >= 1},
        {"icon": "🥈", "titel": "Vielspieler", "beschreibung": "Spiele mindestens 10 Durchläufe.",
         "freigeschaltet": anzahl_wochen >= 10},
        {"icon": "🥇", "titel": "Über 500 €", "beschreibung": "Erziele ein Ergebnis von mehr als 500 €.",
         "freigeschaltet": bestes > 500},
        {"icon": "💰", "titel": "Über 1000 €", "beschreibung": "Erziele ein Ergebnis von mehr als 1000 €.",
         "freigeschaltet": bestes > 1000},
    ]
