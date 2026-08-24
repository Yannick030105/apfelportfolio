"""Dashboard-Seite: Statistik-Bildschirm im Spiel-Design.

Anpassung ggü. Vorversion: Alle Kennzahlen, Charts und Achievements
beziehen sich ausschließlich auf den aktuell in st.session_state
("current_player") gewählten Spieler – nicht mehr auf alle Spieler
zusammen. Die KPI-Berechnungen selbst (durchschnittsergebnis,
bestes_ergebnis, schlechtestes_ergebnis, ergebnis_streuung,
hat_genug_daten_fuer_verlauf) stammen unverändert aus
apfelportfolio.dashboard.kpis.
"""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from src.apfelportfolio.dashboard.kpis import (
    bestes_ergebnis,
    durchschnittsergebnis,
    ergebnis_streuung,
    hat_genug_daten_fuer_verlauf,
    schlechtestes_ergebnis,
    ermittele_badges,
)
from src.apfelportfolio.data.repository import LogRepository

AKZENT = "#C0392B"
GOLD = "#E8A33D"
BRAUN = "#8A4B0F"

st.set_page_config(page_title="Dashboard – Apfelportfolio", page_icon="📊", layout="wide")


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
        .block-container { padding-top: 1.8rem; max-width: 1180px; }

        /* ---------- Spielerprofil ---------- */
        .profile-panel {
            display: flex; align-items: center; gap: 1.2rem;
            background: linear-gradient(160deg, #FFFFFF 0%, #FDF2E3 100%);
            border: 2px solid #EFD9BC;
            border-radius: 20px;
            padding: 1.2rem 1.5rem;
            margin-bottom: 1.4rem;
            box-shadow: 0 4px 10px rgba(107,54,16,0.06);
        }
        .profile-avatar {
            width: 68px; height: 68px; border-radius: 50%;
            background: #FCEBD9; border: 3px solid #E8A33D;
            display: flex; align-items: center; justify-content: center;
            font-size: 2rem; flex-shrink: 0;
        }
        .profile-name {
            font-family: 'Baloo 2', sans-serif; font-weight: 800;
            font-size: 1.5rem; color: #2B2118; margin: 0;
        }
        .profile-stats { display: flex; gap: 1.6rem; margin-top: 0.35rem; flex-wrap: wrap; }
        .profile-stat {
            font-family: 'Nunito', sans-serif; font-size: 0.85rem; color: #8A7A68;
        }
        .profile-stat b {
            font-family: 'JetBrains Mono', monospace; color: #6B3610; font-size: 0.95rem;
        }

        /* ---------- KPI Karten ---------- */
        .kpi-card {
            background: linear-gradient(160deg, #FFFFFF 0%, #FDF2E3 100%);
            border: 2px solid #EFD9BC;
            border-radius: 16px;
            padding: 0.9rem 1.1rem;
            text-align: center;
            box-shadow: 0 3px 8px rgba(107,54,16,0.05);
        }
        .kpi-label {
            font-family: 'Nunito', sans-serif; font-weight: 700;
            font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.4px;
            color: #A6521F;
        }
        .kpi-value {
            font-family: 'JetBrains Mono', monospace; font-weight: 800;
            font-size: 1.5rem; color: #2B2118; margin-top: 0.2rem;
        }

        .menu-heading {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 700; font-size: 1.2rem; color: #6B3610;
            margin: 1.6rem 0 0.8rem 0;
        }

        /* ---------- Achievements ---------- */
        .badge-card {
            display: flex; align-items: center; gap: 0.7rem;
            border-radius: 14px; padding: 0.7rem 0.9rem;
            margin-bottom: 0.6rem;
            font-family: 'Nunito', sans-serif;
        }
        .badge-card.unlocked {
            background: linear-gradient(160deg, #FFF6E0 0%, #FCEBD9 100%);
            border: 2px solid #E8A33D;
        }
        .badge-card.locked {
            background: #F1EEE8;
            border: 2px dashed #D9D1C4;
            filter: grayscale(1);
            opacity: 0.6;
        }
        .badge-icon { font-size: 1.5rem; }
        .badge-title { font-weight: 800; color: #2B2118; font-size: 0.92rem; margin: 0; }
        .badge-desc { font-size: 0.74rem; color: #8A7A68; margin: 0; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _render_profil(spieler: str, df_spieler_alle_level: pd.DataFrame) -> None:
    hoechstes_level = int(df_spieler_alle_level["level"].max()) if not df_spieler_alle_level.empty else 0
    bestes = float(df_spieler_alle_level["endergebnis"].max()) if not df_spieler_alle_level.empty else 0.0
    anzahl_wochen = int(len(df_spieler_alle_level))

    st.markdown(
        f"""
        <div class="profile-panel">
            <div class="profile-avatar">👤</div>
            <div>
                <p class="profile-name">{spieler}</p>
                <div class="profile-stats">
                    <span class="profile-stat">Level <b>{hoechstes_level if hoechstes_level else '–'}</b></span>
                    <span class="profile-stat">Bestes Ergebnis <b>{bestes:.2f} €</b></span>
                    <span class="profile-stat">Gespielte Wochen <b>{anzahl_wochen}</b></span>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _kpi_karte(col, label: str, wert: str) -> None:
    with col:
        st.markdown(
            f"""
            <div class="kpi-card">
                <div class="kpi-label">{label}</div>
                <div class="kpi-value">{wert}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def _render_lernkurve(df: pd.DataFrame) -> None:
    verlauf = df.reset_index()["endergebnis"]
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=list(range(1, len(verlauf) + 1)),
            y=verlauf,
            mode="lines+markers",
            line=dict(color=AKZENT, width=3),
            marker=dict(size=8, color=GOLD),
            fill="tozeroy",
            fillcolor="rgba(192, 57, 43, 0.08)",
        )
    )
    fig.update_layout(
        height=320,
        margin=dict(l=10, r=10, t=10, b=10),
        plot_bgcolor="white",
        paper_bgcolor="white",
        xaxis_title="Durchlauf",
        yaxis_title="Endergebnis (€)",
        showlegend=False,
    )
    st.plotly_chart(fig, use_container_width=True)


def _render_ergebnisentwicklung(df: pd.DataFrame) -> None:
    verlauf = df.reset_index()["endergebnis"]
    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=list(range(1, len(verlauf) + 1)),
            y=verlauf,
            marker_color=[GOLD if v >= 0 else AKZENT for v in verlauf],
        )
    )
    fig.update_layout(
        height=260,
        margin=dict(l=10, r=10, t=30, b=10),
        plot_bgcolor="white",
        paper_bgcolor="white",
        xaxis_title="Durchlauf",
        yaxis_title="Endergebnis (€)",
        title=dict(text="Ergebnisentwicklung", font_size=14),
    )
    st.plotly_chart(fig, use_container_width=True)


def _render_gewinnverteilung(df: pd.DataFrame) -> None:
    fig = go.Figure()
    fig.add_trace(
        go.Histogram(
            x=df["endergebnis"],
            marker_color=BRAUN,
            nbinsx=min(10, max(3, len(df) // 2 or 1)),
        )
    )
    fig.update_layout(
        height=260,
        margin=dict(l=10, r=10, t=30, b=10),
        plot_bgcolor="white",
        paper_bgcolor="white",
        xaxis_title="Endergebnis (€)",
        yaxis_title="Anzahl Durchläufe",
        title=dict(text="Gewinnverteilung", font_size=14),
        bargap=0.1,
    )
    st.plotly_chart(fig, use_container_width=True)


def _render_achievements(df_spieler_level: pd.DataFrame, df_alle: pd.DataFrame, spieler: str, level: int) -> None:

    erfolge = ermittele_badges(df_spieler_level)

    for erfolg in erfolge:
        klasse = "badge-card unlocked" if erfolg["freigeschaltet"] else "badge-card locked"
        st.markdown(
            f"""
            <div class="{klasse}">
                <div class="badge-icon">{erfolg['icon']}</div>
                <div>
                    <p class="badge-title">{erfolg['titel']}</p>
                    <p class="badge-desc">{erfolg['beschreibung']}</p>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def main() -> None:
    _inject_style()

    spieler = st.session_state.get("current_player")

    st.markdown(
        """
        <div class="wk-hero" style="text-align:center; margin-bottom:1rem;">
            <p style="font-family:'Baloo 2',sans-serif; font-weight:800; font-size:2rem; color:#6B3610; margin:0.15rem 0;">
                📊 Dashboard
            </p>
            <p style="font-family:'Nunito',sans-serif; font-style:italic; font-weight:600; color:#A6521F; margin:0;">
                Deine Handelsstatistik im Überblick.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if not spieler:
        st.info("Wähle auf der Startseite zuerst einen Händler aus, um dein Dashboard zu sehen.")
        return

    repo = LogRepository()
    df_alle = repo.alle_laden()

    if df_alle.empty or "spieler" not in df_alle.columns:
        st.info("Noch keine Durchläufe vorhanden. Spiel zuerst eine Runde.")
        return

    df_spieler_alle_level = df_alle[df_alle["spieler"] == spieler]

    _render_profil(spieler, df_spieler_alle_level)

    level_auswahl = st.selectbox("Level", options=[1, 2, 3, 4], format_func=lambda l: f"Level {l}")

    df_level = repo.fuer_level(level_auswahl)
    df = df_level[df_level["spieler"] == spieler] if "spieler" in df_level.columns else df_level.iloc[0:0]

    if df.empty:
        st.info("Noch keine Durchläufe für dieses Level. Spiel zuerst eine Runde.")
        return

    col_haupt, col_seite = st.columns([3, 1])

    with col_haupt:
        kcol1, kcol2, kcol3, kcol4 = st.columns(4)
        _kpi_karte(kcol1, "Durchschnitt", f"{durchschnittsergebnis(df):.2f} €")
        _kpi_karte(kcol2, "Bestes Ergebnis", f"{bestes_ergebnis(df):.2f} €")
        _kpi_karte(kcol3, "Schlechtestes Ergebnis", f"{schlechtestes_ergebnis(df):.2f} €")
        streuung = ergebnis_streuung(df)
        _kpi_karte(kcol4, "Stabilität", f"{streuung:.2f} €" if streuung is not None else "–")

        st.markdown('<p class="menu-heading">Lernkurve</p>', unsafe_allow_html=True)
        if hat_genug_daten_fuer_verlauf(df):
            _render_lernkurve(df)
        else:
            st.caption(
                "Noch zu wenige Durchläufe (mind. 5) für eine aussagekräftige "
                "Lernkurve. Bisher: " + str(len(df))
            )

        st.markdown('<p class="menu-heading">Details</p>', unsafe_allow_html=True)
        diag1, diag2 = st.columns(2)
        with diag1:
            _render_ergebnisentwicklung(df)
        with diag2:
            _render_gewinnverteilung(df)

    with col_seite:
        st.markdown('<p class="menu-heading">Achievements</p>', unsafe_allow_html=True)
        _render_achievements(df, df_alle, spieler, level_auswahl)


if __name__ == "__main__":
    main()
