"""Wiederverwendbare Streamlit-Widgets fuer das gesamte Spiel."""

from __future__ import annotations

import streamlit as st

from src.apfelportfolio.content.translations import UEBERSETZUNG
from src.apfelportfolio.data.players import get_existing_players, validate_new_player_name



def zeige_kopfzeile(level_titel: str) -> None:
    """Einheitlicher Seitenkopf ueber allen Level-Seiten."""
    st.title(level_titel)
    st.caption("Apfelportfolio")


def zeige_uebersetzungstabelle() -> None:
    """Begleitspalte: Apfel <-> Energiewirtschaft (Konzept Abschnitt 2)."""
    with st.expander("Was bedeutet das im Energiehandel?", expanded=False):
        st.table(UEBERSETZUNG)


def zeige_rundenergebnis_karten(
    bedarf: float,
    beschafft: float,
    bilanzkreis_saldo: float,
    gesamtkosten: float,
) -> None:
    """Kompakte Kennzahlen-Kacheln nach jeder Runde."""
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Bedarf (Aepfel)", f"{bedarf:.0f}")
    col2.metric("Beschafft (Aepfel)", f"{beschafft:.0f}")
    col3.metric(
        "Rest Long/Short",
        f"{bilanzkreis_saldo:+.0f}",
        delta_color="off",
    )
    col4.metric("Kosten (EUR)", f"{gesamtkosten:.2f}")

def render_player_selector() -> str | None:
    """Zeigt die Spielerauswahl/-anlage an. Gibt den aktiven Spielernamen zurück."""

    st.markdown(
        """
        <style>
        .player-card {
            background: linear-gradient(135deg, #fff5e6 0%, #ffe8cc 100%);
            border: 2px solid #e8a33d;
            border-radius: 16px;
            padding: 1.25rem 1.5rem;
            margin-bottom: 1rem;
        }
        .player-card h3 {
            margin: 0 0 0.5rem 0;
            color: #8a4b0f;
        }
        .active-player-badge {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 0.3rem 0.9rem;
            border-radius: 999px;
            font-weight: 600;
            font-size: 0.95rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.markdown('<div class="player-card">', unsafe_allow_html=True)
    st.markdown("### 🍎 Wer spielt heute?")

    existing_players = get_existing_players()
    mode = st.radio(
        "Auswahl",
        options=["Vorhandenen Spieler wählen", "Neuen Spieler anlegen"],
        horizontal=True,
        label_visibility="collapsed",
    )

    active_player = None

    if mode == "Vorhandenen Spieler wählen":
        if existing_players:
            active_player = st.selectbox("Spieler", options=existing_players)
        else:
            st.info("Es gibt noch keine gespeicherten Spieler. Lege gleich den ersten an!")
    else:
        new_name = st.text_input("Name eingeben", placeholder="z. B. Anna")
        if new_name:
            valid, error = validate_new_player_name(new_name)
            if valid:
                if st.button("✅ Spieler anlegen und starten"):
                    active_player = new_name.strip()
            else:
                st.warning(error)

    if active_player:
        st.session_state["current_player"] = active_player

    current = st.session_state.get("current_player")
    if current:
        st.markdown(
            f'<span class="active-player-badge">🎮 Aktiver Spieler: {current}</span>',
            unsafe_allow_html=True,
        )

    st.markdown('</div>', unsafe_allow_html=True)
    return st.session_state.get("current_player")