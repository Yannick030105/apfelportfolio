"""Regelwerk-Seite: Spiel-Einstellungen im Stil eines Options-Menüs.

Reine UI-Anpassung: Es wird ausschließlich vorhandene Logik verwendet
(Regelwerk, RegelwerkRepository). Es werden keine neuen Felder, keine
neue Validierung und keine neue Speicherlogik eingeführt – lediglich
die Darstellung wird an das Spiel-Design der Homepage angeglichen.
"""

from __future__ import annotations

import streamlit as st

from src.apfelportfolio.domain.models import Regelwerk
from src.apfelportfolio.data.specs_repository import RegelwerkRepository

AKZENT = "#C0392B"
GOLD = "#E8A33D"
BRAUN = "#8A4B0F"

st.set_page_config(page_title="Regelwerk – Apfelportfolio", page_icon="📜", layout="centered")


def _inject_style() -> None:
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:ital,wght@0,400;0,600;0,700;1,600&family=JetBrains+Mono:wght@500;700&display=swap');

        [data-testid="stAppViewContainer"] {
            background:
                radial-gradient(circle at 15% 0%, rgba(232,163,61,0.16), transparent 45%),
                radial-gradient(circle at 85% 10%, rgba(192,57,43,0.10), transparent 40%),
                #FCF6EE;
        }
        [data-testid="stHeader"] { background: transparent; }
        .block-container { padding-top: 2rem; max-width: 760px; }

        .rw-hero { text-align: center; margin-bottom: 1.6rem; }
        .rw-hero .icon { font-size: 2.4rem; }
        .rw-hero h1 {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 800; font-size: 2.1rem; color: #6B3610;
            margin: 0.2rem 0 0.1rem 0;
        }
        .rw-hero p {
            font-family: 'Nunito', sans-serif; font-style: italic; font-weight: 600;
            color: #A6521F; margin: 0;
        }

        /* Bereichs-Panel = "Einstellungsgruppe" */
        .settings-panel {
            background: linear-gradient(160deg, #FFFFFF 0%, #FDF2E3 100%);
            border: 2px solid #EFD9BC;
            border-radius: 20px;
            padding: 1.3rem 1.4rem 0.6rem 1.4rem;
            margin-bottom: 1.3rem;
            box-shadow: 0 4px 10px rgba(107,54,16,0.06);
        }
        .settings-panel-header {
            display: flex; align-items: center; gap: 0.7rem;
            margin-bottom: 0.2rem;
        }
        .settings-panel-icon {
            width: 46px; height: 46px; border-radius: 12px;
            background: #FCEBD9; border: 2px solid #E8A33D;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.4rem; flex-shrink: 0;
        }
        .settings-panel-title {
            font-family: 'Baloo 2', sans-serif; font-weight: 700;
            font-size: 1.25rem; color: #2B2118; margin: 0;
        }
        .settings-panel-desc {
            font-family: 'Nunito', sans-serif; font-size: 0.88rem;
            color: #8A7A68; margin: 0 0 0.9rem 62px;
        }

        /* Einzelne Einstellung als Card */
        .setting-card {
            background: #FFFDF9;
            border: 1px solid #EFE1CB;
            border-radius: 14px;
            padding: 0.7rem 0.9rem 0.2rem 0.9rem;
            margin-bottom: 0.7rem;
        }
        .setting-card label p {
            font-family: 'Nunito', sans-serif !important;
            font-weight: 700 !important;
            color: #6B3610 !important;
            font-size: 0.85rem !important;
        }

        /* Zahleneingaben wie kleine Zähler */
        div[data-testid="stNumberInput"] input {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700; color: #2B2118;
        }

        /* Save / Reset Leiste */
        .action-bar { margin-top: 1.6rem; }
        div[data-testid="column"]:has(button[kind="primary"]) .stButton button {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 700; font-size: 1.05rem;
            border-radius: 14px; border: none;
            padding: 0.75rem 1rem;
            background: linear-gradient(180deg, #E8A33D 0%, #C97B1F 100%);
            color: #3A1F00;
            box-shadow: 0 6px 0 #A6611A, 0 10px 18px rgba(166,97,26,0.30);
        }
        .action-bar .stButton button {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 700; border-radius: 14px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _panel_start(icon: str, titel: str, beschreibung: str) -> None:
    st.markdown(
        f"""
        <div class="settings-panel">
            <div class="settings-panel-header">
                <div class="settings-panel-icon">{icon}</div>
                <p class="settings-panel-title">{titel}</p>
            </div>
            <p class="settings-panel-desc">{beschreibung}</p>
        """,
        unsafe_allow_html=True,
    )


def _panel_end() -> None:
    st.markdown("</div>", unsafe_allow_html=True)


def _setting_card_start() -> None:
    st.markdown('<div class="setting-card">', unsafe_allow_html=True)


def _setting_card_end() -> None:
    st.markdown("</div>", unsafe_allow_html=True)


def main() -> None:
    _inject_style()

    st.markdown(
        """
        <div class="rw-hero">
            <div class="icon">⚙️🍎</div>
            <h1>Regelwerk</h1>
            <p>Stelle die Spielwelt nach deinen Wünschen ein.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if "regelwerk" not in st.session_state:
        st.session_state.regelwerk = RegelwerkRepository().laden()
    rw = st.session_state.regelwerk

    # --- Importeur ---
    _panel_start("🚢", "Importeur", "Zukauf von Montag bis Mittwoch, mit begrenzter Gesamtmenge.")
    _setting_card_start()
    neues_limit_importeur = st.number_input(
        "Obergrenze Importeur (Mo–Mi, gesamt)",
        min_value=0, max_value=1000,
        value=rw.importeur_limit, step=10,
    )
    _setting_card_end()
    _panel_end()

    # --- Wochenmarkt ---
    _panel_start("🧺", "Wochenmarkt", "Flexibler Zukauf, jederzeit verfügbar, mit täglicher Obergrenze.")
    _setting_card_start()
    neues_limit_wochenmarkt = st.number_input(
        "Obergrenze Wochenmarkt",
        min_value=0, max_value=1000,
        value=rw.wochenmarkt_limit_tag, step=10,
    )
    _setting_card_end()
    _panel_end()

    # --- Schulessen ---
    _panel_start("🏫", "Schulessen", "Fester Abnehmer mit garantierter Abnahmemenge und festem Preis.")
    _setting_card_start()
    neues_schulessen_menge = st.number_input(
        "Schulessen-Abnahmemenge (Äpfel/Tag)",
        min_value=0, max_value=500,
        value=int(rw.schulessen_menge), step=10,
    )
    _setting_card_end()
    _setting_card_start()
    neues_schulessen_preis = st.number_input(
        "Schulessen-Preis (€/Stück)",
        min_value=0.0, max_value=5.0,
        value=rw.schulessen_preis, step=0.05, format="%.2f",
    )
    _setting_card_end()
    _panel_end()

    # --- Obstbauer ---
    _panel_start("🌳", "Obstbauer", "Fixer täglicher Lieferant mit fester Menge und festem Preis.")
    _setting_card_start()
    neuer_obstbauer_menge = st.number_input(
        "Obstbauer-Liefermenge (Äpfel/Tag)",
        min_value=0, max_value=500,
        value=int(rw.obstbauer_menge), step=10,
    )
    _setting_card_end()
    _setting_card_start()
    neuer_obstbauer_preis = st.number_input(
        "Obstbauer-Preis (€/Stück)",
        min_value=0.0, max_value=5.0,
        value=rw.obstbauer_preis, step=0.05, format="%.2f",
    )
    _setting_card_end()
    _panel_end()

    # --- Bäckerei ---
    _panel_start("🥐", "Bäckerei", "Nachfrage und Preis schwanken – gesteuert über Würfelwerte.")
    _setting_card_start()
    neuer_baeckerei_aufschlag = st.number_input(
        "Preisaufschlag (€/Stück, zusätzlich zu W1/10)",
        min_value=0.0, max_value=2.0,
        value=rw.baeckerei_preis_aufschlag, step=0.05, format="%.2f",
    )
    _setting_card_end()

    _setting_card_start()
    st.markdown(
        "<p style='font-family:Nunito,sans-serif; font-weight:700; color:#6B3610; "
        "font-size:0.85rem; margin-bottom:0.2rem;'>Preiswürfel W1</p>",
        unsafe_allow_html=True,
    )
    col_w1a, col_w1b = st.columns(2)
    with col_w1a:
        neuer_baeckerei_preis_min = st.number_input(
            "Minimum", min_value=1, max_value=20,
            value=rw.baeckerei_preis_min, step=1, key="baeckerei_preis_min",
        )
    with col_w1b:
        neuer_baeckerei_preis_max = st.number_input(
            "Maximum", min_value=1, max_value=20,
            value=rw.baeckerei_preis_max, step=1, key="baeckerei_preis_max",
        )
    _setting_card_end()

    _setting_card_start()
    st.markdown(
        "<p style='font-family:Nunito,sans-serif; font-weight:700; color:#6B3610; "
        "font-size:0.85rem; margin-bottom:0.2rem;'>Nachfragemenge</p>",
        unsafe_allow_html=True,
    )
    col_bm_a, col_bm_b = st.columns(2)
    with col_bm_a:
        neue_baeckerei_menge_min = st.number_input(
            "Minimum", min_value=0, max_value=500,
            value=int(rw.baeckerei_menge_min), step=5, key="baeckerei_menge_min",
        )
    with col_bm_b:
        neue_baeckerei_menge_max = st.number_input(
            "Maximum", min_value=0, max_value=500,
            value=int(rw.baeckerei_menge_max), step=5, key="baeckerei_menge_max",
        )
    _setting_card_end()
    _panel_end()

    # --- Aktionsleiste: Speichern & Zurücksetzen ---
    st.markdown('<div class="action-bar">', unsafe_allow_html=True)
    col_speichern, col_reset = st.columns([2, 1])

    with col_speichern:
        speichern_geklickt = st.button(
            "💾 Änderungen übernehmen", type="primary", use_container_width=True
        )
    with col_reset:
        reset_geklickt = st.button(
            "↺ Standardwerte wiederherstellen", use_container_width=True
        )
    st.markdown("</div>", unsafe_allow_html=True)

    if speichern_geklickt:
        neues_regelwerk = Regelwerk(
            importeur_limit=neues_limit_importeur,
            wochenmarkt_limit_tag=neues_limit_wochenmarkt,
            schulessen_menge=neues_schulessen_menge,
            schulessen_preis=neues_schulessen_preis,
            obstbauer_menge=neuer_obstbauer_menge,
            obstbauer_preis=neuer_obstbauer_preis,
            baeckerei_preis_aufschlag=neuer_baeckerei_aufschlag,
            baeckerei_preis_min=neuer_baeckerei_preis_min,
            baeckerei_preis_max=neuer_baeckerei_preis_max,
            baeckerei_menge_min=neue_baeckerei_menge_min,
            baeckerei_menge_max=neue_baeckerei_menge_max,
        ).validiert()
        st.session_state.regelwerk = neues_regelwerk
        RegelwerkRepository().speichern(neues_regelwerk)
        st.success("Regelwerk gespeichert und für zukünftige Sitzungen übernommen.")

    if reset_geklickt:
        standard_regelwerk = Regelwerk().validiert()
        st.session_state.regelwerk = standard_regelwerk
        RegelwerkRepository().speichern(standard_regelwerk)
        st.success("Standardwerte wiederhergestellt.")
        st.rerun()


if __name__ == "__main__":
    main()
