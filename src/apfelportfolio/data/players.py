"""Verwaltung der Spielernamen für das Player Ranking."""
from pathlib import Path
import pandas as pd

LOG_PATH = Path("data_store/spiellog.csv")  # ggf. an echten Pfad anpassen
PLAYER_COLUMN = "spieler"


def get_existing_players() -> list[str]:
    """Liest alle bisher aufgetretenen Spielernamen eindeutig aus dem Log."""
    if not LOG_PATH.exists():
        return []
    df = pd.read_csv(LOG_PATH)
    if PLAYER_COLUMN not in df.columns:
        return []
    return sorted(df[PLAYER_COLUMN].dropna().unique().tolist())


def player_exists(name: str) -> bool:
    return name.strip().lower() in [p.lower() for p in get_existing_players()]


def validate_new_player_name(name: str) -> tuple[bool, str]:
    """Prüft einen neuen Spielernamen. Gibt (gültig, Fehlermeldung) zurück."""
    name = name.strip()
    if not name:
        return False, "Bitte gib einen Namen ein."
    if len(name) > 30:
        return False, "Der Name darf höchstens 30 Zeichen lang sein."
    if player_exists(name):
        return False, "Dieser Name ist bereits vergeben. Bitte wähle einen anderen."
    return True, ""