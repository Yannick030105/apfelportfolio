"""
Spielseite Level 1 - jeder Wochentag ist ein eigener Entscheidungsschritt.

UI-Code enthaelt keine Berechnungslogik - diese liegt komplett in
levels/level1_grundlast.py und domain/models.py.

Design-Update: Handelstisch-Optik im Stil der übrigen Spielseiten.
Es wurde ausschließlich die Darstellung verändert. Alle bestehenden
Funktionen (_init_session_state, _neue_woche_starten, _tag_abschliessen)
sowie sämtliche Slider-Grenzen, Verfügbarkeiten und Berechnungen sind
unverändert aus der Vorversion übernommen. Einzige Ergänzung: eine rein
UI-seitige, nicht-persistente Preishistorie in st.session_state, um
Trendpfeile bei den Marktpreisen anzuzeigen (siehe Hinweis am Dateiende).
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
    Level1Grundlast,
)
from apfelportfolio.ui.components import zeige_kopfzeile, zeige_uebersetzungstabelle

AKZENT = "#C0392B"
GOLD = "#E8A33D"
BRAUN = "#8A4B0F"
GRUEN = "#3F8F5C"

st.set_page_config(page_title="Level 1 – Apfelportfolio", page_icon="🍎", layout="wide")

spieler = st.session_state.get("current_player")
if not spieler:
    st.error("Bitte wähle zuerst auf der Startseite einen Spieler aus.")
    st.stop()

if "regelwerk" not in st.session_state:
    st.session_state.regelwerk = Regelwerk()
if "level1" not in st.session_state:
    st.session_state.level1 = Level1Grundlast(
        regelwerk=st.session_state.regelwerk
    )

LEVEL = st.session_state.level1


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
        .block-container { padding-top: 1.6rem; max-width: 1280px; }

        .menu-heading {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 700; font-size: 1.1rem; color: #6B3610;
            margin: 0 0 0.7rem 0;
        }

        /* ---------- Große KPI-Karten oben ---------- */
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

        /* ---------- Markt-/Bedarfskarten (Handelstisch) ---------- */
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

        .news-box {
            background: #2B2118; color: #FCF6EE;
            border-radius: 14px; padding: 0.75rem 1rem;
            font-family: 'Nunito', sans-serif; font-size: 0.85rem;
            margin-top: 0.3rem;
        }

        /* ---------- Handelskonsole rechts ---------- */
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

        /* ---------- Wochen-Timeline ---------- */
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
    if "woche" not in st.session_state:
        st.session_state.woche = Wochenverlauf(level=LEVEL.nummer)
    if "tag_index" not in st.session_state:
        st.session_state.tag_index = 0
    if "tagesmarkt" not in st.session_state:
        st.session_state.tagesmarkt = None
    if "tagesnachfrage" not in st.session_state:
        st.session_state.tagesnachfrage = None
    # Rein UI-seitige Preishistorie fuer Trendpfeile (siehe Hinweis am Dateiende).
    if "preishistorie_l1" not in st.session_state:
        st.session_state.preishistorie_l1 = []


def _neue_woche_starten() -> None:
    st.session_state.woche = Wochenverlauf(level=LEVEL.nummer)
    st.session_state.tag_index = 0
    st.session_state.tagesmarkt = None
    st.session_state.tagesnachfrage = None
    st.session_state.preishistorie_l1 = []
    LEVEL.portfoliostand = 0.0
    LEVEL._importeur_menge_woche = 0.0


def _tag_abschliessen(importeur_menge: float, wochenmarkt_menge: float, mosterei_menge: float) -> None:
    einkauf = Tageseinkauf(
        importeur_menge=importeur_menge, wochenmarkt_menge=wochenmarkt_menge, mosterei_menge=mosterei_menge
    )
    # Aktuellen Tagesmarkt vor dem Verwerfen fuer die Trendanzeige merken (rein UI, keine Logikaenderung).
    st.session_state.preishistorie_l1.append(st.session_state.tagesmarkt)

    abrechnung = LEVEL.rechne_tag_ab(
        tag=WOCHENTAGE[st.session_state.tag_index],
        tag_index=st.session_state.tag_index,
        markt=st.session_state.tagesmarkt,
        nachfrage=st.session_state.tagesnachfrage,
        einkauf=einkauf,
    )
    st.session_state.woche.tage.append(abrechnung)
    st.session_state.tag_index += 1
    st.session_state.tagesmarkt = None
    st.session_state.tagesnachfrage = None

    if st.session_state.woche.ist_komplett:
        repo = LogRepository()
        woche = st.session_state.woche
        repo.anhaengen(
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


def _trend_pfeil(aktuell: float, vorherige_markt, feld: str) -> str:
    """Kleine Trendanzeige auf Basis der rein UI-seitigen Preishistorie."""
    if vorherige_markt is None:
        return '<span class="trend flat">▬</span>'
    vorwert = getattr(vorherige_markt, feld)
    if aktuell > vorwert:
        return '<span class="trend up">▲</span>'
    if aktuell < vorwert:
        return '<span class="trend down">▼</span>'
    return '<span class="trend flat">▬</span>'


def _render_marktuebersicht(markt, historie: list) -> None:
    letzter_markt = historie[-1] if historie else None
    st.markdown('<div class="desk-panel">', unsafe_allow_html=True)
    st.markdown('<p class="desk-panel-title">🏪 Marktübersicht</p>', unsafe_allow_html=True)

    preise = [
        ("🚢", "Importeur", markt.preis_importeur, "preis_importeur", "#FCEBD9"),
        ("🧺", "Wochenmarkt", markt.preis_wochenmarkt, "preis_wochenmarkt", "#EAF1EF"),
        ("🥐", "Bäckerei", markt.preis_baeckerei, "preis_baeckerei", "#FBEAEA"),
        ("🍹", "Mosterei", markt.preis_mosterei, "preis_mosterei", "#F1EEE8"),
    ]
    for icon, name, wert, feld, farbe in preise:
        trend = _trend_pfeil(wert, letzter_markt, feld)
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


def _marktnachricht(nachfrage, rw) -> str:
    """Kurzer Nachrichtentext, abgeleitet aus den vorhandenen Tagesdaten."""
    spanne = rw.baeckerei_menge_max - rw.baeckerei_menge_min
    schwelle_hoch = rw.baeckerei_menge_min + spanne * 0.66
    schwelle_niedrig = rw.baeckerei_menge_min + spanne * 0.33

    if nachfrage.baeckerei_bestellt >= schwelle_hoch:
        return "📢 Heute hohe Nachfrage der Bäckerei – plane den Zukauf großzügig ein."
    if nachfrage.baeckerei_bestellt <= schwelle_niedrig:
        return "📢 Ruhiger Tag: Die Bäckerei fragt heute nur wenig nach."
    return "📢 Die Nachfrage der Bäckerei liegt heute im mittleren Bereich."


def _render_bedarf(nachfrage, rw) -> None:
    st.markdown('<div class="desk-panel">', unsafe_allow_html=True)
    st.markdown('<p class="desk-panel-title">📋 Bedarf &amp; Fixversorgung</p>', unsafe_allow_html=True)

    zeilen = [
        ("🏫 Schulessen (fix)", f"{rw.schulessen_menge:.0f} Äpfel · {rw.schulessen_preis:.2f} €/Stk."),
        ("🥐 Bäckerei (heute)", f"{nachfrage.baeckerei_bestellt:.0f} Äpfel"),
        ("🌳 Obstbauer (Lieferung, fix)", f"{rw.obstbauer_menge:.0f} Äpfel · {rw.obstbauer_preis:.2f} €/Stk."),
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
        f'<div class="news-box">{_marktnachricht(nachfrage, rw)}</div>',
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
                st.markdown(
                    f"""
                    <div class="day-card {klasse}">
                        <p class="day-card-title">{tag_name}</p>
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

    rw = st.session_state.regelwerk
    st.write(
        f"Der Obstbauer liefert täglich fix {rw.obstbauer_menge:.0f} Äpfel für "
        f"{rw.obstbauer_preis:.2f} €/Stück. Das Schulessen kauft dir täglich fix "
        f"{rw.schulessen_menge:.0f} Äpfel zu {rw.schulessen_preis:.2f} €/Stück ab. "
        f"Die Bäckerei fragt zusätzlich eine zufällige Menge zwischen "
        f"{rw.baeckerei_menge_min:.0f} und {rw.baeckerei_menge_max:.0f} Äpfeln zu "
        f"einem tagesabhängigen Preis nach und wird immer vollständig beliefert. "
        "Am Freitag wird ein verbleibender Überschuss automatisch an die Mosterei "
        "verkauft bzw. eine Fehlmenge automatisch am Wochenmarkt zugekauft."
    )
    zeige_uebersetzungstabelle()
    st.divider()

    woche = st.session_state.woche
    tag_index = st.session_state.tag_index

    # ---------- Vier große KPI-Karten oben ----------
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

    if st.session_state.tagesmarkt is None:
        st.session_state.tagesmarkt = LEVEL.erzeuge_tagesmarkt()
        st.session_state.tagesnachfrage = LEVEL.erzeuge_tagesnachfrage()

    markt = st.session_state.tagesmarkt
    nachfrage = st.session_state.tagesnachfrage

    st.markdown(f'<p class="menu-heading">🛒 Handelstisch – {tag_name} (Tag {tag_index + 1} von 5)</p>', unsafe_allow_html=True)

    col_markt, col_bedarf, col_konsole = st.columns([1, 1, 1.1])

    with col_markt:
        _render_marktuebersicht(markt, st.session_state.preishistorie_l1)

    with col_bedarf:
        _render_bedarf(nachfrage, rw)

    importeur_menge = 0.0

    with col_konsole:
        st.markdown('<div class="console-panel">', unsafe_allow_html=True)
        st.markdown('<p class="console-title">🎛️ Handelskonsole</p>', unsafe_allow_html=True)

        if LEVEL.importeur_verfuegbar(tag_index):
            st.markdown('<p class="console-slider-label">🚢 Importeur</p>', unsafe_allow_html=True)
            importeur_max_heute = int(LEVEL.regelwerk.importeur_limit)
            importeur_menge = st.slider(
                "Zukauf beim Importeur (Äpfel)",
                min_value=0,
                max_value=importeur_max_heute,
                value=0,
                label_visibility="collapsed",
            )
        else:
            st.caption("🚢 Importeur nicht mehr verfügbar (nur Mo–Mi).")

        st.markdown('<p class="console-slider-label">🧺 Wochenmarkt</p>', unsafe_allow_html=True)
        wochenmarkt_max = int(LEVEL.regelwerk.wochenmarkt_limit_tag)
        wochenmarkt_menge = st.slider(
            "Zukauf am Wochenmarkt (Äpfel)",
            min_value=0,
            max_value=wochenmarkt_max,
            value=0,
            label_visibility="collapsed",
        )

        if tag_index != len(WOCHENTAGE) - 1:
            verfuegbarer_bestand = (
                LEVEL.portfoliostand
                + rw.obstbauer_menge
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
        _tag_abschliessen(float(importeur_menge), float(wochenmarkt_menge), float(mosterei_menge))
        st.rerun()

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)
    _render_timeline(woche)


main()

# ---------------------------------------------------------------------------
# Hinweis zu Konzept-Widersprüchen (nicht umgesetzt, um die Spiellogik nicht
# zu verändern oder falsche Kausalitäten zu erzeugen):
#
# 1. "Kontostand": Es existiert in der Spiellogik kein separates Konto neben
#    Portfoliostand (Apfelbestand) und Wochenergebnis (Geld). Um keinen neuen
#    Finanzwert zu erfinden, zeigt die KPI-Karte "Kontostand" die Summe der
#    bereits abgerechneten Tagesergebnisse der laufenden Woche – ein reiner
#    Anzeigewert aus vorhandenen Daten, keine neue Berechnung.
#
# 2. "Bedarf: Schulessen, Bäckerei, Obstbauer": Der Obstbauer ist in der
#    Spiellogik eine feste Lieferquelle (Angebot), keine Nachfrage. Um diesen
#    Widerspruch nicht in die Oberfläche zu übernehmen, wird die mittlere
#    Spalte als "Bedarf & Fixversorgung" beschriftet und der Obstbauer separat
#    ausgewiesen, statt ihn fälschlich als Nachfrager darzustellen.
#
# 3. "Trendanzeige" bei den Preisen: Die Domänenmodelle speichern keine
#    Preishistorie. Um dennoch eine Trendanzeige zu ermöglichen, ohne
#    Domänenmodelle/Berechnungslogik zu verändern, wird eine rein UI-seitige,
#    nicht persistente Liste (st.session_state.preishistorie_l1) mit den
#    bereits abgeschlossenen Tagesmärkten geführt. Sie beeinflusst keine
#    Berechnung, sondern dient ausschließlich der optischen Pfeilanzeige.
# ---------------------------------------------------------------------------
