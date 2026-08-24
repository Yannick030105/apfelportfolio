# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller-Spec für Apfelportfolio.

Wichtiger Architektur-Hinweis (siehe README.md):
- Einstiegspunkt ist "app.py" im Projekt-Root (nicht src/apfelportfolio/app.py).
- Streamlit ist eine Multipage-App: die Seiten liegen unter
  src/apfelportfolio/ui/pages/*.py und werden von Streamlit zur Laufzeit als
  echte .py-Dateien vom Dateisystem geladen (nicht nur als kompilierter Code).
  Deshalb müssen app.py + der komplette src/apfelportfolio-Baum als RAW-Dateien
  (datas) mit ins Bundle, nicht nur als hiddenimports.
- config/config.json, data_store/spiellog.csv und .streamlit/config.toml
  gehören ebenfalls als Daten ins Bundle, damit die App direkt lauffähig ist.
- Es wird bewusst --onedir (COLLECT) genutzt, nicht --onefile, damit der Start
  vom Netzlaufwerk nicht bei jedem Aufruf neu entpackt werden muss.
"""

from pathlib import Path
from PyInstaller.utils.hooks import collect_all

ROOT = Path(SPECPATH).parent
SRC = ROOT / "src"
APP_NAME = "apfelportfolio"

# --- Hidden Imports / Daten der Bibliotheken einsammeln -------------------
datas = []
binaries = []
hiddenimports = []

for pkg in ["streamlit", "altair", "pandas", "pyarrow"]:
    d, b, h = collect_all(pkg)
    datas += d
    binaries += b
    hiddenimports += h

# Eigene Package-Module explizit ergänzen (Submodule werden von Streamlit
# teils dynamisch importiert und von PyInstaller sonst nicht erkannt)
hiddenimports += [
    "apfelportfolio",
    "apfelportfolio.version",
    "apfelportfolio.content",
    "apfelportfolio.content.translations",
    "apfelportfolio.dashboard",
    "apfelportfolio.dashboard.kpis",
    "apfelportfolio.data",
    "apfelportfolio.data.repository",
    "apfelportfolio.data.schema",
    "apfelportfolio.data.specs_repository",
    "apfelportfolio.domain",
    "apfelportfolio.domain.models",
    "apfelportfolio.levels",
    "apfelportfolio.levels.base",
    "apfelportfolio.levels.level1_grundlast",
    "apfelportfolio.levels.level2_ereignisse",
    "apfelportfolio.ui",
    "apfelportfolio.ui.components",
]

# --- Eigene Quelldateien als ECHTE Dateien mitliefern ----------------------
# (Notwendig, damit Streamlit die Multipage-Struktur zur Laufzeit vom
# Dateisystem lesen kann. Ziel-Verzeichnis "app" im Bundle-Root.)
# WICHTIG: app.py importiert per "from src.apfelportfolio...", d. h. "src"
# selbst ist ein Package (mit __init__.py) und muss als GANZER Ordner mit,
# nicht nur sein Inhalt.
datas += [
    (str(ROOT / "app.py"), "app"),
    (str(SRC), "app/src"),
]

# Konfiguration, Datenablage und Streamlit-Settings
datas += [
    (str(ROOT / "config"), "config"),
    (str(ROOT / "data_store"), "data_store"),
    (str(ROOT / ".streamlit"), ".streamlit"),
]

a = Analysis(
    [str(ROOT / "spec" / "launcher.py")],
    pathex=[str(SRC)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib.tests"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=APP_NAME,
    console=False,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name=APP_NAME,
)