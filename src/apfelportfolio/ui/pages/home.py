"""Homepage / Hauptmenü des Apfelportfolio-Spiels.

Reine UI-Seite: Es wird ausschließlich vorhandene Logik verwendet
(get_existing_players, validate_new_player_name, LogRepository,
ermittele_badges). Es wird keine neue Spiellogik hinzugefügt oder
verändert – lediglich die Darstellung (Hauptmenü-Optik statt
Verwaltungsseite, inkl. Badge-Icons auf der Spielerkarte).
"""

from __future__ import annotations

import pandas as pd
import streamlit as st

from src.apfelportfolio.data.players import get_existing_players, validate_new_player_name
from src.apfelportfolio.data.repository import LogRepository
from src.apfelportfolio.dashboard.kpis import ermittele_badges

AKZENT = "#C0392B"   # Apfelrot
GOLD = "#E8A33D"      # Medaillen-/Münzgold
BRAUN = "#8A4B0F"     # Kiste/Holz
DUNKEL = "#2B2118"    # Fließtext dunkel
CREME = "#FBF3EC"     # Papier/Karten-Hintergrund


st.set_page_config(page_title="Apfelportfolio", page_icon="🍎", layout="centered")


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
        .block-container { padding-top: 2.2rem; max-width: 780px; }

        /* ---------- Hero ---------- */
        .hero-wrap { text-align: center; margin-bottom: 1.6rem; }
        .hero-seal {
            width: 92px; height: 92px; margin: 0 auto 0.6rem auto;
            border-radius: 50%;
            background: radial-gradient(circle at 35% 30%, #FFE3AE 0%, #E8A33D 55%, #C97B1F 100%);
            border: 4px solid #FCF6EE;
            box-shadow: 0 0 0 3px #E8A33D, 0 10px 22px rgba(138,75,15,0.35);
            display: flex; align-items: center; justify-content: center;
            font-size: 2.6rem;
        }
        .hero-title {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 800;
            font-size: 3rem;
            letter-spacing: 0.5px;
            color: #6B3610;
            text-shadow: 0 2px 0 #FFE3AE, 0 4px 10px rgba(107,54,16,0.18);
            margin: 0;
        }
        .hero-tagline {
            font-family: 'Nunito', sans-serif;
            font-style: italic;
            font-weight: 600;
            font-size: 1.05rem;
            color: #A6521F;
            margin-top: 0.15rem;
        }

        /* ---------- Section heading ---------- */
        .menu-heading {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 700;
            font-size: 1.35rem;
            color: #6B3610;
            text-align: center;
            margin: 1.6rem 0 0.9rem 0;
        }

        /* ---------- Trader card ---------- */
        .trader-card {
            position: relative;
            background: linear-gradient(160deg, #FFFFFF 0%, #FDF2E3 100%);
            border: 2px solid #EFD9BC;
            border-radius: 18px;
            padding: 1.1rem 1.1rem 0.4rem 1.1rem;
            margin-bottom: 0.7rem;
            box-shadow: 0 4px 10px rgba(107,54,16,0.06);
        }
        .trader-card.is-selected {
            border-color: #C0392B;
            box-shadow: 0 0 0 3px rgba(192,57,43,0.18), 0 8px 18px rgba(192,57,43,0.18);
        }
        .trader-avatar {
            width: 52px; height: 52px; border-radius: 50%;
            background: #FCEBD9; border: 2px solid #E8A33D;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; margin-bottom: 0.5rem;
        }
        .trader-name {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 700; font-size: 1.15rem; color: #2B2118;
            display: flex; align-items: center; gap: 0.4rem;
        }
        .level-chip {
            display: inline-block;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.72rem; font-weight: 700;
            color: #6B3610; background: #F3E1C5;
            border-radius: 999px; padding: 0.15rem 0.6rem;
            margin: 0.35rem 0 0.5rem 0;
        }
        .best-score {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700; color: #C0392B; font-size: 0.95rem;
            margin-bottom: 0.5rem;
        }
        .best-score .label {
            font-family: 'Nunito', sans-serif; font-weight: 600;
            color: #9A8A78; font-size: 0.75rem; margin-right: 0.35rem;
        }

        /* ---------- Badges auf der Spielerkarte ---------- */
        .trader-badges {
            position: absolute;
            top: 0.75rem;
            right: 1rem;
            font-size: 1.5rem;
            line-height: 1;
            min-height: 1.5rem;
        }

        /* Buttons inside trader cards -> "Weiter spielen" look */
        div[data-testid="stVerticalBlock"] .trader-card + div .stButton button,
        .stButton button {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 700;
            border-radius: 12px;
            border: none;
        }

        /* New trader / add card */
        .add-card {
            border: 2px dashed #D8B98A;
            border-radius: 18px;
            padding: 1.3rem 1.1rem;
            text-align: center;
            color: #A6521F;
            font-family: 'Nunito', sans-serif;
            font-weight: 700;
            margin-bottom: 0.7rem;
            background: rgba(255,255,255,0.4);
        }

        /* Start button */
        .start-zone { margin-top: 1.4rem; text-align: center; }
        .start-zone .stButton button {
            font-size: 1.25rem;
            padding: 0.85rem 2.6rem;
            background: linear-gradient(180deg, #E8A33D 0%, #C97B1F 100%);
            color: #3A1F00;
            box-shadow: 0 6px 0 #A6611A, 0 10px 18px rgba(166,97,26,0.35);
        }
        .start-zone .stButton button:hover:enabled { filter: brightness(1.05); }
        .start-zone .stButton button:disabled {
            background: #E7DFD3; color: #B3A794;
            box-shadow: none;
        }

        /* Preview scoreboard */
        .preview-strip {
            display: flex; justify-content: center; gap: 0.6rem;
            margin-top: 1.2rem; flex-wrap: wrap;
        }
        .preview-chip {
            background: #2B2118; color: #FCF6EE;
            border-radius: 12px; padding: 0.55rem 1rem;
            font-family: 'Nunito', sans-serif; text-align: center;
            min-width: 118px;
        }
        .preview-chip .num {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700; font-size: 1.1rem; color: #E8A33D;
            display: block;
        }
        .preview-chip .cap {
            font-size: 0.68rem; letter-spacing: 0.4px;
            text-transform: uppercase; color: #C9B79E;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _render_hero() -> None:
    st.markdown(
        """
        <div class="hero-wrap">
            <div class="hero-seal">🍎</div>
            <p class="hero-title">Apfelportfolio</p>
            <p class="hero-tagline">Werde zum erfolgreichsten Obsthändler.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _spieler_kennzahlen(df: pd.DataFrame, spieler: str) -> dict:
    """Leitet Level-Anzeige, Bestergebnis, letzten Rang, letzten Gewinn,
    Anzahl gespielter Wochen sowie freigeschaltete Badges ausschließlich
    aus dem vorhandenen Log ab."""
    leer = {
        "level_label": "Neuling",
        "best": None,
        "letzter_rang": None,
        "letzter_gewinn": None,
        "wochen": 0,
        "badges": [],
    }
    if df.empty or "spieler" not in df.columns:
        return leer

    eigene = df[df["spieler"] == spieler]
    if eigene.empty:
        return leer

    hoechstes_level = int(eigene["level"].max())
    bestes_ergebnis = float(eigene["endergebnis"].max())
    letzte_zeile = eigene.sort_values("datum").iloc[-1]
    letzter_gewinn = float(letzte_zeile["endergebnis"])
    wochen = int(len(eigene))

    letzter_rang = None
    level_letzte = int(letzte_zeile["level"])
    df_level = df[df["level"] == level_letzte]
    if not df_level.empty:
        bestenliste = (
            df_level.groupby("spieler")["endergebnis"].max().sort_values(ascending=False)
        )
        if spieler in bestenliste.index:
            letzter_rang = int(bestenliste.index.get_loc(spieler)) + 1

    return {
        "level_label": f"Level {hoechstes_level}",
        "best": bestes_ergebnis,
        "letzter_rang": letzter_rang,
        "letzter_gewinn": letzter_gewinn,
        "wochen": wochen,
        "badges": ermittele_badges(eigene),
    }


def _render_trader_card(name: str, kennzahlen: dict, ist_aktiv: bool) -> None:
    card_klasse = "trader-card is-selected" if ist_aktiv else "trader-card"
    best_text = f"{kennzahlen['best']:.2f} €" if kennzahlen["best"] is not None else "–"
    badge_icons = "".join(b["icon"] for b in kennzahlen["badges"] if b["freigeschaltet"])

    st.markdown(
        f"""
        <div class="{card_klasse}">
            <div class="trader-avatar">👤</div>
            <div class="trader-name">{name}{' 🎮' if ist_aktiv else ''}</div>
            <span class="level-chip">{kennzahlen['level_label']}</span>
            <div class="best-score"><span class="label">Bestes Ergebnis</span>{best_text}</div>
            <div class="trader-badges">{badge_icons}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    label = "🎮 Aktiver Händler" if ist_aktiv else "▶ Weiter spielen"
    if st.button(label, key=f"waehle_{name}", disabled=ist_aktiv, use_container_width=True):
        st.session_state["current_player"] = name
        st.rerun()


def _render_new_trader_card() -> None:
    st.markdown(
        """
        <div class="add-card">
            ➕ Neuen Händler gründen
        </div>
        """,
        unsafe_allow_html=True,
    )
    neuer_name = st.text_input(
        "Name des neuen Händlers", placeholder="z. B. Anna", label_visibility="collapsed"
    )
    if neuer_name:
        gueltig, fehler = validate_new_player_name(neuer_name)
        if gueltig:
            if st.button("✅ Gründen und loslegen", key="gruende_haendler", use_container_width=True):
                st.session_state["current_player"] = neuer_name.strip()
                st.rerun()
        else:
            st.warning(fehler)


def _render_vorschau(df: pd.DataFrame, spieler: str, kennzahlen: dict) -> None:
    rang_text = f"#{kennzahlen['letzter_rang']}" if kennzahlen["letzter_rang"] else "–"
    gewinn_text = f"{kennzahlen['letzter_gewinn']:.2f} €" if kennzahlen["letzter_gewinn"] is not None else "–"
    wochen_text = str(kennzahlen["wochen"]) if kennzahlen["wochen"] else "0"

    st.markdown(
        f"""
        <div class="preview-strip">
            <div class="preview-chip"><span class="num">{rang_text}</span><span class="cap">Letzter Rang</span></div>
            <div class="preview-chip"><span class="num">{gewinn_text}</span><span class="cap">Letzter Gewinn</span></div>
            <div class="preview-chip"><span class="num">{wochen_text}</span><span class="cap">Gespielte Wochen</span></div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def main() -> None:
    _inject_style()
    _render_hero()

    repo = LogRepository()
    df = repo.alle_laden()

    aktueller_spieler = st.session_state.get("current_player")
    vorhandene_spieler = get_existing_players()

    st.markdown('<p class="menu-heading">Spiel auswählen</p>', unsafe_allow_html=True)

    if vorhandene_spieler:
        spalten = st.columns(3)
        for index, name in enumerate(vorhandene_spieler):
            with spalten[index % 3]:
                kennzahlen = _spieler_kennzahlen(df, name)
                _render_trader_card(name, kennzahlen, ist_aktiv=(name == aktueller_spieler))

    st.markdown('<p class="menu-heading">Oder neu beginnen</p>', unsafe_allow_html=True)
    _render_new_trader_card()

    aktueller_spieler = st.session_state.get("current_player")

    st.markdown('<div class="start-zone">', unsafe_allow_html=True)
    spiel_starten = st.button(
        "▶ Spiel starten",
        key="spiel_starten",
        disabled=aktueller_spieler is None,
        use_container_width=False,
    )
    st.markdown("</div>", unsafe_allow_html=True)

    if spiel_starten and aktueller_spieler:
        st.success(f"Los geht's, {aktueller_spieler}! Wähle links dein Level, um zu starten.")
        st.balloons()

    if aktueller_spieler:
        kennzahlen = _spieler_kennzahlen(df, aktueller_spieler)
        _render_vorschau(df, aktueller_spieler, kennzahlen)


if __name__ == "__main__":
    main()
