/** Platzhalter fuer Seiten, die in spaeteren Durchlaeufen von Phase 6 portiert werden. */
export function Platzhalter({ titel, quelle }: { titel: string; quelle: string }) {
  return (
    <div class="platzhalter">
      <h1 class="st-titel" style={{ fontSize: "1.8rem" }}>
        {titel}
      </h1>
      <p class="st-klein">
        Diese Seite wird in einem späteren Durchlauf von Phase 6 aus <code>{quelle}</code> portiert (Reihenfolge: Spielen ✓,
        Ranking ✓, Dashboard ✓, Home ✓, Tutorial ✓, Wiki, Regelwerk).
      </p>
    </div>
  );
}
