import shutil
import os
import re
from datetime import datetime
from pathlib import Path

from invoke import task

ROOT = Path(__file__).parent
DIST_DIR = ROOT / "dist"
BUILD_DIR = ROOT / "build"
SPEC_FILE = ROOT / "spec" / "app.spec"
DEPLOY_ROOT = ROOT / "deploy_out"
APP_NAME = "apfelportfolio"

# Pfad zum PyInstaller-Executable im .venv (Windows-Layout: .venv/Scripts/)
VENV_PYINSTALLER = ROOT / ".venv" / "Scripts" / "pyinstaller.exe"


def get_version():
    """Liest die Versionsnummer aus version.py aus."""
    with open("src/apfelportfolio/version.py", "r") as file:
        content = file.read()
        match = re.search(r"__version__ = '(\d+\.\d+\.\d+)'", content)
        return match.group(1) if match else "0.0.0"


@task
def clean(c):
    """Bereinige temporäre Dateien und Build-Artefakte."""
    for folder in ("var", "build", "dist", "deploy_out"):
        if os.path.exists(folder):
            shutil.rmtree(folder)
    print("Bereinigung abgeschlossen.")

    os.makedirs("var", exist_ok=True)
    print("Ordnerstruktur erstellt.")


@task(pre=[clean])
def setup(c):
    """Erzeugt das .venv und installiert die Projektabhaengigkeiten."""
    if os.path.exists(".venv"):
        shutil.rmtree(".venv")
    c.run("python -m venv .venv")
    c.run(r".venv\Scripts\python -m pip install --upgrade pip")
    c.run(r".venv\Scripts\python -m pip install -e .[dev]")
    print(".venv erstellt und Abhaengigkeiten installiert.")


@task(pre=[clean])
def build(c):
    """Erstellt den PyInstaller-Build (--onedir) über die app.spec."""
    if not SPEC_FILE.exists():
        raise FileNotFoundError(
            f"Spec-Datei nicht gefunden: {SPEC_FILE}. "
            "Erwartet unter build_scripts/app.spec."
        )
    if not VENV_PYINSTALLER.exists():
        raise FileNotFoundError(
            f"PyInstaller nicht gefunden unter: {VENV_PYINSTALLER}. "
            "Zuerst 'invoke setup' ausfuehren bzw. "
            "'pip install pyinstaller' im aktiven .venv nachholen."
        )

    c.run(
        f'"{VENV_PYINSTALLER}" "{SPEC_FILE}" '
        f'--distpath="{DIST_DIR}" --workpath="{BUILD_DIR}" '
        f'--clean --noconfirm'
    )

    dist_app_dir = DIST_DIR / APP_NAME

    # Zusätzliche Dateien, die die .spec nicht bereits über datas mitliefert
    if (ROOT / "README.md").exists():
        shutil.copy(ROOT / "README.md", dist_app_dir / "README.md")
    if (ROOT / "CHANGELOG.md").exists():
        shutil.copy(ROOT / "CHANGELOG.md", dist_app_dir / "CHANGELOG.md")

    # Versionnummer nach version.txt schreiben
    with open(dist_app_dir / "version.txt", "w") as f:
        f.write(get_version())

    print(f"Build erstellt: {dist_app_dir}")


@task(pre=[build])
def package(c):
    """Baut den fertigen Drag-and-Drop-Ordner fuer das Netzlaufwerk."""
    DEPLOY_ROOT.mkdir(parents=True, exist_ok=True)
    stempel = datetime.now().strftime("%Y-%m-%d")
    version = get_version()
    ziel = DEPLOY_ROOT / f"{APP_NAME}_{version}_{stempel}"

    shutil.copytree(DIST_DIR / APP_NAME, ziel)

    # data_store liegt zwar bereits über die .spec im Bundle, wird hier aber
    # zusätzlich sichergestellt, falls der Ordner beim ersten Start fehlt
    # (z. B. nach manuellem Loeschen durch einen Kollegen).
    (ziel / "data_store").mkdir(exist_ok=True)

    # Komfort-Starter mit sprechendem Namen anlegen
    starter = ziel / "Spiel starten.bat"
    starter.write_text(
        f'@echo off\r\nstart "" "%~dp0{APP_NAME}.exe"\r\n',
        encoding="utf-8",
    )

    print(f"Fertiger Deploy-Ordner: {ziel}")
    print("Diesen Ordner per Drag & Drop auf das Netzlaufwerk kopieren.")


@task(pre=[package])
def deploy_info(c):
    """Reine Erinnerungsausgabe, kein automatisches Kopieren aufs Netzlaufwerk."""
    print("Hinweis: Kopieren auf das Netzlaufwerk erfolgt manuell (Drag & Drop),")
    print("um Schreibrechte-Probleme und versehentliches Ueberschreiben zu vermeiden.")


@task
def help(c):
    """Zeigt eine Übersicht aller verfügbaren Tasks und deren Beschreibungen an."""
    tasks = {
        "setup": "Erzeugt das .venv und installiert die Abhaengigkeiten",
        "clean": "Bereinigt den var-Ordner und die Builds.",
        "build": "Baut das Projekt (PyInstaller --onedir ueber app.spec).",
        "package": "Erstellt den fertigen Drag-and-Drop-Ordner fuer das Netzlaufwerk.",
        "deploy_info": "Baut package und zeigt Hinweise zum manuellen Netzlaufwerk-Kopieren.",
    }

    print("Verfügbare Tasks:")
    for task_name, description in tasks.items():
        print(f" - {task_name}: {description}")
