"""Wiki-Seite: Nachschlagewerk Obsthandel <-> Energiehandel.

Neue Seite (bisher kein Code vorhanden). Enthält ausschließlich
redaktionellen Inhalt (Begriffserklärungen) und reine Darstellung –
keine Anbindung an Spiel-Logik, keine Speicherlogik.
"""

from __future__ import annotations

import plotly.graph_objects as go
import streamlit as st

AKZENT = "#C0392B"
GOLD = "#E8A33D"
BRAUN = "#8A4B0F"

st.set_page_config(page_title="Wiki – Apfelportfolio", page_icon="📖", layout="wide")


# ---------------------------------------------------------------------------
# Inhalte: Jeder Fachbegriff mit Definition, Obstbeispiel, Energiebeispiel.
# ---------------------------------------------------------------------------
KAPITEL = {
    "obsthandel": {
        "icon": "🍎",
        "titel": "Obsthandel",
        "intro": "Die Warenwelt, in der du im Spiel jeden Tag Entscheidungen triffst.",
        "begriffe": [
            {
                "name": "Bestand",
                "definition": "Die Menge einer Ware, die aktuell verfügbar ist, um Nachfrage zu decken.",
                "obst": "Die Äpfel, die am Morgen in deiner Kiste liegen, bevor der Verkauf beginnt.",
                "energie": "Die Energiemenge, die ein Händler für den nächsten Liefertag bereits eingekauft hat.",
            },
            {
                "name": "Zukauf",
                "definition": "Zusätzliche Beschaffung von Ware, wenn der eigene Bestand die Nachfrage nicht deckt.",
                "obst": "Du kaufst kurzfristig auf dem Wochenmarkt Äpfel nach, weil die Bäckerei mehr bestellt hat als erwartet.",
                "energie": "Ein Energieversorger kauft am Spotmarkt zusätzlichen Strom, weil die Nachfrage höher ist als geplant.",
            },
            {
                "name": "Fehlmenge",
                "definition": "Die Differenz, die entsteht, wenn weniger Ware verfügbar ist, als tatsächlich gebraucht wird.",
                "obst": "Die Bäckerei will 60 Äpfel, du hast aber nur 45 – 15 Äpfel Fehlmenge.",
                "energie": "Ein Netzbetreiber hat weniger Energie eingekauft, als seine Kunden verbrauchen – die Fehlmenge muss kurzfristig beschafft werden.",
            },
            {
                "name": "Überschuss",
                "definition": "Ware, die am Ende eines Zeitraums nicht benötigt wurde und übrig bleibt.",
                "obst": "Freitags bleiben dir 20 Äpfel übrig, die du an die Mosterei verkaufst.",
                "energie": "Zu viel eingekaufte Energie, die am Regelenergiemarkt wieder abgegeben werden muss.",
            },
        ],
    },
    "energiehandel": {
        "icon": "⚡",
        "titel": "Energiehandel",
        "intro": "So funktioniert der Handel mit Strom – strukturell fast identisch zum Obsthandel.",
        "begriffe": [
            {
                "name": "Beschaffung",
                "definition": "Der Prozess, benötigte Mengen rechtzeitig am Markt einzukaufen.",
                "obst": "Du entscheidest jeden Morgen, wie viele Äpfel du zusätzlich zum Obstbauern brauchst.",
                "energie": "Ein Energiehändler beschafft Strommengen über Wochen und Monate im Voraus für seine Kunden.",
            },
            {
                "name": "Lieferant",
                "definition": "Eine feste Bezugsquelle mit meist planbarer Menge und planbarem Preis.",
                "obst": "Der Obstbauer liefert dir täglich 100 Äpfel zu einem festen Preis.",
                "energie": "Ein Kraftwerksbetreiber liefert vertraglich zugesicherte Energiemengen zu festen Konditionen.",
            },
            {
                "name": "Spotmarkt",
                "definition": "Ein Markt für kurzfristigen, sofortigen Handel zu tagesaktuellen Preisen.",
                "obst": "Der Wochenmarkt, auf dem du jederzeit zu schwankenden Preisen nachkaufen kannst.",
                "energie": "Die Strombörse, an der kurzfristig Energie für den nächsten Tag oder die nächste Stunde gehandelt wird.",
            },
            {
                "name": "Vertriebspartner",
                "definition": "Ein Abnehmer, der eine feste oder planbare Menge zu einem vereinbarten Preis abnimmt.",
                "obst": "Das Schulessen, das täglich 80 Äpfel zu einem festen Preis abnimmt.",
                "energie": "Ein Industriekunde mit einem Liefervertrag über eine feste Jahresmenge Energie.",
            },
        ],
    },
    "preisbildung": {
        "icon": "📈",
        "titel": "Preisbildung",
        "intro": "Wie Preise entstehen und warum sie schwanken – im Obstkorb wie im Stromnetz.",
        "begriffe": [
            {
                "name": "Fixpreis",
                "definition": "Ein im Voraus vereinbarter, unveränderlicher Preis für eine Ware.",
                "obst": "Der Obstbauer verkauft immer zu 0,35 €/Stück – unabhängig vom Tag.",
                "energie": "Ein langfristiger Liefervertrag mit festem Preis pro Kilowattstunde.",
            },
            {
                "name": "Variabler Preis",
                "definition": "Ein Preis, der sich abhängig von Angebot, Nachfrage oder Zufall täglich ändert.",
                "obst": "Der Preis beim Importeur oder auf dem Wochenmarkt schwankt von Tag zu Tag.",
                "energie": "Der Börsenpreis für Strom, der stündlich je nach Angebot und Nachfrage schwankt.",
            },
            {
                "name": "Preisaufschlag",
                "definition": "Ein zusätzlicher Betrag, der auf einen Basispreis aufgeschlagen wird.",
                "obst": "Die Bäckerei zahlt einen Aufschlag zusätzlich zum gewürfelten Basispreis.",
                "energie": "Ein Risikoaufschlag, den Händler auf den Einkaufspreis legen, um Preisschwankungen abzusichern.",
            },
            {
                "name": "Zufallsereignis",
                "definition": "Ein unvorhersehbares Ereignis, das Preise, Mengen oder Verfügbarkeiten kurzfristig verändert.",
                "obst": "Ein Wetterereignis lässt die Erntemenge des Obstbauern in Level 2 schwanken.",
                "energie": "Ein Kraftwerksausfall oder Wetterumschwung, der kurzfristig Angebot und Preis am Strommarkt verändert.",
            },
        ],
    },
    "portfolio": {
        "icon": "📦",
        "titel": "Portfolio",
        "intro": "Die Gesamtheit aller Beschaffungs- und Absatzentscheidungen über die Zeit.",
        "begriffe": [
            {
                "name": "Portfolio",
                "definition": "Die Summe aller Verträge, Käufe und Verkäufe, die ein Akteur über einen Zeitraum hält.",
                "obst": "Alle deine Käufe (Obstbauer, Importeur, Wochenmarkt) und Verkäufe (Schulessen, Bäckerei) einer Woche zusammen.",
                "energie": "Alle Lieferverträge, Spotmarkt-Geschäfte und Absicherungen eines Energiehändlers.",
            },
            {
                "name": "Diversifikation",
                "definition": "Die Verteilung von Beschaffung oder Absatz auf mehrere Quellen, um Risiko zu streuen.",
                "obst": "Du beziehst Äpfel nicht nur vom Obstbauern, sondern auch vom Importeur und Wochenmarkt.",
                "energie": "Ein Versorger bezieht Energie aus mehreren Kraftwerken und Marktsegmenten statt nur aus einer Quelle.",
            },
            {
                "name": "Wochenergebnis",
                "definition": "Der finanzielle Gesamterfolg aller Entscheidungen über einen abgeschlossenen Zeitraum.",
                "obst": "Dein Endergebnis in Euro am Ende der Spielwoche.",
                "energie": "Der Deckungsbeitrag eines Energieportfolios am Ende einer Handelsperiode.",
            },
        ],
    },
    "bilanzkreis": {
        "icon": "⚖",
        "titel": "Bilanzkreis",
        "intro": "Das Ausgleichsprinzip: Was nicht passt, wird am Ende ausgeglichen.",
        "begriffe": [
            {
                "name": "Bilanzkreis",
                "definition": "Eine buchhalterische Einheit, in der Zukauf und Bedarf gegenübergestellt und ausgeglichen werden müssen.",
                "obst": "Dein persönliches Apfelkonto: Was reinkommt und rausgeht, muss am Ende der Woche ausgeglichen sein.",
                "energie": "Der Bilanzkreis eines Energieversorgers, in dem Einspeisung und Verbrauch stets ausgeglichen sein müssen.",
            },
            {
                "name": "Bilanzkreissaldo",
                "definition": "Die Differenz zwischen beschaffter und benötigter Menge zu einem Zeitpunkt.",
                "obst": "Am Ende des Tages hast du 10 Äpfel mehr eingekauft, als verkauft wurden – Saldo +10.",
                "energie": "Ein Versorger hat mehr Energie eingekauft als seine Kunden verbraucht haben – ein positiver Bilanzkreissaldo.",
            },
            {
                "name": "Freitags-Ausgleich",
                "definition": "Ein automatischer Mechanismus, der am Ende einer Periode Über- oder Unterdeckung auflöst.",
                "obst": "Freitags geht dein Überschuss automatisch an die Mosterei, eine Fehlmenge wird automatisch am Wochenmarkt gedeckt.",
                "energie": "Regelenergie gleicht am Ende jeder Bilanzierungsperiode Abweichungen zwischen Einspeisung und Verbrauch aus.",
            },
        ],
    },
    "beispiele": {
        "icon": "💡",
        "titel": "Beispiele",
        "intro": "Eine durchgerechnete Woche – Schritt für Schritt vom Apfel zum Energiehandel übersetzt.",
        "begriffe": [
            {
                "name": "Beispieltag: Montag",
                "definition": "Ein typischer Tagesablauf mit festen und variablen Beschaffungsquellen.",
                "obst": "Obstbauer liefert 100 Äpfel (0,35 €), Schulessen kauft 80 Äpfel (0,40 €), Bäckerei fragt 35 Äpfel zu variablem Preis nach.",
                "energie": "Ein Kraftwerksvertrag liefert eine Grundmenge, ein Industriekunde nimmt eine feste Menge ab, der Rest wird am Spotmarkt gehandelt.",
            },
            {
                "name": "Beispielwoche: Ergebnis",
                "definition": "Die Zusammenfassung aller Einnahmen und Ausgaben einer Handelsperiode.",
                "obst": "Einnahmen aus Schulessen, Bäckerei und Mosterei minus Ausgaben bei Obstbauer, Importeur und Wochenmarkt ergeben dein Wochenergebnis.",
                "energie": "Erlöse aus Lieferverträgen und Spotmarktverkäufen minus Beschaffungskosten ergeben den Deckungsbeitrag der Handelswoche.",
            },
        ],
    },
}

REIHENFOLGE = ["obsthandel", "energiehandel", "preisbildung", "portfolio", "bilanzkreis", "beispiele"]


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
        .block-container { padding-top: 1.8rem; max-width: 1100px; }

        .wk-hero { text-align: center; margin-bottom: 1.2rem; }
        .wk-hero .icon { font-size: 2.2rem; }
        .wk-hero h1 {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 800; font-size: 2rem; color: #6B3610;
            margin: 0.15rem 0 0.05rem 0;
        }
        .wk-hero p {
            font-family: 'Nunito', sans-serif; font-style: italic; font-weight: 600;
            color: #A6521F; margin: 0;
        }

        /* Navigation links: wie ein kleines Register */
        section[data-testid="stSidebar"] {
            background: linear-gradient(180deg, #FDF2E3 0%, #FBE9D2 100%);
            border-right: 2px solid #EFD9BC;
        }
        .nav-heading {
            font-family: 'Baloo 2', sans-serif; font-weight: 700;
            color: #6B3610; font-size: 1.05rem; margin: 0.4rem 0 0.6rem 0;
        }
        section[data-testid="stSidebar"] .stRadio label p {
            font-family: 'Nunito', sans-serif !important;
            font-weight: 700 !important;
            color: #4A3113 !important;
        }

        /* Kapitel-Kopf rechts */
        .chapter-header {
            display: flex; align-items: center; gap: 0.9rem;
            margin-bottom: 0.3rem;
        }
        .chapter-icon {
            width: 54px; height: 54px; border-radius: 14px;
            background: #FCEBD9; border: 2px solid #E8A33D;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.7rem; flex-shrink: 0;
        }
        .chapter-title {
            font-family: 'Baloo 2', sans-serif; font-weight: 800;
            font-size: 1.6rem; color: #2B2118; margin: 0;
        }
        .chapter-intro {
            font-family: 'Nunito', sans-serif; color: #8A7A68;
            margin: 0.1rem 0 1.1rem 68px; font-size: 0.92rem;
        }

        /* Begriffs-Karte */
        .term-card {
            background: linear-gradient(160deg, #FFFFFF 0%, #FDF2E3 100%);
            border: 2px solid #EFD9BC;
            border-radius: 18px;
            padding: 1.1rem 1.3rem 1.2rem 1.3rem;
            margin-bottom: 1.1rem;
            box-shadow: 0 4px 10px rgba(107,54,16,0.06);
        }
        .term-name {
            font-family: 'Baloo 2', sans-serif; font-weight: 700;
            font-size: 1.15rem; color: #6B3610; margin: 0 0 0.25rem 0;
        }
        .term-def {
            font-family: 'Nunito', sans-serif; color: #2B2118;
            font-size: 0.94rem; margin-bottom: 0.8rem;
        }
        .example-row { display: flex; gap: 0.8rem; flex-wrap: wrap; }
        .example-box {
            flex: 1 1 240px;
            border-radius: 12px;
            padding: 0.7rem 0.9rem;
            font-family: 'Nunito', sans-serif; font-size: 0.85rem;
        }
        .example-box.obst {
            background: #FCEBD9; border: 1px solid #E8A33D;
        }
        .example-box.energie {
            background: #EAF1EF; border: 1px solid #7FA89A;
        }
        .example-label {
            display: block; font-weight: 800; font-size: 0.72rem;
            text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 0.25rem;
        }
        .example-box.obst .example-label { color: #A6521F; }
        .example-box.energie .example-label { color: #3F6B5B; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _render_navigation() -> str:
    st.sidebar.markdown('<p class="nav-heading">📖 Nachschlagewerk</p>', unsafe_allow_html=True)
    optionen = [f"{KAPITEL[k]['icon']} {KAPITEL[k]['titel']}" for k in REIHENFOLGE]
    auswahl = st.sidebar.radio("Kapitel", optionen, label_visibility="collapsed")
    index = optionen.index(auswahl)
    return REIHENFOLGE[index]


def _render_diagramm(kapitel_key: str) -> None:
    """Kleines, kapitelspezifisches Diagramm als visuelles Element."""
    if kapitel_key == "preisbildung":
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=["Mo", "Di", "Mi", "Do", "Fr"], y=[0.35, 0.35, 0.35, 0.35, 0.35],
            mode="lines+markers", name="Fixpreis (Obstbauer)",
            line=dict(color=BRAUN, width=3), marker=dict(size=7),
        ))
        fig.add_trace(go.Scatter(
            x=["Mo", "Di", "Mi", "Do", "Fr"], y=[0.42, 0.51, 0.38, 0.60, 0.47],
            mode="lines+markers", name="Variabler Preis (Wochenmarkt)",
            line=dict(color=AKZENT, width=3), marker=dict(size=7),
        ))
        fig.update_layout(
            height=260, margin=dict(l=10, r=10, t=30, b=10),
            plot_bgcolor="white", paper_bgcolor="white",
            yaxis_title="€ / Stück", legend=dict(orientation="h", y=1.15),
        )
        st.plotly_chart(fig, use_container_width=True)

    elif kapitel_key == "portfolio":
        fig = go.Figure(data=[go.Pie(
            labels=["Obstbauer (fix)", "Importeur", "Wochenmarkt"],
            values=[55, 25, 20],
            marker=dict(colors=[BRAUN, GOLD, AKZENT]),
            hole=0.45,
        )])
        fig.update_layout(
            height=260, margin=dict(l=10, r=10, t=20, b=10),
            paper_bgcolor="white",
            annotations=[dict(text="Beschaffung", showarrow=False, font_size=13)],
        )
        st.plotly_chart(fig, use_container_width=True)

    elif kapitel_key == "bilanzkreis":
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=["Mo", "Di", "Mi", "Do", "Fr"], y=[8, -4, 12, -10, 0],
            marker_color=[GOLD if v >= 0 else AKZENT for v in [8, -4, 12, -10, 0]],
        ))
        fig.update_layout(
            height=260, margin=dict(l=10, r=10, t=30, b=10),
            plot_bgcolor="white", paper_bgcolor="white",
            yaxis_title="Bilanzkreissaldo (Stück)",
            title=dict(text="Über-/Unterdeckung im Wochenverlauf", font_size=13),
        )
        st.plotly_chart(fig, use_container_width=True)


def main() -> None:
    _inject_style()

    st.markdown(
        """
        <div class="wk-hero">
            <div class="icon">📖🍎⚡</div>
            <h1>Wiki</h1>
            <p>Vom Apfelkorb zum Stromnetz – wie Obsthandel und Energiehandel zusammenhängen.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    kapitel_key = _render_navigation()
    kapitel = KAPITEL[kapitel_key]

    st.markdown(
        f"""
        <div class="chapter-header">
            <div class="chapter-icon">{kapitel['icon']}</div>
            <p class="chapter-title">{kapitel['titel']}</p>
        </div>
        <p class="chapter-intro">{kapitel['intro']}</p>
        """,
        unsafe_allow_html=True,
    )

    _render_diagramm(kapitel_key)

    for begriff in kapitel["begriffe"]:
        st.markdown(
            f"""
            <div class="term-card">
                <p class="term-name">{begriff['name']}</p>
                <p class="term-def">{begriff['definition']}</p>
                <div class="example-row">
                    <div class="example-box obst">
                        <span class="example-label">🍎 Obstbeispiel</span>{begriff['obst']}
                    </div>
                    <div class="example-box energie">
                        <span class="example-label">⚡ Energiebeispiel</span>{begriff['energie']}
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


if __name__ == "__main__":
    main()
