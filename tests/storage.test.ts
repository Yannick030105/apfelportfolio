/**
 * Speicherung (src/storage/*, src/config/*) und Spiellog-Migration.
 */
import { describe, expect, it } from "vitest";
import pythonBuiltins from "./daten/python_builtins.json";
import { lade_regelwerk, eingebautes_regelwerk, regelwerk_als_text, speichere_regelwerk } from "../src/config/laden";
import { pruefe_regelwerk_text } from "../src/config/pruefung";
import { ValueError } from "../src/domain/fehler";
import { Regelwerk, Tageseinkauf, Wochenverlauf } from "../src/domain/models";
import { pythonLen, pythonLower, pythonSortiert, pythonStrip } from "../src/domain/pythonString";
import { finde_level, type LevelId } from "../src/levels/registry";
import { dateiSpeicher } from "../src/storage/dateiSpeicher";
import { gemerkter_ordner, hat_schreibrecht, merke_ordner, vergiss_ordner, type SchluesselWertSpeicher } from "../src/storage/ordnerMerken";
import { ordnerSpeicher } from "../src/storage/ordnerSpeicher";
import { bekannte_spieler, fuer_level, fuer_spieler, log_zeilen } from "../src/storage/repository";
import {
  abrechnung_aus_daten,
  abrechnung_als_daten,
  als_abgeschlossen,
  als_text,
  dateiname,
  heutiges_datum,
  mit_abgeschlossenem_tag,
  mit_offenem_tag,
  neuer_spielstand,
  pruefe_spielstand,
  spielstand_aus_text,
  SpielstandFehler,
  type Spielstand,
} from "../src/storage/schema";
import { arbeitsspeicher, lese_spielstaende, SPIELSTAND_ORDNER, type Speicher } from "../src/storage/speicher";
import { get_existing_players, player_exists, validate_new_player_name } from "../src/storage/spieler";
import { APP_VERSION } from "../src/version";
import { FakeOrdner } from "./hilfen/fakeOrdner";
import { abrechnung_dict, type FallRef, type ReferenzDokument } from "./hilfen/referenz";

const referenzen = import.meta.glob<ReferenzDokument>("./referenz/level*.json", { eager: true, import: "default" });
const migriertEcht = import.meta.glob<unknown>("./daten/migration/spiellog/*.json", { eager: true, import: "default" });
const migriertGrenz = import.meta.glob<unknown>("./daten/migration/grenzfaelle/*.json", { eager: true, import: "default" });

const JETZT = new Date(2026, 10, 19, 15, 30, 12); // lokale Zeit

/**
 * Spielt einen Referenzfall ueber die Registry, speichert nach jedem Tag und
 * setzt nach Tag 2 mit einer frischen Level-Instanz aus der Datei fort.
 */
async function spieleMitSpeichern(levelId: LevelId, fall: FallRef, speicher: Speicher, spieler: string): Promise<Spielstand> {
  const eintrag = finde_level(levelId);
  const regelwerk = new Regelwerk(fall.regelwerk);
  let level = eintrag.erzeuge(regelwerk);
  let stand = neuer_spielstand({ spieler, levelId, level: eintrag.nummer, regelwerk: regelwerk.als_dict(), jetzt: JETZT, id: `id-${fall.name}` });
  await speicher.speichere(stand);
  const woche = new Wochenverlauf({ level: eintrag.nummer });

  for (const schritt of fall.schritte) {
    const e = schritt.eingabe;
    const wuerfe = { w1: e.w1, baeckerei_menge: e.baeckerei_menge, ereignis_index: e.ereignis_index ?? null };
    stand = mit_offenem_tag(stand, { tag_index: schritt.tag_index, wuerfe, zugestimmt: e.zugestimmt ?? false });
    await speicher.speichere(stand);
    const lage = level.bereite_tag_vor(schritt.tag_index, wuerfe, e.zugestimmt ?? false);
    let abrechnung;
    try {
      abrechnung = level.rechne_tag_ab(lage, new Tageseinkauf(e.einkauf));
    } catch (err) {
      expect(schritt.fehler, `${fall.name}: unerwarteter Fehler ${String(err)}`).toBeDefined();
      continue; // Fehler werden nicht gespeichert; der Tag wird wiederholt
    }
    woche.tage.push(abrechnung);
    stand = mit_abgeschlossenem_tag(
      stand,
      {
        tag_index: schritt.tag_index,
        tag: schritt.tag,
        wuerfe,
        zugestimmt: lage.zugestimmt,
        einkauf: { ...e.einkauf },
        abrechnung: abrechnung_als_daten(abrechnung),
      },
      { portfoliostand: level.portfoliostand, importeur_menge_woche: level.importeur_menge_woche },
    );
    if (woche.ist_komplett) stand = als_abgeschlossen(stand, woche, JETZT);
    await speicher.speichere(stand);

    if (schritt.tag_index === 1) {
      // "Browser neu geladen": Stand aus dem Speicher, neue Level-Instanz
      const geladen = (await speicher.lade_alle()).spielstaende.find((s) => s.id === stand.id) as Spielstand;
      expect(geladen).toEqual(stand);
      level = eintrag.erzeuge(new Regelwerk(geladen.regelwerk ?? undefined));
      level.setze_zustand(geladen.zustand as NonNullable<Spielstand["zustand"]>);
      stand = geladen;
    }
  }
  return stand;
}

describe("Log-Zeile wie in 1_spielen.py / level_2.py", () => {
  for (const [pfad, doc] of Object.entries(referenzen)) {
    it(`${pfad}: alle Wochen`, () => {
      const levelId: LevelId = doc.level === 1 ? "level1" : "level2";
      for (const fall of doc.faelle) {
        const level = finde_level(levelId).erzeuge(new Regelwerk(fall.regelwerk));
        const woche = new Wochenverlauf({ level: doc.level });
        for (const s of fall.schritte) {
          if (s.abrechnung === undefined) continue;
          const e = s.eingabe;
          const lage = level.bereite_tag_vor(s.tag_index, { w1: e.w1, baeckerei_menge: e.baeckerei_menge, ereignis_index: e.ereignis_index ?? null }, e.zugestimmt ?? false);
          woche.tage.push(level.rechne_tag_ab(lage, new Tageseinkauf(e.einkauf)));
        }
        const { spieler: _s, datum: _d, ...ohneSpielerDatum } = als_abgeschlossen(
          neuer_spielstand({ spieler: "X", levelId, level: doc.level, regelwerk: fall.regelwerk }),
          woche,
          JETZT,
        ).log_zeile as NonNullable<Spielstand["log_zeile"]>;
        expect(ohneSpielerDatum, fall.name).toEqual(fall.woche.log_zeile);
      }
    });
  }
});

describe("Spielstand: speichern nach jedem Tag, fortsetzen, exakt zurueckladen", () => {
  for (const [pfad, doc] of Object.entries(referenzen)) {
    it(`${pfad}: alle ${doc.anzahl_faelle} Wochen ueber ordnerSpeicher`, async () => {
      const levelId: LevelId = doc.level === 1 ? "level1" : "level2";
      const wurzel = new FakeOrdner("Spielordner");
      const speicher = ordnerSpeicher(wurzel);
      for (const fall of doc.faelle) await spieleMitSpeichern(levelId, fall, speicher, "Anna");

      const { spielstaende, fehlerhaft } = await speicher.lade_alle();
      expect(fehlerhaft).toEqual([]);
      expect(spielstaende.length).toBe(doc.anzahl_faelle);
      const ordner = wurzel.eintraege.get(SPIELSTAND_ORDNER) as FakeOrdner;
      expect(ordner.eintraege.size).toBe(doc.anzahl_faelle); // eine Datei je Woche

      for (const fall of doc.faelle) {
        const stand = spielstaende.find((s) => s.id === `id-${fall.name}`) as Spielstand;
        expect(stand.status).toBe("abgeschlossen");
        expect(stand.appVersion).toBe(APP_VERSION);
        const soll = fall.schritte.filter((s) => s.abrechnung !== undefined).map((s) => s.abrechnung);
        expect(stand.tage.map((t) => abrechnung_dict(abrechnung_aus_daten(t.abrechnung))), fall.name).toEqual(soll);
        expect(stand.log_zeile?.endergebnis).toBe(fall.woche.wochenergebnis);
      }
      expect(log_zeilen(spielstaende).map((z) => z.endergebnis)).toEqual(
        [...doc.faelle].sort((a, b) => (`id-${a.name}` < `id-${b.name}` ? -1 : 1)).map((f) => f.woche.wochenergebnis),
      );
    });
  }
});

function beispielStand(aenderung: Partial<Spielstand> = {}): Spielstand {
  return { ...neuer_spielstand({ spieler: "Anna", levelId: "level1", level: 1, regelwerk: new Regelwerk().als_dict(), jetzt: JETZT, id: "abc12345-x" }), ...aenderung };
}

describe("Schema und Pruefung", () => {
  it("enthaelt formatVersion, levelId, appVersion; Dateiname aus Startzeit, Level, Spieler, id", () => {
    const s = beispielStand();
    expect([s.format, s.formatVersion, s.levelId, s.appVersion]).toEqual(["apfelportfolio-spielstand", 1, "level1", APP_VERSION]);
    expect(dateiname(s)).toMatch(/^\d{8}-\d{6}_level1_Anna_abc12345-x\.json$/);
    expect(dateiname({ ...s, spieler: "Zoë / Müller?" })).toContain("_Zoë___Müller_");
    expect(spielstand_aus_text(als_text(s))).toEqual(s);
  });

  it.each<[string, (s: Spielstand) => unknown, string]>([
    ["fremdes Format", (s) => ({ ...s, format: "x" }), "keine Apfelportfolio-Spielstanddatei"],
    ["neuere Version", (s) => ({ ...s, formatVersion: 2 }), "neueren App-Version (Format 2"],
    ["fehlender Spieler", (s) => ({ ...s, spieler: "" }), '"spieler" muss ein Text sein'],
    ["falscher Status", (s) => ({ ...s, status: "fertig" }), '"status" muss'],
    ["laufend mit Log-Zeile", (s) => ({ ...s, log_zeile: { spieler: "Anna", datum: null, level: 1, endergebnis: 1, rest_long_short: 0, anteil_spot: 0, anteil_grundlast: 1, prognosefehler: null, referenzergebnis_nichthandeln: 0 } }), "laufende Woche mit"],
    ["abgeschlossen ohne Log-Zeile", (s) => ({ ...s, status: "abgeschlossen" }), "ohne \"log_zeile\""],
    ["Zahl als Text", (s) => ({ ...s, zustand: { portfoliostand: "1", importeur_menge_woche: 0 } }), '"portfoliostand" muss eine Zahl sein'],
    ["offener Tag passt nicht", (s) => ({ ...s, offener_tag: { tag_index: 2, wuerfe: { w1: 1, baeckerei_menge: 10, ereignis_index: null }, zugestimmt: false } }), "offener_tag"],
  ])("lehnt ab: %s", (_name, aendern, meldung) => {
    expect(() => pruefe_spielstand(aendern(beispielStand()), "test.json")).toThrow(SpielstandFehler);
    expect(() => pruefe_spielstand(aendern(beispielStand()), "test.json")).toThrow(meldung);
  });

  it("kaputte Dateien werden gemeldet, nicht still verworfen; doppelte Kennung erkannt", () => {
    const gut = als_text(beispielStand());
    const { spielstaende, fehlerhaft } = lese_spielstaende([
      { name: "a.json", text: gut },
      { name: "b.json", text: "{ kaputt" },
      { name: "c.json", text: gut },
    ]);
    expect(spielstaende.length).toBe(1);
    expect(fehlerhaft.map((f) => f.datei)).toEqual(["b.json", "c.json"]);
    expect(fehlerhaft[0]?.grund).toContain("kein gueltiges JSON");
    expect(fehlerhaft[1]?.grund).toContain("gleiche Spielstand-Kennung wie a.json");
  });

  it("Tag-Reihenfolge und abgeschlossene Wochen sind geschuetzt", () => {
    const s = beispielStand();
    const tag = { tag_index: 1, tag: "Dienstag", wuerfe: { w1: 1, baeckerei_menge: 10, ereignis_index: null }, zugestimmt: false, einkauf: { importeur_menge: 0, wochenmarkt_menge: 0, mosterei_menge: 0 }, abrechnung: {} as never };
    expect(() => mit_abgeschlossenem_tag(s, tag, { portfoliostand: 0, importeur_menge_woche: 0 })).toThrow("erwartet Tag 1");
    expect(() => als_abgeschlossen(s, new Wochenverlauf({ level: 1 }))).toThrow("nicht komplett");
  });

  it("rest_long_short summiert wie Python sum() (Soll aus Python: 0.6, einfache Schleife: 0.0)", () => {
    const level = finde_level("level1").erzeuge(new Regelwerk());
    const lage = level.bereite_tag_vor(0, { w1: 1, baeckerei_menge: 10, ereignis_index: null }, false);
    const vorlage = level.rechne_tag_ab(lage, new Tageseinkauf());
    const woche = new Wochenverlauf({
      level: 1,
      tage: [0.1, 0.2, 0.3, 1e16, -1e16].map((saldo) => vorlage.ersetzt({ bilanzkreis_saldo: saldo })),
    });
    const stand = als_abgeschlossen(beispielStand(), woche, JETZT);
    expect(stand.log_zeile?.rest_long_short).toBe(0.6);
  });

  it("heutiges Datum lokal wie date.today()", () => {
    expect(heutiges_datum(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("ordnerSpeicher", () => {
  it("legt spielstaende/ an, ersetzt die Datei der Woche, liest nur .json, meldet unlesbare Dateien", async () => {
    const wurzel = new FakeOrdner("Netzlaufwerk");
    const sp = ordnerSpeicher(wurzel);
    expect(sp.bezeichnung).toBe("Netzlaufwerk");
    await sp.speichere(beispielStand());
    await sp.speichere(mit_offenem_tag(beispielStand(), { tag_index: 0, wuerfe: { w1: 3, baeckerei_menge: 20, ereignis_index: null }, zugestimmt: false }));
    const ordner = wurzel.eintraege.get("spielstaende") as FakeOrdner;
    expect(ordner.eintraege.size).toBe(1);
    ordner.datei("notiz.txt", "egal");
    ordner.datei("defekt.json", "[]").lesefehler = new Error("Zugriff verweigert");
    const { spielstaende, fehlerhaft } = await sp.lade_alle();
    expect(spielstaende[0]?.offener_tag?.wuerfe.w1).toBe(3);
    expect(fehlerhaft).toEqual([{ datei: "defekt.json", grund: "nicht lesbar (Zugriff verweigert)" }]);
  });

  it("config.json: fehlt -> null, sonst Text; Schreiben im Wurzelordner", async () => {
    const wurzel = new FakeOrdner("x");
    const sp = ordnerSpeicher(wurzel);
    expect(await sp.lade_konfiguration()).toBeNull();
    await sp.speichere_konfiguration("{}");
    expect(await sp.lade_konfiguration()).toBe("{}");
  });
});

describe("ordnerMerken", () => {
  const kv = (): SchluesselWertSpeicher & { daten: Map<string, unknown> } => {
    const daten = new Map<string, unknown>();
    return { daten, hole: async (k) => daten.get(k), setze: async (k, w) => void daten.set(k, w), loesche: async (k) => void daten.delete(k) };
  };

  it("merkt, liefert und vergisst den Ordner; fehlerhafter Speicher -> null", async () => {
    const speicher = kv();
    const ordner = new FakeOrdner("Spiel");
    expect(await gemerkter_ordner(speicher)).toBeNull();
    await merke_ordner(speicher, ordner);
    expect(await gemerkter_ordner(speicher)).toBe(ordner);
    await vergiss_ordner(speicher);
    expect(await gemerkter_ordner(speicher)).toBeNull();
    const kaputt: SchluesselWertSpeicher = { hole: async () => { throw new Error("privat"); }, setze: async () => {}, loesche: async () => {} };
    expect(await gemerkter_ordner(kaputt)).toBeNull();
  });

  it("Schreibrecht: nur auf Wunsch nachfragen", async () => {
    const ordner = new FakeOrdner("Spiel");
    ordner.recht = "prompt";
    expect(await hat_schreibrecht(ordner, false)).toBe(false);
    expect(ordner.anfragen).toBe(0);
    expect(await hat_schreibrecht(ordner, true)).toBe(true);
    ordner.recht = "prompt";
    ordner.rechtNachAnfrage = "denied";
    expect(await hat_schreibrecht(ordner, true)).toBe(false);
  });
});

describe("dateiSpeicher (Rueckfallebene)", () => {
  it("Sammeldatei herunterladen und wieder einlesen ergibt dieselben Staende", async () => {
    const downloads: [string, string][] = [];
    const zustaende: boolean[] = [];
    const a = dateiSpeicher({ download: (n, t) => void downloads.push([n, t]), bei_aenderung: (u) => void zustaende.push(u) });
    const s1 = beispielStand();
    await a.speichere(s1);
    await a.speichere_konfiguration('{"importeur_limit": 250}');
    expect(a.ungesichert).toBe(true);
    const name = a.herunterladen(JETZT);
    expect(a.ungesichert).toBe(false);
    expect(zustaende).toEqual([true, true, false]);
    expect(name).toMatch(/^apfelportfolio_spielstaende_\d{4}-\d{2}-\d{2}\.json$/);

    const b = dateiSpeicher({ download: () => {} });
    const fehler = await b.dateien_einlesen([{ name, text: async () => (downloads[0] as [string, string])[1] }]);
    expect(fehler).toEqual([]);
    expect((await b.lade_alle()).spielstaende).toEqual([s1]);
    expect(await b.lade_konfiguration()).toBe('{"importeur_limit": 250}');
  });

  it("Einzeldateien, config.json, Fortschritt gewinnt, Fehler je Datei", async () => {
    const sp = dateiSpeicher({ download: () => {} });
    const frueh = beispielStand();
    const spaet = mit_offenem_tag(beispielStand(), { tag_index: 0, wuerfe: { w1: 2, baeckerei_menge: 11, ereignis_index: null }, zugestimmt: false });
    const fehler = await sp.dateien_einlesen([
      { name: "spaet.json", text: async () => als_text({ ...spaet, tage: [] }) },
      { name: "config.json", text: async () => "{}" },
      { name: "kaputt.json", text: async () => "nix" },
      { name: "neu.json", text: async () => JSON.stringify({ format: "apfelportfolio-sammlung", formatVersion: 9, spielstaende: [] }) },
    ]);
    expect(fehler.map((f) => f.datei)).toEqual(["kaputt.json", "neu.json"]);
    expect(fehler[1]?.grund).toContain("neueren App-Version");
    await sp.dateien_einlesen([{ name: "frueh.json", text: async () => als_text(frueh) }]);
    expect((await sp.lade_alle()).spielstaende.length).toBe(1);
    expect(await sp.lade_konfiguration()).toBe("{}");
  });
});

describe("Repository und Spielernamen (data/repository.py, data/players.py)", () => {
  const zeile = (spieler: string, level: number, endergebnis: number) => ({ spieler, datum: "2026-01-01", level, endergebnis, rest_long_short: 0, anteil_spot: 0, anteil_grundlast: 1, prognosefehler: null, referenzergebnis_nichthandeln: 0 });
  const abgeschlossen = (id: string, z: ReturnType<typeof zeile>, am: string | null, migriertZeile: number | null = null): Spielstand => ({
    ...beispielStand({ id, spieler: z.spieler, level: z.level, levelId: `level${z.level}` }),
    status: "abgeschlossen",
    abgeschlossen_am: am,
    log_zeile: z,
    migriert: migriertZeile === null ? null : { quelle: "spiellog.csv", zeile: migriertZeile, original: {} },
  });

  it("Reihenfolge: migrierte Zeilen in CSV-Folge, dann nach Abschlusszeit; laufende zaehlen nicht", () => {
    const staende = [
      abgeschlossen("n2", zeile("Ben", 1, 3), "2026-11-20T10:00:00.000Z"),
      abgeschlossen("m2", zeile("Anna", 2, 2), null, 2),
      abgeschlossen("n1", zeile("anna", 1, 4), "2026-11-19T10:00:00.000Z"),
      abgeschlossen("m1", zeile("Ben", 1, 1), null, 1),
      beispielStand({ id: "laufend", spieler: "Zed" }),
    ];
    const zeilen = log_zeilen(staende);
    expect(zeilen.map((z) => z.endergebnis)).toEqual([1, 2, 4, 3]);
    expect(fuer_level(zeilen, 1).map((z) => z.endergebnis)).toEqual([1, 4, 3]);
    expect(fuer_spieler(zeilen, "Anna").map((z) => z.endergebnis)).toEqual([2]);
    expect(bekannte_spieler(zeilen)).toEqual(["Anna", "Ben", "anna"]);
    expect(get_existing_players(zeilen)).toEqual(["Anna", "Ben", "anna"]);
    expect(player_exists("  ANNA ", zeilen)).toBe(true);
    expect(player_exists("Zed", zeilen)).toBe(false); // nur laufende Woche -> noch nicht vergeben (wie im Original)
  });

  it("validate_new_player_name: Texte woertlich", () => {
    const zeilen = log_zeilen([abgeschlossen("a", zeile("Anna", 1, 1), "2026-01-01T00:00:00Z")]);
    expect(validate_new_player_name("   ", zeilen)).toEqual([false, "Bitte gib einen Namen ein."]);
    expect(validate_new_player_name("x".repeat(31), zeilen)).toEqual([false, "Der Name darf höchstens 30 Zeichen lang sein."]);
    expect(validate_new_player_name("🍎".repeat(30), zeilen)).toEqual([true, ""]); // 30 Codepoints
    expect(validate_new_player_name(" anna", zeilen)).toEqual([false, "Dieser Name ist bereits vergeben. Bitte wähle einen anderen."]);
    expect(validate_new_player_name("Ben", zeilen)).toEqual([true, ""]);
  });

  it("Python-String-Verhalten (Soll aus Python)", () => {
    const d = pythonBuiltins as unknown as { lower: [number, string][]; strings: [string, string, string, number][]; sortiert: string[] };
    for (const [cp, soll] of d.lower) expect(pythonLower(String.fromCodePoint(cp)), `U+${cp.toString(16)}`).toBe(soll);
    for (const [roh, strip, lower, laenge] of d.strings) {
      expect(pythonStrip(roh)).toBe(strip);
      expect(pythonLower(pythonStrip(roh))).toBe(lower);
      expect(pythonLen(pythonStrip(roh))).toBe(laenge);
    }
    expect(pythonSortiert(d.strings.map((s) => s[0]))).toEqual(d.sortiert);
    expect(pythonLower("ΣΟΣ")).toBe("σος"); // Schluss-Sigma wie Python 3
  });
});

describe("Regelwerk laden/pruefen/speichern (data/specs_repository.py)", () => {
  it("eingebaut = config/config.json des Originals", () => {
    expect(eingebautes_regelwerk().als_dict()).toEqual({
      importeur_limit: 300, wochenmarkt_limit_tag: 300, schulessen_menge: 90, schulessen_preis: 0.4, obstbauer_menge: 200, obstbauer_preis: 0.35,
      baeckerei_preis_aufschlag: 0.2, baeckerei_preis_min: 1, baeckerei_preis_max: 6, baeckerei_menge_min: 10, baeckerei_menge_max: 60,
    });
  });

  it("ohne Speicher oder ohne config.json: eingebaut; mit config.json: vom Laufwerk", async () => {
    expect((await lade_regelwerk(null)).quelle).toBe("eingebaut");
    const sp = arbeitsspeicher("Ordner");
    expect((await lade_regelwerk(sp)).quelle).toBe("eingebaut");
    await speichere_regelwerk(sp, new Regelwerk({ importeur_limit: 123 }));
    const geladen = await lade_regelwerk(sp);
    expect([geladen.quelle, geladen.regelwerk.importeur_limit, geladen.fehler]).toEqual(["laufwerk", 123, []]);
    expect(await sp.lade_konfiguration()).toBe(regelwerk_als_text(new Regelwerk({ importeur_limit: 123 })));
  });

  it("speichern prueft wie die Regelwerk-Seite (validiert)", async () => {
    await expect(speichere_regelwerk(arbeitsspeicher(), new Regelwerk({ importeur_limit: -1 }))).rejects.toThrow(ValueError);
  });

  it.each([
    ["{ kaputt", "kein gueltiges JSON"],
    ["[1, 2]", "muss ein JSON-Objekt sein"],
    ['{"importeur_limit": 300, "farbe": "rot"}', 'Unbekannte Einstellung "farbe"'],
    ['{"importeur_limit": "300"}', '"importeur_limit" (Importeur-Obergrenze) muss eine Zahl sein'],
  ])("verworfen wie im Original -> Standardwerte Regelwerk(): %s", (text, meldung) => {
    const e = pruefe_regelwerk_text(text);
    expect(e.regelwerk.als_dict()).toEqual(new Regelwerk().als_dict());
    expect(e.fehler.join(" ")).toContain(meldung);
  });

  it("fehlende Felder und validiert()-Verstoesse: Werte gelten, Warnung", () => {
    const e = pruefe_regelwerk_text('{"importeur_limit": -5}');
    expect(e.fehler).toEqual([]);
    expect(e.regelwerk.importeur_limit).toBe(-5);
    expect(e.regelwerk.wochenmarkt_limit_tag).toBe(140);
    expect(e.warnungen.some((w) => w.includes('"wochenmarkt_limit_tag" (Wochenmarkt-Limit pro Tag) fehlt - Standardwert 140'))).toBe(true);
    expect(e.warnungen.some((w) => w.includes("Importeur-Obergrenze darf nicht negativ sein."))).toBe(true);
  });

  it("unlesbare config.json -> eingebautes Regelwerk + Meldung", async () => {
    const sp: Speicher = { ...arbeitsspeicher(), lade_konfiguration: async () => { throw new Error("Netzwerkfehler"); } };
    const e = await lade_regelwerk(sp);
    expect([e.quelle, e.fehler[0]]).toEqual(["eingebaut", "config.json konnte nicht gelesen werden (Netzwerkfehler). Es gilt das eingebaute Regelwerk."]);
  });
});

describe("Spiellog-Migration (tools/spiellog_migrieren.py)", () => {
  const pruefen = (dateien: Record<string, unknown>) =>
    Object.entries(dateien).map(([pfad, daten]) => pruefe_spielstand(daten, pfad));

  it("echte spiellog.csv: 20 Dateien, gueltig, Werte = exakter CSV-Text, Reihenfolge = CSV", () => {
    const staende = pruefen(migriertEcht);
    expect(staende.length).toBe(20);
    for (const s of staende) {
      expect(s.status).toBe("abgeschlossen");
      expect(s.migriert?.quelle).toBe("spiellog.csv");
      const o = s.migriert?.original as Record<string, string>;
      for (const feld of ["endergebnis", "rest_long_short", "anteil_spot", "anteil_grundlast", "referenzergebnis_nichthandeln"] as const) {
        expect(s.log_zeile?.[feld], `${s.id} ${feld}`).toBe(Number(o[feld]));
      }
      expect(s.log_zeile?.prognosefehler).toBeNull();
      expect(dateiname(s)).toBe(`migriert_${String(s.migriert?.zeile).padStart(4, "0")}_${s.levelId}_${s.spieler}.json`);
    }
    const zeilen = log_zeilen(staende);
    expect(zeilen.map((z) => z.spieler).slice(0, 4)).toEqual(["test", "test", "test", "Anna"]);
    // Python: get_existing_players() auf der alten CSV
    expect(get_existing_players(zeilen)).toEqual(["Anna", "Ben", "Clara", "David", "Max", "test"]);
  });

  it("Grenzfaelle: ungueltige Zeilen fehlen, Sonderfaelle korrekt", () => {
    const staende = pruefen(migriertGrenz);
    expect(staende.map((s) => s.migriert?.zeile).sort((a, b) => (a as number) - (b as number))).toEqual([1, 8, 9, 10, 12]);
    const nach = (zeile: number) => staende.find((s) => s.migriert?.zeile === zeile) as Spielstand;
    expect(nach(1).log_zeile?.endergebnis).toBe(-478.05999999999995); // exakter Wert, nicht pandas' -478.06
    expect(nach(8).spieler).toBe("NA"); // alte App las das als "fehlend"
    expect(nach(8).log_zeile?.rest_long_short).toBeNull();
    expect(nach(9).log_zeile?.endergebnis).toBe(1000);
    expect(nach(9).log_zeile?.prognosefehler).toBe(1.5);
    expect(nach(10).spieler).toBe("Doe, Jane");
    expect(nach(10).log_zeile?.datum).toBeNull();
    expect(Number.isNaN(log_zeilen([nach(8)])[0]?.rest_long_short)).toBe(true); // leere Zelle -> NaN wie pandas
  });
});
