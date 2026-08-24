"""Ranking-Seite: Highscore-Bildschirm im Spiel-Design.

Reine UI-Anpassung: Datengrundlage, Aggregation (Highscore je Spieler
und Level) und alle bisherigen Berechnungen (_highscores_je_level,
Verlauf, Rang-/Abstandsermittlung) bleiben unverändert. Ergänzt wurde
lediglich die Anzeige freigeschalteter Badges hinter dem Spielernamen
(Podium und Bestenliste), berechnet über die vorhandene Funktion
ermittele_badges aus apfelportfolio.dashboard.kpis.
"""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from src.apfelportfolio.data.repository import LogRepository
from src.apfelportfolio.dashboard.kpis import ermittele_badges

MEDAILLEN = {1: "🥇", 2: "🥈", 3: "🥉"}
AKZENT = "#C0392B"
GOLD = "#E8A33D"
BRAUN = "#8A4B0F"

st.set_page_config(page_title="Ranking – Apfelportfolio", page_icon="🥇", layout="centered")


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

        .rk-hero { text-align: center; margin-bottom: 1.4rem; }
        .rk-hero .icon { font-size: 2.4rem; }
        .rk-hero h1 {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 800; font-size: 2.1rem; color: #6B3610;
            margin: 0.2rem 0 0.1rem 0;
        }
        .rk-hero p {
            font-family: 'Nunito', sans-serif; font-style: italic; font-weight: 600;
            color: #A6521F; margin: 0;
        }

        .menu-heading {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 700; font-size: 1.2rem; color: #6B3610;
            text-align: center; margin: 1.5rem 0 0.8rem 0;
        }

        /* ---------- Podium ---------- */
        .podium-name {
            font-family: 'Baloo 2', sans-serif; font-weight: 700;
            font-size: 1.05rem; color: #2B2118; text-align: center;
            margin-bottom: 0.25rem;
        }
        .podium-badges {
            text-align: center; font-size: 0.95rem; line-height: 1;
            margin-bottom: 0.35rem; min-height: 0.95rem;
        }
        .podium-medal { font-size: 2.3rem; text-align: center; }
        .podium-block {
            display: flex; align-items: flex-start; justify-content: center;
            border-radius: 14px 14px 4px 4px;
            padding-top: 0.6rem;
            box-shadow: inset 0 3px 0 rgba(255,255,255,0.45), 0 8px 14px rgba(107,54,16,0.18);
        }
        .podium-score {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 800; font-size: 1.25rem; color: #2B2118;
        }

        /* ---------- Spieler-Karten ---------- */
        .rank-card {
            display: flex; align-items: center; justify-content: space-between;
            background: linear-gradient(160deg, #FFFFFF 0%, #FDF2E3 100%);
            border: 2px solid #EFD9BC;
            border-radius: 16px;
            padding: 0.7rem 1.1rem;
            margin-bottom: 0.6rem;
            box-shadow: 0 3px 8px rgba(107,54,16,0.05);
        }
        .rank-card.is-active {
            border-color: #C0392B;
            background: linear-gradient(160deg, #FFF6EE 0%, #FCEBD9 100%);
            box-shadow: 0 0 0 3px rgba(192,57,43,0.18), 0 8px 16px rgba(192,57,43,0.18);
        }
        .rank-left { display: flex; align-items: center; gap: 0.9rem; }
        .rank-num {
            font-family: 'JetBrains Mono', monospace; font-weight: 800;
            font-size: 1.05rem; color: #A6521F; min-width: 2rem; text-align: center;
        }
        .rank-avatar {
            width: 40px; height: 40px; border-radius: 50%;
            background: #FCEBD9; border: 2px solid #E8A33D;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.15rem; flex-shrink: 0;
        }
        .rank-name {
            font-family: 'Baloo 2', sans-serif; font-weight: 700;
            font-size: 1.02rem; color: #2B2118;
        }
        .rank-right { display: flex; align-items: center; gap: 0.6rem; }
        .rank-badges { font-size: 1.4rem; line-height: 1; }
        .rank-level {
            font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; font-weight: 700;
            color: #6B3610; background: #F3E1C5; border-radius: 999px;
            padding: 0.1rem 0.55rem; margin-top: 0.15rem; display: inline-block;
        }
        .rank-score {
            font-family: 'JetBrains Mono', monospace; font-weight: 800;
            font-size: 1.05rem; color: #C0392B;
        }

        /* ---------- Eigene Statistik ---------- */
        .stats-strip {
            display: flex; justify-content: center; gap: 0.6rem;
            margin-top: 0.6rem; flex-wrap: wrap;
        }
        .stats-chip {
            background: #2B2118; color: #FCF6EE;
            border-radius: 12px; padding: 0.6rem 1.05rem;
            font-family: 'Nunito', sans-serif; text-align: center;
            min-width: 128px;
        }
        .stats-chip .num {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700; font-size: 1.1rem; color: #E8A33D;
            display: block;
        }
        .stats-chip .cap {
            font-size: 0.66rem; letter-spacing: 0.4px;
            text-transform: uppercase; color: #C9B79E;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _highscores_je_level(df: pd.DataFrame, level: int) -> pd.DataFrame:
    """Bester Durchlauf je Spieler, gefiltert auf ein Level, absteigend sortiert."""
    df_level = df[df["level"] == level].copy()
    if df_level.empty:
        return df_level

    idx_bester = df_level.groupby("spieler")["endergebnis"].idxmax()
    bestenliste = df_level.loc[idx_bester].sort_values(
        "endergebnis", ascending=False
    ).reset_index(drop=True)
    bestenliste.insert(0, "rang", bestenliste.index + 1)
    return bestenliste


def _badge_icons(df_level: pd.DataFrame, spieler: str) -> str:
    """Icons aller freigeschalteten Badges eines Spielers innerhalb eines Levels,
    berechnet über die bestehende Funktion ermittele_badges (dashboard.kpis)."""
    df_spieler = df_level[df_level["spieler"] == spieler]
    badges = ermittele_badges(df_spieler)
    return "".join(b["icon"] for b in badges if b["freigeschaltet"])


def _render_podium(bestenliste: pd.DataFrame, df_level: pd.DataFrame) -> None:
    """Top-3 als groß hervorgehobenes Siegertreppchen."""
    top3 = bestenliste.head(3)
    if top3.empty:
        return

    # Reihenfolge fuers Podium: 2. - 1. - 3. (klassische Treppen-Optik)
    reihenfolge = [r for r in [2, 1, 3] if r <= len(top3)]
    hoehen = {1: 200, 2: 150, 3: 115}
    spalten = st.columns(len(reihenfolge))

    for col, rang in zip(spalten, reihenfolge):
        zeile = top3.iloc[rang - 1]
        medaille = MEDAILLEN.get(rang, "")
        hoehe = hoehen.get(rang, 100)
        badge_icons = _badge_icons(df_level, zeile["spieler"])
        if rang == 1:
            farbe = f"linear-gradient(180deg, #FFE3AE 0%, {GOLD} 60%, #C97B1F 100%)"
        elif rang == 2:
            farbe = "linear-gradient(180deg, #F1F3F5 0%, #C9CDD3 60%, #9AA0A8 100%)"
        else:
            farbe = "linear-gradient(180deg, #E8B98A 0%, #CE8946 60%, #A6621F 100%)"
        with col:
            st.markdown(
                f"""
                <div class="podium-medal">{medaille}</div>
                <div class="podium-name">{zeile['spieler']}</div>
                <div class="podium-badges">{badge_icons}</div>
                <div class="podium-block" style="background:{farbe}; height:{hoehe}px;">
                    <span class="podium-score">{zeile['endergebnis']:.0f} €</span>
                </div>
                """,
                unsafe_allow_html=True,
            )


def _render_bestenliste(bestenliste: pd.DataFrame, aktiver_spieler: str | None, level: int, df_level: pd.DataFrame) -> None:
    """Vollstaendige Rangliste als Spielerkarten, aktiver Spieler deutlich hervorgehoben."""
    for _, zeile in bestenliste.iterrows():
        ist_aktiv = aktiver_spieler is not None and zeile["spieler"] == aktiver_spieler
        medaille = MEDAILLEN.get(int(zeile["rang"]), f"{int(zeile['rang'])}.")
        karten_klasse = "rank-card is-active" if ist_aktiv else "rank-card"
        badge_icons = _badge_icons(df_level, zeile["spieler"])

        st.markdown(
            f"""
            <div class="{karten_klasse}">
                <div class="rank-left">
                    <span class="rank-num">{medaille}</span>
                    <div class="rank-avatar">👤</div>
                    <div>
                        <div class="rank-name">{zeile['spieler']}{' 🎮' if ist_aktiv else ''}</div>
                        <span class="rank-level">Level {level}</span>
                    </div>
                </div>
                <div class="rank-right">
                    <span class="rank-badges">{badge_icons}</span>
                    <span class="rank-score">{zeile['endergebnis']:.2f} €</span>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def _render_verlaufschart(df: pd.DataFrame, level: int, spieler: str) -> None:
    """Score-Verlauf ueber die Zeit fuer einen einzelnen Spieler."""
    verlauf = df[(df["level"] == level) & (df["spieler"] == spieler)].sort_values("datum")
    if len(verlauf) < 2:
        st.caption("Spiele mindestens zwei Durchläufe, um deinen Verlauf zu sehen.")
        return

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=verlauf["datum"],
            y=verlauf["endergebnis"],
            mode="lines+markers",
            line=dict(color=AKZENT, width=3),
            marker=dict(size=8, color=GOLD),
            fill="tozeroy",
            fillcolor="rgba(192, 57, 43, 0.08)",
        )
    )
    fig.update_layout(
        height=260,
        margin=dict(l=10, r=10, t=10, b=10),
        plot_bgcolor="white",
        paper_bgcolor="white",
        xaxis_title=None,
        yaxis_title="Endergebnis (€)",
        showlegend=False,
    )
    st.plotly_chart(fig, use_container_width=True)


def _render_eigene_statistik(bestenliste: pd.DataFrame, aktiver_spieler: str, level: int, df: pd.DataFrame) -> None:
    """Eigener Rang, Abstand zu Platz 1, Bestes Ergebnis und persönlicher Verlauf."""
    eigener_rang = int(
        bestenliste.loc[bestenliste["spieler"] == aktiver_spieler, "rang"].iloc[0]
    )
    bestes_ergebnis = float(
        bestenliste.loc[bestenliste["spieler"] == aktiver_spieler, "endergebnis"].iloc[0]
    )
    gesamt = len(bestenliste)

    if eigener_rang == 1:
        st.success(f"🏆 Du führst die Bestenliste in Level {level} an!")
        abstand_text = "0.00 €"
    else:
        diff = (
            bestenliste.loc[bestenliste["rang"] == 1, "endergebnis"].iloc[0] - bestes_ergebnis
        )
        st.info(
            f"Du stehst auf Platz {eigener_rang} von {gesamt}. "
            f"Nur {diff:.2f} € fehlen dir zu Platz 1 – weiterspielen lohnt sich!"
        )
        abstand_text = f"{diff:.2f} €"

    st.markdown('<p class="menu-heading">Deine Statistik</p>', unsafe_allow_html=True)
    st.markdown(
        f"""
        <div class="stats-strip">
            <div class="stats-chip"><span class="num">#{eigener_rang}</span><span class="cap">Dein Rang</span></div>
            <div class="stats-chip"><span class="num">{abstand_text}</span><span class="cap">Abstand zu Platz 1</span></div>
            <div class="stats-chip"><span class="num">{bestes_ergebnis:.2f} €</span><span class="cap">Bestes Ergebnis</span></div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    with st.expander("📈 Dein persönlicher Verlauf"):
        _render_verlaufschart(df, level, aktiver_spieler)


def main() -> None:
    _inject_style()

    st.markdown(
        """
        <div class="rk-hero">
            <div class="icon">🥇🍎</div>
            <h1>Ranking</h1>
            <p>Die besten Wochenergebnisse aller Obsthändler.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    repo = LogRepository()
    df = repo.alle_laden()
    aktiver_spieler = st.session_state.get("current_player")

    if df.empty or "spieler" not in df.columns:
        st.info(
            "Es liegen noch keine ausgewerteten Durchläufe vor. "
            "Spiele eine Runde, um in der Bestenliste zu erscheinen!"
        )
        return

    level_tabs = st.tabs(["Level 1", "Level 2"])

    for tab, level in zip(level_tabs, [1, 2]):
        with tab:
            bestenliste = _highscores_je_level(df, level)

            if bestenliste.empty:
                st.info(f"Für Level {level} liegen noch keine Ergebnisse vor.")
                continue

            df_level = df[df["level"] == level]

            _render_podium(bestenliste, df_level)
            st.markdown("<div style='height:1.3rem;'></div>", unsafe_allow_html=True)
            st.markdown('<p class="menu-heading">Alle Händler</p>', unsafe_allow_html=True)
            _render_bestenliste(bestenliste, aktiver_spieler, level, df_level)

            if aktiver_spieler and aktiver_spieler in bestenliste["spieler"].values:
                _render_eigene_statistik(bestenliste, aktiver_spieler, level, df)


if __name__ == "__main__":
    main()
