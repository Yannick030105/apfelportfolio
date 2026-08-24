"""
Spielseite Level 2 - wie Level 1, aber mit einem taeglichen Zufallsereignis.

Analog zu Level 1: Der UI-Code enthaelt KEINE Berechnungslogik. Ereignis-
Auswahl und -Wirkung liegen in levels/level2_ereignisse.py, die Tages-
abrechnung in level1_grundlast.py (wiederverwendet).

Design-Update: Konsequente Weiterentwicklung der Level-1-Handelstisch-
Optik (gleiche Panels, Farben, Schriften). Es wurde ausschließlich die
Darstellung verändert bzw. um reine Anzeige-Karten ergänzt. Ablauf,
Reihenfolge (Markt/Nachfrage/Ereignis ziehen -> Entscheidung -> Effekte
einrechnen -> Zukauf -> Tag abschließen), alle Slider-Grenzen und die
Verfügbarkeitsprüfungen sind unverändert aus der Vorversion übernommen.
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

import streamlit as st

from apfelportfolio.data.repository import LogRepository
from apfelportfolio.data.schema import LogZeile
from apfelportfolio.domain.models import Tageseinkauf, Wochenverlauf, Regelwerk
from apfelportfolio.levels.level1_grundlast import (
    WOCHENTAGE,
)
from apfelportfolio.levels.level2_ereignisse import Level2Ereignisse
from apfelportfolio.ui.components import zeige_kopfzeile, zeige_uebersetzungstabelle

AKZENT = "#C0392B"
GOLD = "#E8A33D"
BRAUN = "#8A4B0F"
GRUEN = "#3F8F5C"

st.set_page_config(page_title="Level 2 – Apfelportfolio", page_icon="🌩️", layout="wide")

spieler = st.session_state.get("current_player")
if not spieler:
    st.error("Bitte wähle zuerst auf der Startseite einen Spieler aus.")
    st.stop()

if "regelwerk" not in st.session_state:
    st.session_state.regelwerk = Regelwerk()
if "level2" not in st.session_state:
    st.session_state.level2 = Level2Ereignisse(
        regelwerk=st.session_state.regelwerk
    )

LEVEL = st.session_state.level2


def _inject_style() -> None:
    # Identisches Grundgerüst zu Level 1, ergänzt um Wetter-/Ereigniskarten.
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
        .block-container { padding-top: 1.6rem; max-width: 1280px; }

        .menu-heading {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 700; font-size: 1.1rem; color: #6B3610;
            margin: 0 0 0.7rem 0;
        }

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

        .desk-panel {
            background: linear-gradient(160deg, #FFFFFF 0%, #FDF2E3 100%);
            border: 2px solid #EFD9BC;
            border-radius: 18px;
            padding: 1rem 1.15rem;
            margin-bottom: 0.9rem;
            box-shadow: 0 4px 10px rgba(107,54,16,0.06);
        }
        .desk-panel-title {
            font-family: 'Baloo 2', sans-serif; font-weight: 700;
            font-size: 1.05rem; color: #2B2118; margin: 0 0 0.6rem 0;
        }
        .price-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.5rem 0.6rem; border-radius: 10px;
            margin-bottom: 0.45rem; background: #FFFDF9; border: 1px solid #EFE1CB;
        }
        .price-left { display: flex; align-items: center; gap: 0.6rem; }
        .price-icon {
            width: 32px; height: 32px; border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; flex-shrink: 0;
        }
        .price-name {
            font-family: 'Nunito', sans-serif; font-weight: 700;
            font-size: 0.85rem; color: #2B2118;
        }
        .price-value { display: flex; align-items: center; gap: 0.35rem; }
        .price-amount {
            font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 0.95rem;
        }
        .trend { font-size: 0.85rem; }
        .trend.up { color: #C0392B; }
        .trend.down { color: #3F8F5C; }
        .trend.flat { color: #B3A794; }
        .trend.blocked { color: #B0524A; }

        .demand-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.55rem 0.7rem; border-radius: 10px;
            margin-bottom: 0.45rem; background: #FFFDF9; border: 1px solid #EFE1CB;
        }
        .demand-name {
            font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 0.85rem; color: #2B2118;
        }
        .demand-value {
            font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 0.9rem; color: #6B3610;
        }

        /* ---------- Wetterkarte ---------- */
        .weather-card {
            background: linear-gradient(160deg, #EAF3FB 0%, #DCEBF9 100%);
            border: 2px solid #9DC3E8;
            border-radius: 18px;
            padding: 1rem 1.15rem;
            margin-bottom: 0.9rem;
        }
        .weather-card-title {
            font-family: 'Baloo 2', sans-serif; font-weight: 700;
            font-size: 1.05rem; color: #2C4B66; margin: 0 0 0.5rem 0;
        }
        .weather-main { display: flex; align-items: center; gap: 0.9rem; }
        .weather-icon { font-size: 2.4rem; }
        .weather-harvest {
            font-family: 'JetBrains Mono', monospace; font-weight: 800;
            font-size: 1.2rem; color: #2C4B66;
        }
        .weather-sub {
            font-family: 'Nunito', sans-serif; font-size: 0.78rem; color: #5A7791;
        }

        /* ---------- Ereigniskarte ---------- */
        .event-card {
            border-radius: 18px; padding: 1rem 1.15rem;
            margin-bottom: 0.9rem; border: 2px solid #E8A33D;
            background: linear-gradient(160deg, #FFF6E0 0%, #FCEBD9 100%);
        }
        .event-card-title {
            font-family: 'Baloo 2', sans-serif; font-weight: 800;
            font-size: 1.05rem; color: #6B3610; margin: 0 0 0.4rem 0;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .event-card-desc {
            font-family: 'Nunito', sans-serif; font-size: 0.87rem; color: #2B2118;
            margin-bottom: 0.3rem;
        }
        .event-card-tip {
            font-family: 'Nunito', sans-serif; font-style: italic; font-size: 0.78rem;
            color: #8A7A68;
        }

        .news-box {
            background: #2B2118; color: #FCF6EE;
            border-radius: 14px; padding: 0.75rem 1rem;
            font-family: 'Nunito', sans-serif; font-size: 0.85rem;
            margin-top: 0.3rem;
        }

        .console-panel {
            background: linear-gradient(160deg, #FFF6E0 0%, #FCEBD9 100%);
            border: 2px solid #E8A33D;
            border-radius: 18px;
            padding: 1.1rem 1.2rem 0.4rem 1.2rem;
            margin-bottom: 0.9rem;
        }
        .console-title {
            font-family: 'Baloo 2', sans-serif; font-weight: 700;
            font-size: 1.05rem; color: #6B3610; margin: 0 0 0.4rem 0;
        }
        .console-slider-label {
            font-family: 'Nunito', sans-serif; font-weight: 700;
            font-size: 0.85rem; color: #6B3610; margin-bottom: -0.4rem;
        }

        .trade-button .stButton button {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 800; font-size: 1.1rem;
            border-radius: 14px; border: none;
            padding: 0.75rem 1rem; width: 100%;
            background: linear-gradient(180deg, #E8A33D 0%, #C97B1F 100%);
            color: #3A1F00;
            box-shadow: 0 6px 0 #A6611A, 0 10px 18px rgba(166,97,26,0.30);
        }

        .day-card {
            border-radius: 16px; padding: 0.8rem 1rem;
            margin-bottom: 0.6rem; border: 2px solid;
        }
        .day-card.positiv { background: #EAF6EE; border-color: #3F8F5C; }
        .day-card.negativ { background: #FBEAEA; border-color: #C0392B; }
        .day-card.offen { background: #F1EEE8; border-color: #D9D1C4; }
        .day-card-title {
            font-family: 'Baloo 2', sans-serif; font-weight: 800;
            font-size: 1rem; color: #2B2118; margin: 0 0 0.35rem 0;
        }
        .day-card-event {
            font-family: 'Nunito', sans-serif; font-size: 0.7rem; color: #A6521F;
            margin-bottom: 0.3rem; font-weight: 700;
        }
        .day-card-row {
            display: flex; justify-content: space-between;
            font-family: 'Nunito', sans-serif; font-size: 0.78rem; color: #4A3B2C;
            margin-bottom: 0.1rem;
        }
        .day-card-row b { font-family: 'JetBrains Mono', monospace; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _init_session_state() -> None:
    defaults = {
        "woche": Wochenverlauf(level=LEVEL.nummer),
        "tag_index": 0,
        "tagesmarkt": None,
        "tagesnachfrage": None,
        "tagesereignis": None,
        "ereignis_zugestimmt": False,
    }
    for schluessel, wert in defaults.items():
        if schluessel not in st.session_state:
            st.session_state[schluessel] = wert
    # Rein UI-seitige Preishistorie fuer Trendpfeile (siehe Hinweis am Dateiende).
    if "preishistorie_l2" not in st.session_state:
        st.session_state.preishistorie_l2 = []


def _neuen_tag_ziehen() -> None:
    st.session_state.tagesmarkt = LEVEL.erzeuge_tagesmarkt()
    st.session_state.tagesnachfrage = LEVEL.erzeuge_tagesnachfrage()
    st.session_state.tagesereignis = LEVEL.erzeuge_ereignis()
    st.session_state.ereignis_zugestimmt = False


def _neue_woche_starten() -> None:
    st.session_state.woche = Wochenverlauf(level=LEVEL.nummer)
    st.session_state.tag_index = 0
    st.session_state.tagesmarkt = None
    st.session_state.tagesnachfrage = None
    st.session_state.tagesereignis = None
    st.session_state.ereignis_zugestimmt = False
    st.session_state.preishistorie_l2 = []
    LEVEL.zuruecksetzen()


def _tag_abschliessen(kontext, importeur_menge: float, wochenmarkt_menge: float, mosterei_menge: float) -> None:
    # Aktuellen Kontextmarkt vor dem Verwerfen fuer die Trendanzeige merken (rein UI, keine Logikaenderung).
    st.session_state.preishistorie_l2.append(kontext.markt)

    einkauf = Tageseinkauf(
        importeur_menge=importeur_menge,
        wochenmarkt_menge=wochenmarkt_menge,
        mosterei_menge=mosterei_menge,
    )
    abrechnung = LEVEL.rechne_tag_ab(
        tag=WOCHENTAGE[st.session_state.tag_index],
        kontext=kontext,
        einkauf=einkauf,
        ereignis_titel=st.session_state.tagesereignis.titel,
    )
    st.session_state.woche.tage.append(abrechnung)
    st.session_state.tag_index += 1
    st.session_state.tagesmarkt = None
    st.session_state.tagesnachfrage = None
    st.session_state.tagesereignis = None
    st.session_state.ereignis_zugestimmt = False

    if st.session_state.woche.ist_komplett:
        woche = st.session_state.woche
        LogRepository().anhaengen(
            LogZeile(
                spieler=st.session_state["current_player"],
                datum=date.today(),
                level=LEVEL.nummer,
                endergebnis=woche.wochenergebnis,
                rest_long_short=sum(t.bilanzkreis_saldo for t in woche.tage),
                anteil_spot=0.0,
                anteil_grundlast=1.0,
                prognosefehler=None,
                referenzergebnis_nichthandeln=0.0,
            )
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


def _trend_pfeil(aktuell: float, letzter_markt, feld: str) -> str:
    """Kleine Trendanzeige auf Basis der rein UI-seitigen Preishistorie."""
    if letzter_markt is None:
        return '<span class="trend flat">▬</span>'
    vorwert = getattr(letzter_markt, feld)
    if aktuell > vorwert:
        return '<span class="trend up">▲</span>'
    if aktuell < vorwert:
        return '<span class="trend down">▼</span>'
    return '<span class="trend flat">▬</span>'


def _render_wetterkarte(kontext, rw) -> None:
    """Zeigt die erwartete Ernte (Obstbauer-Liefermenge nach Ereigniswirkung)
    als eigene Karte statt als Textblock."""
    erwartete_ernte = kontext.obstbauer_menge
    regulaere_ernte = rw.obstbauer_menge

    if erwartete_ernte > regulaere_ernte:
        icon, sub = "☀️", "Gute Ernte – mehr Äpfel als üblich verfügbar."
    elif erwartete_ernte < regulaere_ernte:
        icon, sub = "🌧️", "Geringere Ernte als üblich – Angebot ist knapper."
    else:
        icon, sub = "⛅", "Ernte wie gewohnt."

    st.markdown(
        f"""
        <div class="weather-card">
            <p class="weather-card-title">🌤️ Wetterkarte</p>
            <div class="weather-main">
                <span class="weather-icon">{icon}</span>
                <div>
                    <div class="weather-harvest">{erwartete_ernte:.0f} Äpfel</div>
                    <div class="weather-sub">Erwartete Ernte (regulär {regulaere_ernte:.0f})</div>
                </div>
            </div>
            <p class="weather-sub" style="margin-top:0.5rem;">{sub}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _render_ereigniskarte(ereignis) -> None:
    """Zeigt das Tagesereignis als eigene Karte statt als reinen st.info-Textblock."""
    st.markdown(
        f"""
        <div class="event-card">
            <p class="event-card-title">⚡ {ereignis.titel}</p>
            <p class="event-card-desc">{ereignis.beschreibung}</p>
            {f'<p class="event-card-tip">💡 {ereignis.hinweis}</p>' if ereignis.hinweis else ''}
        </div>
        """,
        unsafe_allow_html=True,
    )


def _render_marktuebersicht(kontext, historie: list) -> None:
    letzter_markt = historie[-1] if historie else None
    m = kontext.markt
    st.markdown('<div class="desk-panel">', unsafe_allow_html=True)
    st.markdown('<p class="desk-panel-title">🏪 Marktübersicht</p>', unsafe_allow_html=True)

    preise = [
        ("🚢", "Importeur", m.preis_importeur, "preis_importeur", "#FCEBD9", kontext.importeur_verfuegbar),
        ("🧺", "Wochenmarkt", m.preis_wochenmarkt, "preis_wochenmarkt", "#EAF1EF", kontext.wochenmarkt_verfuegbar),
        ("🥐", "Bäckerei", m.preis_baeckerei, "preis_baeckerei", "#FBEAEA", True),
        ("🍹", "Mosterei", m.preis_mosterei, "preis_mosterei", "#F1EEE8", True),
    ]
    for icon, name, wert, feld, farbe, verfuegbar in preise:
        if verfuegbar:
            trend = _trend_pfeil(wert, letzter_markt, feld)
        else:
            trend = '<span class="trend blocked">✕ heute gesperrt</span>'
        st.markdown(
            f"""
            <div class="price-row">
                <div class="price-left">
                    <div class="price-icon" style="background:{farbe};">{icon}</div>
                    <span class="price-name">{name}</span>
                </div>
                <div class="price-value">
                    <span class="price-amount">{wert:.2f} €</span>
                    {trend}
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    st.markdown("</div>", unsafe_allow_html=True)


def _marktnachricht(kontext, rw) -> str:
    """Kurzer Nachrichtentext, abgeleitet aus den vorhandenen Tagesdaten (inkl. Ereigniswirkung)."""
    nachfrage = kontext.nachfrage
    spanne = rw.baeckerei_menge_max - rw.baeckerei_menge_min
    schwelle_hoch = rw.baeckerei_menge_min + spanne * 0.66
    schwelle_niedrig = rw.baeckerei_menge_min + spanne * 0.33

    if nachfrage.baeckerei_bestellt >= schwelle_hoch:
        return "📢 Heute hohe Nachfrage der Bäckerei – plane den Zukauf großzügig ein."
    if nachfrage.baeckerei_bestellt <= schwelle_niedrig:
        return "📢 Ruhiger Tag: Die Bäckerei fragt heute nur wenig nach."
    return "📢 Die Nachfrage der Bäckerei liegt heute im mittleren Bereich."


def _render_bedarf(kontext, rw) -> None:
    st.markdown('<div class="desk-panel">', unsafe_allow_html=True)
    st.markdown('<p class="desk-panel-title">📋 Bedarf &amp; Fixversorgung</p>', unsafe_allow_html=True)

    zeilen = [
        ("🏫 Schulessen (heute)", f"{kontext.nachfrage.schulessen:.0f} Äpfel · {rw.schulessen_preis:.2f} €/Stk."),
        ("🥐 Bäckerei (heute)", f"{kontext.nachfrage.baeckerei_bestellt:.0f} Äpfel"),
        ("🌳 Obstbauer (Lieferung, heute)", f"{kontext.obstbauer_menge:.0f} Äpfel · {rw.obstbauer_preis:.2f} €/Stk."),
    ]
    for name, wert in zeilen:
        st.markdown(
            f"""
            <div class="demand-row">
                <span class="demand-name">{name}</span>
                <span class="demand-value">{wert}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown(
        f'<div class="news-box">{_marktnachricht(kontext, rw)}</div>',
        unsafe_allow_html=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)


def _render_timeline(woche) -> None:
    st.markdown('<p class="menu-heading">📅 Wochenübersicht</p>', unsafe_allow_html=True)
    spalten = st.columns(5)
    for i, tag_name in enumerate(WOCHENTAGE):
        with spalten[i]:
            if i < len(woche.tage):
                t = woche.tage[i]
                klasse = "positiv" if t.tagesergebnis >= 0 else "negativ"
                ereignis_titel = getattr(t, "ereignis_titel", "")
                st.markdown(
                    f"""
                    <div class="day-card {klasse}">
                        <p class="day-card-title">{tag_name}</p>
                        {f'<p class="day-card-event">⚡ {ereignis_titel}</p>' if ereignis_titel else ''}
                        <div class="day-card-row"><span>Gewinn</span><b>{t.tagesergebnis:.2f} €</b></div>
                        <div class="day-card-row"><span>Saldo</span><b>{t.bilanzkreis_saldo:+.0f}</b></div>
                        <div class="day-card-row"><span>Import</span><b>{t.einkauf.importeur_menge:.0f}</b></div>
                        <div class="day-card-row"><span>Verkauf</span><b>{t.an_baeckerei_geliefert + t.an_schulessen_geliefert + t.an_mosterei_geliefert:.0f}</b></div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            else:
                st.markdown(
                    f"""
                    <div class="day-card offen">
                        <p class="day-card-title">{tag_name}</p>
                        <div class="day-card-row"><span>noch offen</span><b>–</b></div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )


def main() -> None:
    _inject_style()
    _init_session_state()
    zeige_kopfzeile(LEVEL.titel)

    st.write(
        "Wie in Level 1 deckst du den Bedarf tageweise – aber jeden Tag tritt "
        "ein Ereignis ein, das Preise, Mengen, Verfügbarkeiten oder Limits "
        "verändert. Manche Ereignisse verlangen eine Entscheidung. Reagiere "
        "über deine Zukäufe. Der Freitags-Ausgleich (Mosterei/Wochenmarkt) "
        "bleibt automatisch."
    )
    zeige_uebersetzungstabelle()
    st.divider()

    rw = st.session_state.regelwerk
    woche = st.session_state.woche
    tag_index = st.session_state.tag_index

    laufendes_ergebnis = sum(t.tagesergebnis for t in woche.tage)
    kcol1, kcol2, kcol3, kcol4 = st.columns(4)
    _kpi_karte(kcol1, "Kontostand (Woche bisher)", f"{laufendes_ergebnis:.2f} €")
    _kpi_karte(kcol2, "Portfoliostand", f"{LEVEL.portfoliostand:+.0f} Äpfel")
    _kpi_karte(kcol3, "Tag", f"{min(tag_index + 1, len(WOCHENTAGE))} / {len(WOCHENTAGE)}")
    _kpi_karte(kcol4, "Wochenergebnis", f"{woche.wochenergebnis:.2f} €")

    st.markdown("<div style='height:1.1rem;'></div>", unsafe_allow_html=True)

    if st.button("🔄 Neue Woche starten"):
        _neue_woche_starten()
        st.rerun()

    st.markdown("<div style='height:0.6rem;'></div>", unsafe_allow_html=True)

    if tag_index >= len(WOCHENTAGE):
        _render_timeline(woche)
        st.markdown('<p class="menu-heading">🏁 Woche beendet</p>', unsafe_allow_html=True)
        if woche.wochenergebnis >= 0:
            st.success(f"Starke Woche! Wochenergebnis: {woche.wochenergebnis:.2f} €")
            st.balloons()
        else:
            st.error(f"Die Woche war negativ. Wochenergebnis: {woche.wochenergebnis:.2f} €")
        return

    tag_name = WOCHENTAGE[tag_index]

    if st.session_state.tagesereignis is None:
        _neuen_tag_ziehen()

    markt = st.session_state.tagesmarkt
    nachfrage = st.session_state.tagesnachfrage
    ereignis = st.session_state.tagesereignis

    st.markdown(f'<p class="menu-heading">🛒 Handelstisch – {tag_name} (Tag {tag_index + 1} von 5)</p>', unsafe_allow_html=True)

    _render_ereigniskarte(ereignis)

    # Entscheidungsereignisse: JA/NEIN vor dem Rest (unveraendert aus Vorversion).
    if ereignis.entscheidung_text is not None:
        st.session_state.ereignis_zugestimmt = st.toggle(
            ereignis.entscheidung_text, value=st.session_state.ereignis_zugestimmt
        )

    # Effekte einrechnen -> Kontext spiegelt das Ereignis wider (unveraendert).
    kontext = LEVEL.wende_ereignis_an(
        tag_index=tag_index,
        markt=markt,
        nachfrage=nachfrage,
        ereignis=ereignis,
        zugestimmt=st.session_state.ereignis_zugestimmt,
    )

    col_wetter, col_markt, col_bedarf, col_konsole = st.columns([0.85, 1, 1, 1.1])

    with col_wetter:
        _render_wetterkarte(kontext, rw)

    with col_markt:
        _render_marktuebersicht(kontext, st.session_state.preishistorie_l2)

    with col_bedarf:
        _render_bedarf(kontext, rw)

    importeur_menge = 0.0

    with col_konsole:
        st.markdown('<div class="console-panel">', unsafe_allow_html=True)
        st.markdown('<p class="console-title">🎛️ Handelskonsole</p>', unsafe_allow_html=True)

        if kontext.importeur_verfuegbar and LEVEL.importeur_verfuegbar(tag_index):
            st.markdown('<p class="console-slider-label">🚢 Importeur</p>', unsafe_allow_html=True)
            importeur_menge = st.slider(
                "Zukauf beim Importeur (Äpfel)",
                min_value=0,
                max_value=int(kontext.importeur_slider_max),
                value=0,
                label_visibility="collapsed",
            )
        elif not kontext.importeur_verfuegbar:
            st.caption("🚢 Importeur heute nicht verfügbar (Ereignis).")
        else:
            st.caption("🚢 Importeur nicht mehr verfügbar (nur Mo–Mi).")

        if kontext.wochenmarkt_verfuegbar:
            st.markdown('<p class="console-slider-label">🧺 Wochenmarkt</p>', unsafe_allow_html=True)
            wochenmarkt_menge = st.slider(
                "Zukauf am Wochenmarkt (Äpfel)",
                min_value=0,
                max_value=int(kontext.wochenmarkt_limit),
                value=0,
                label_visibility="collapsed",
            )
        else:
            wochenmarkt_menge = 0.0
            st.caption("🧺 Wochenmarkt heute geschlossen (Ereignis).")

        if tag_index != len(WOCHENTAGE) - 1:
            verfuegbarer_bestand = (
                LEVEL.portfoliostand
                + kontext.obstbauer_menge
                + importeur_menge
                + wochenmarkt_menge
                - nachfrage.schulessen
                - nachfrage.baeckerei_bestellt
            )
            mosterei_max = max(int(verfuegbarer_bestand), 0)
            st.markdown('<p class="console-slider-label">🍹 Mosterei</p>', unsafe_allow_html=True)
            if mosterei_max == 0:
                st.caption("Kein Überschuss vorhanden – heute kein Verkauf an die Mosterei möglich.")
                mosterei_menge = 0.0
            else:
                mosterei_menge = st.slider(
                    "Verkauf an Mosterei",
                    min_value=0,
                    max_value=mosterei_max,
                    value=0,
                    label_visibility="collapsed",
                )
        else:
            mosterei_menge = 0.0
            st.caption(
                "🍹 Freitags-Ausgleich läuft automatisch: Überschuss → Mosterei, "
                "Fehlmenge → Wochenmarkt."
            )

        st.markdown("<div style='height:0.6rem;'></div>", unsafe_allow_html=True)
        st.markdown('<div class="trade-button">', unsafe_allow_html=True)
        tag_abschliessen_geklickt = st.button("💰 Handel abschließen")
        st.markdown("</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    if tag_abschliessen_geklickt:
        _tag_abschliessen(kontext, float(importeur_menge), float(wochenmarkt_menge), float(mosterei_menge))
        st.rerun()

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)
    _render_timeline(woche)


main()

# ---------------------------------------------------------------------------
# Hinweis zu Konzept-Widersprüchen bzw. Einordnung (nicht als neue Logik
# umgesetzt, sondern nur als Anzeige der bereits vorhandenen Kontextwerte):
#
# 1. "Frost / Sturm / Exportboom" waren im Konzept als Beispiel-Ereignisse
#    genannt. Welche Ereignisse tatsächlich existieren, bestimmt ausschließlich
#    LEVEL.erzeuge_ereignis() aus levels/level2_ereignisse.py. Die Ereigniskarte
#    zeigt daher generisch ereignis.titel/beschreibung/hinweis an, statt fest
#    codierte Beispieltitel vorzugeben – so bleibt sie zu jedem tatsächlich
#    gezogenen Ereignis korrekt, ohne die Ereignis-Logik zu verändern.
#
# 2. "Wetterkarte – Erwartete Ernte": Es gibt kein separates Wetter-Datenmodell.
#    Als Näherung wird die bereits vom Ereignis beeinflusste Obstbauer-
#    Liefermenge (kontext.obstbauer_menge, im Vergleich zum Regelwert) als
#    "erwartete Ernte" dargestellt – ein reiner Anzeigewert aus vorhandenen
#    Kontextdaten, keine neue Berechnung.
#
# 3. Alle übrigen Punkte entsprechen unverändert der Level-1-Umsetzung
#    (Kontostand, Bedarf & Fixversorgung, Trendpfeile über eine rein
#    UI-seitige, nicht persistente Preishistorie).
# ---------------------------------------------------------------------------
