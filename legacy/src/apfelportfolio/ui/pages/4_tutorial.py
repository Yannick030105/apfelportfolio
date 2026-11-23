"""Tutorial-Seite: interaktive Einführung ins Spiel.

Neue Seite (bisher kein Code vorhanden). Enthält ausschließlich
redaktionellen Inhalt und reine Darstellung – keine Anbindung an
Spiel-Logik, keine Speicherlogik. Der Fortschritt (aktueller Schritt)
wird nur in st.session_state gehalten und beeinflusst kein Spielmodell.

Inhaltlich basiert das Tutorial auf den tatsächlichen Spielregeln aus
Level 1 (level1_grundlast.py) und Level 2 (level2_ereignisse.py):
Obstbauer (fix), Schulessen (fix), Bäckerei (variabel), Importeur
(Mo–Mi, limitiert), Wochenmarkt (immer, limitiert), Mosterei/Freitags-
Ausgleich (automatisch) sowie das Zufallsereignis-System in Level 2.
"""

from __future__ import annotations

import streamlit as st

AKZENT = "#C0392B"
GOLD = "#E8A33D"
BRAUN = "#8A4B0F"
GRUEN = "#3F8F5C"

st.set_page_config(page_title="Tutorial – Apfelportfolio", page_icon="🎓", layout="centered")


# ---------------------------------------------------------------------------
# Inhalt: jeder Schritt mit Illustration (Icon), Erklärung, Beispiel.
# ---------------------------------------------------------------------------
SCHRITTE = [
    {
        "icon": "🍎",
        "titel": "Willkommen im Apfelportfolio",
        "erklaerung": (
            "Du übernimmst einen kleinen Apfelhandel. Jede Woche besteht aus "
            "fünf Tagen – Montag bis Freitag. An jedem Tag triffst du "
            "Entscheidungen: Wie viele Äpfel kaufst du zusätzlich ein, um den "
            "Bedarf deiner Abnehmer zu decken?"
        ),
        "beispiel": "Dein Ziel: Am Ende der Woche soll möglichst viel Gewinn in Euro übrig bleiben.",
    },
    {
        "icon": "🌳",
        "titel": "Der Obstbauer – deine feste Lieferquelle",
        "erklaerung": (
            "Der Obstbauer liefert dir jeden Tag automatisch eine feste Menge "
            "Äpfel zu einem festen Preis. Das ist dein verlässlicher "
            "Grundbestand, um den du dich nicht kümmern musst."
        ),
        "beispiel": "Beispiel: 100 Äpfel täglich zu 0,35 €/Stück – ohne dass du etwas einstellen musst.",
    },
    {
        "icon": "🏫",
        "titel": "Das Schulessen – dein fester Abnehmer",
        "erklaerung": (
            "Das Schulessen kauft dir jeden Tag automatisch eine feste Menge "
            "Äpfel zu einem festen Preis ab. Diese Einnahme ist planbar und "
            "wiederholt sich jeden Tag."
        ),
        "beispiel": "Beispiel: 80 Äpfel täglich zu 0,40 €/Stück gehen automatisch ans Schulessen.",
    },
    {
        "icon": "🥐",
        "titel": "Die Bäckerei – schwankender Bedarf",
        "erklaerung": (
            "Die Bäckerei bestellt jeden Tag eine unterschiedliche Menge "
            "Äpfel – wie ein Würfelwurf. Der Preis ändert sich ebenfalls "
            "täglich. Die Bäckerei wird immer vollständig beliefert, das "
            "kannst du nicht einstellen."
        ),
        "beispiel": "Beispiel: Heute fragt die Bäckerei 42 Äpfel nach, morgen vielleicht nur 15.",
    },
    {
        "icon": "🚢",
        "titel": "Der Importeur – Zukauf mit Limit",
        "erklaerung": (
            "Reicht dein Bestand nicht aus, kannst du beim Importeur zukaufen. "
            "Das geht aber nur von Montag bis Mittwoch, und es gibt eine "
            "Obergrenze für die gesamte Woche. Der Preis schwankt täglich."
        ),
        "beispiel": "Beispiel: Am Donnerstag ist der Importeur nicht mehr verfügbar – plane deinen Zukauf rechtzeitig.",
    },
    {
        "icon": "🧺",
        "titel": "Der Wochenmarkt – flexibler Zukauf",
        "erklaerung": (
            "Der Wochenmarkt ist jeden Tag geöffnet, hat aber eine tägliche "
            "Obergrenze. Auch hier schwankt der Preis von Tag zu Tag – manchmal "
            "günstig, manchmal teuer."
        ),
        "beispiel": "Beispiel: Du deckst eine kurzfristige Lücke, indem du 20 Äpfel am Wochenmarkt zukaufst.",
    },
    {
        "icon": "🍹",
        "titel": "Die Mosterei – dein Ventil am Freitag",
        "erklaerung": (
            "Am Freitag gleicht das Spiel automatisch aus: Ein übrig "
            "gebliebener Bestand wird an die Mosterei verkauft, eine "
            "Fehlmenge wird automatisch am Wochenmarkt zugekauft. Das musst "
            "du nicht mehr manuell einstellen."
        ),
        "beispiel": "Beispiel: Bleiben am Freitag 12 Äpfel übrig, verkauft das Spiel sie automatisch an die Mosterei.",
    },
    {
        "icon": "⚖️",
        "titel": "Der Bilanzkreis – Angebot und Bedarf im Gleichgewicht",
        "erklaerung": (
            "Jeden Tag wird geprüft, ob du mehr Äpfel hast als gebraucht "
            "(Überschuss, „Long“) oder weniger als gebraucht (Fehlmenge, "
            "„Short“). Diese Differenz nennt man Bilanzkreissaldo."
        ),
        "beispiel": "Beispiel: +10 bedeutet 10 Äpfel Überschuss, −5 bedeutet 5 Äpfel Fehlmenge an diesem Tag.",
    },
    {
        "icon": "💰",
        "titel": "Der Handelstisch – dein täglicher Ablauf",
        "erklaerung": (
            "Jeden Tag siehst du die aktuellen Preise, den Bedarf deiner "
            "Abnehmer und eine Handelskonsole mit Reglern für Importeur, "
            "Wochenmarkt und Mosterei. Wenn du fertig bist, schließt du den "
            "Handel für diesen Tag ab."
        ),
        "beispiel": "Beispiel: Regler auf 30 Äpfel beim Importeur stellen, dann auf „Handel abschließen“ klicken.",
    },
    {
        "icon": "🌩️",
        "titel": "Level 2 – Ereignisse meistern",
        "erklaerung": (
            "In Level 2 passiert täglich zusätzlich ein Zufallsereignis. Es "
            "kann Preise, Mengen oder Verfügbarkeiten verändern – manchmal "
            "musst du sogar aktiv Ja oder Nein zu einer Entscheidung sagen."
        ),
        "beispiel": "Beispiel: Ein Ereignis kann den Importeur für einen Tag komplett sperren.",
    },
    {
        "icon": "🏆",
        "titel": "Ranking, Dashboard und Wiki",
        "erklaerung": (
            "Im Ranking siehst du, wie du im Vergleich zu anderen Händlern "
            "abschneidest. Im Dashboard findest du deine persönliche "
            "Statistik. Im Wiki erfährst du, wie der Apfelhandel mit echtem "
            "Energiehandel zusammenhängt."
        ),
        "beispiel": "Beispiel: Dein bestes Wochenergebnis erscheint sowohl im Dashboard als auch im Ranking.",
    },
    {
        "icon": "🚀",
        "titel": "Bereit zum Start",
        "erklaerung": (
            "Das war's schon! Wähle auf der Startseite deinen Händler aus "
            "und beginne mit Level 1. Du kannst jederzeit hierher "
            "zurückkommen, wenn du etwas nachlesen möchtest."
        ),
        "beispiel": "Viel Erfolg – werde zum erfolgreichsten Obsthändler!",
    },
]


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
        .block-container { padding-top: 1.8rem; max-width: 720px; }

        .tut-hero { text-align: center; margin-bottom: 1.2rem; }
        .tut-hero h1 {
            font-family: 'Baloo 2', sans-serif;
            font-weight: 800; font-size: 2rem; color: #6B3610;
            margin: 0.15rem 0 0.05rem 0;
        }
        .tut-hero p {
            font-family: 'Nunito', sans-serif; font-style: italic; font-weight: 600;
            color: #A6521F; margin: 0;
        }

        /* Fortschritts-Punkte */
        .progress-dots { display: flex; justify-content: center; gap: 0.4rem; margin: 1rem 0 1.4rem 0; }
        .dot { width: 9px; height: 9px; border-radius: 50%; background: #E6D8C3; }
        .dot.done { background: #E8A33D; }
        .dot.current { background: #C0392B; width: 12px; height: 12px; }

        /* Schritt-Karte */
        .step-card {
            background: linear-gradient(160deg, #FFFFFF 0%, #FDF2E3 100%);
            border: 2px solid #EFD9BC;
            border-radius: 22px;
            padding: 2.2rem 2rem 1.6rem 2rem;
            text-align: center;
            box-shadow: 0 6px 16px rgba(107,54,16,0.08);
            margin-bottom: 1.3rem;
        }
        .step-illustration {
            width: 96px; height: 96px; margin: 0 auto 1rem auto;
            border-radius: 50%;
            background: radial-gradient(circle at 35% 30%, #FFE3AE 0%, #E8A33D 55%, #C97B1F 100%);
            border: 4px solid #FCF6EE;
            box-shadow: 0 0 0 3px #E8A33D, 0 10px 22px rgba(138,75,15,0.30);
            display: flex; align-items: center; justify-content: center;
            font-size: 3rem;
        }
        .step-label {
            font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 0.72rem;
            text-transform: uppercase; letter-spacing: 0.6px; color: #A6521F;
            margin-bottom: 0.3rem;
        }
        .step-title {
            font-family: 'Baloo 2', sans-serif; font-weight: 800;
            font-size: 1.5rem; color: #2B2118; margin: 0 0 0.9rem 0;
        }
        .step-text {
            font-family: 'Nunito', sans-serif; font-size: 1rem; color: #4A3B2C;
            line-height: 1.55; margin: 0 auto 1.1rem auto; max-width: 480px;
        }
        .step-example {
            display: inline-block; text-align: left;
            background: #FCEBD9; border: 1px solid #E8A33D; border-radius: 12px;
            padding: 0.7rem 1rem; font-family: 'Nunito', sans-serif;
            font-size: 0.86rem; color: #6B3610; max-width: 480px;
        }
        .step-example b { font-family: 'JetBrains Mono', monospace; }

        /* Navigation */
        .nav-row .stButton button {
            font-family: 'Baloo 2', sans-serif; font-weight: 700;
            border-radius: 14px; border: none; width: 100%;
        }
        div[data-testid="column"]:nth-of-type(2) .nav-row .stButton button {
            background: linear-gradient(180deg, #E8A33D 0%, #C97B1F 100%);
            color: #3A1F00;
            box-shadow: 0 6px 0 #A6611A, 0 10px 18px rgba(166,97,26,0.30);
            font-size: 1.05rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _render_fortschritt(aktueller_index: int, gesamt: int) -> None:
    punkte = ""
    for i in range(gesamt):
        klasse = "dot current" if i == aktueller_index else ("dot done" if i < aktueller_index else "dot")
        punkte += f'<span class="{klasse}"></span>'
    st.markdown(f'<div class="progress-dots">{punkte}</div>', unsafe_allow_html=True)


def _render_schritt(schritt: dict, nummer: int, gesamt: int) -> None:
    st.markdown(
        f"""
        <div class="step-card">
            <div class="step-illustration">{schritt['icon']}</div>
            <p class="step-label">Schritt {nummer} von {gesamt}</p>
            <p class="step-title">{schritt['titel']}</p>
            <p class="step-text">{schritt['erklaerung']}</p>
            <div class="step-example">💡 {schritt['beispiel']}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def main() -> None:
    _inject_style()

    if "tutorial_schritt" not in st.session_state:
        st.session_state.tutorial_schritt = 0

    st.markdown(
        """
        <div class="tut-hero">
            <p style="font-size:2rem; margin:0;">🎓🍎</p>
            <h1>Tutorial</h1>
            <p>So funktioniert dein Apfelhandel – Schritt für Schritt.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    gesamt = len(SCHRITTE)
    index = st.session_state.tutorial_schritt
    index = max(0, min(index, gesamt - 1))
    st.session_state.tutorial_schritt = index

    _render_fortschritt(index, gesamt)
    _render_schritt(SCHRITTE[index], index + 1, gesamt)

    st.markdown('<div class="nav-row">', unsafe_allow_html=True)
    col_zurueck, col_weiter = st.columns(2)
    with col_zurueck:
        if st.button("⬅ Zurück", disabled=index == 0, use_container_width=True):
            st.session_state.tutorial_schritt = max(0, index - 1)
            st.rerun()
    with col_weiter:
        if index < gesamt - 1:
            if st.button("Weiter ➜", use_container_width=True):
                st.session_state.tutorial_schritt = index + 1
                st.rerun()
        else:
            if st.button("🚀 Zur Startseite", use_container_width=True):
                st.session_state.tutorial_schritt = 0
                st.switch_page("src/apfelportfolio/ui/pages/home.py")
    st.markdown("</div>", unsafe_allow_html=True)


if __name__ == "__main__":
    main()
