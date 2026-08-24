"""
Streamlit Entry Point - nur Routing/Navigation, keine Spiellogik.

Start: streamlit run app.py
"""

from __future__ import annotations

import streamlit as st

from src.apfelportfolio.data.specs_repository import RegelwerkRepository
if "regelwerk" not in st.session_state:
    st.session_state.regelwerk = RegelwerkRepository().laden()

st.set_page_config(
    page_title="Apfelportfolio",
    page_icon="🍎",
    layout="wide",
)


# -----------------------------
# Seiten definieren
# -----------------------------

home = st.Page(
    "src/apfelportfolio/ui/pages/home.py",
    title="Home",
    icon="🏠"
)

spielen1 = st.Page(
    "src/apfelportfolio/ui/pages/1_spielen.py",
    title="Level 1",
    icon="1️⃣",
)

spielen2 = st.Page(
    "src/apfelportfolio/ui/pages/level_2.py",
    title="Level 2",
    icon="2️⃣",
)

dashboard = st.Page(
    "src/apfelportfolio/ui/pages/2_dashboard.py",
    title="Dashboard",
    icon="📊",
)

ranking = st.Page(
    "src/apfelportfolio/ui/pages/3_ranking.py",
    title="Ranking",
    icon="🥇",
)

tutorial = st.Page(
    "src/apfelportfolio/ui/pages/4_tutorial.py",
    title="Tutorial",
    icon="📕",
)

wiki = st.Page(
    "src/apfelportfolio/ui/pages/5_wiki.py",
    title="Wiki",
    icon="📖",
)

regelwerk = st.Page(
    "src/apfelportfolio/ui/pages/6_regelwerk.py",
    title="Regelwerk",
    icon="⚙️",
)


# -----------------------------
# Navigation starten
# -----------------------------
pg = st.navigation(
    {
        "Spiel": [home, spielen1, spielen2],
        "Analyse": [dashboard, ranking],
        "Hilfe": [tutorial, wiki, regelwerk],
    }
)

pg.run()