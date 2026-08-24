"""
Launcher für die PyInstaller-.exe.

Zweck:
- Ersetzt den Aufruf "streamlit run app.py" durch einen programmatischen
  Start, da eine gefrorene .exe keinen "streamlit"-Befehl im PATH hat.
- Ermittelt den Ordner, in dem die .exe liegt (bzw. Projekt-Root im
  Dev-Modus) und setzt ihn als Arbeitsbasis, damit config/, data_store/
  und .streamlit/ zuverlässig gefunden werden -- unabhängig davon, von
  welchem Laufwerk/Pfad die .exe gestartet wird (z. B. Netzlaufwerk).

Ablage im Projekt: build_scripts/launcher.py
"""

import os
import sys
from pathlib import Path


def resolve_base_path() -> Path:
    """Ordner der .exe (gefroren) bzw. Projekt-Root (Dev-Modus)."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)  # PyInstaller onedir-Bundle-Root
    return Path(__file__).resolve().parent.parent


def resolve_runtime_root() -> Path:
    """Ordner, in dem die .exe selbst liegt (für Config/Daten NEBEN der exe)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


def main() -> None:
    base_path = resolve_base_path()
    runtime_root = resolve_runtime_root()

    # Wird von app.py / repository.py / config-Loader ausgewertet, um
    # config.json und spiellog.csv zuverlässig NEBEN der .exe zu finden
    # (nicht im PyInstaller-Temp-Verzeichnis).
    os.environ["APFELPORTFOLIO_RUNTIME_ROOT"] = str(runtime_root)

    if getattr(sys, "frozen", False):
        app_script = str(base_path / "app" / "app.py")
        # "src" ist selbst ein Package (from src.apfelportfolio import ...),
        # deshalb den ELTERN-Ordner von "src" auf den Pfad legen, nicht "src"
        # selbst.
        sys.path.insert(0, str(base_path / "app"))
    else:
        app_script = str(base_path / "app.py")
        # Im Dev-Modus liegt "src" direkt unter dem Projekt-Root.
        sys.path.insert(0, str(base_path))

    from streamlit.web import cli as stcli

    sys.argv = [
        "streamlit",
        "run",
        app_script,
        "--global.developmentMode=false",
        "--server.headless=false",
        "--browser.gatherUsageStats=false",
    ]
    sys.exit(stcli.main())


if __name__ == "__main__":
    main()
