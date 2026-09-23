# KINETIC BREACH

Ein taktischer Low-Poly Arena-Shooter im Browser: Best-of-5-Duelle (1v1/3v3/5v5) gegen Bot-Teams,
ein Rang-/Skill-Rating-System mit lokaler Bestenliste, 14 Waffen mit eigenen Tier-Stufen, ein
XP-/Level-/Fragmente-System mit Loadout-Freischaltungen und rotierenden Aufträgen — alles
clientseitig, ohne Backend, ohne echten Multiplayer.

**Spielen: https://leeshovo.github.io/arena-fps/**

Gebaut mit [Three.js](https://threejs.org/) (r160) über eine Import-Map direkt vom CDN geladen —
kein Build-Schritt, keine externen 3D-/Audio-Dateien. Alle Geometrie besteht aus Primitives, alle
Sounds werden zur Laufzeit per Web Audio API synthetisiert.

**Optik:** helle, sterile Chunky-Low-Poly-Arenen mit prozeduralem Kachelraster, weichen Kontakt-
schatten, Bloom und kurzer Chromatic Aberration/Screen-Shake bei Treffern. Dunkle Waffen-Viewmodels
mit Akzentfarbe je Tier-Stufe (höhere Stufen mit pulsierendem Energie-Riss-Overlay), humanoide
Team-Bots, Landestaub/Sprintstaub/Dash-Partikel und farbige Treffer-Decals.

## Steuerung

| Taste | Aktion |
| --- | --- |
| W A S D | Bewegen |
| Maus | Umsehen (Pointer Lock) |
| Leertaste | Springen — zweite Leertaste in der Luft löst einen Doppelsprung aus |
| Shift | Sprinten |
| Strg / C | Slide (im Sprint) — Momentum-Burst, der graduell abbremst; Sprung währenddessen trägt den Schwung in die Luft |
| Q | Dash — kurzer Bewegungsschub in Lauf-/Blickrichtung, ca. 4 s Cooldown |
| Linksklick | Schießen (halten für Automatikfeuer) |
| Rechtsklick | Zielen (ADS) — Zoom & Bewegungsmalus je nach Waffe unterschiedlich stark |
| 1 – 4 / Mausrad | Waffe wechseln |
| R | Nachladen |
| F | Nahkampf (automatischer Backstab-Bonus bei Treffern von hinten, waffenabhängig) |
| G | Utility (Wurfladung/Rauch/Heilung — je nach Loadout) |
| Tab (halten) | Scoreboard (Team Blau/Rot, K/D) |
| M | Match jederzeit verlassen |

## Menü-Navigation

**Hauptmenü** (Level, XP-Balken, Fragmente, Rang/SR, aktive Aufträge, Bestenliste) → **Loadout**
(Waffen + Tier-Stufen wählen oder freischalten) → **Modus & Map** (Spielmodus, Schwierigkeit,
optional gewertet, Karte) → **Match** → **Match-Ende** (Scoreboard, Genauigkeit, XP/Fragmente,
Rang-Änderung, Unlocks) → zurück zum Hauptmenü. „Spielen“ im Hauptmenü überspringt den
Loadout-Screen und nutzt das zuletzt gewählte Loadout.

## Spielmodi — Best-of-5

Duell, Team-Gefecht und 5v5-Variante sind strukturell identisch: Team Blau (Spieler + Bot-
Verbündete) gegen Team Rot (Bot-Gegner), gespielt in Eliminationsrunden **ohne Mid-Round-Respawn**
— wer stirbt, bleibt bis Rundenende tot. Zwischen zwei Runden liegt eine kurze Bereitschaftsphase
mit Countdown, danach werden alle Kombattanten an neuen Spawnpunkten wiederbelebt. Wer zuerst
5 Rundensiege erreicht, gewinnt das Match.

- **Duell:** 1v1 gegen einen Bot.
- **Team-Gefecht:** 3v3 — du + 2 Bot-Verbündete gegen ein feindliches Bot-Team. Bots bekämpfen sich
  dabei auch gegenseitig, nicht nur dich. Schädigst du einen Bot kurz bevor ihn ein Verbündeter
  eliminiert, zählt das als **Assist**.
- **5v5-Variante:** wie Team-Gefecht, aber mit voller Teamstärke auf beiden Seiten.
- **Training:** kein Zeitlimit, keine Wertung, normale Respawns — zum Ausprobieren neuer Waffen/
  Tier-Stufen. Mit `M` jederzeit verlassen.

Zusätzlich wählbar: **Schwierigkeit** (Leicht/Normal/Schwer, steuert Zielgenauigkeit/Feuerrate/
Sichtweite/Reaktionszeit der Bots) und — bei Duell/Team-Gefecht/5v5 — **Gewertet spielen**.

### Rang & Bestenliste

Gewertete Matches verändern dein **Skill-Rating (SR)**: Sieg bringt SR abhängig von Schwierigkeit
und aktueller Win-Streak, Niederlage kostet SR. Sechs Ränge (Rekrut → Vollstrecker → Veteran →
Meisterschütze → Champion → Ikone) sind an SR-Schwellen gekoppelt. Die letzten Matches landen in
einer lokalen Bestenliste im Hauptmenü — da es keinen Server gibt, ist das dein persönlicher
Verlauf, kein globales Ranking.

## Waffenroster (14 Waffen, je 2-3 Tier-Stufen)

| Slot | Waffen |
| --- | --- |
| Primär (6) | Sturmgewehr, Farbwaffe (auffällige Treffer-Spritzer), Burst-Gewehr, Schrotflinte, Scharfschützengewehr, Energiewaffe (leuchtender Kernlauf, 3 Tier-Stufen) |
| Sekundär (3) | Pistole, Maschinenpistole, Wuchtrevolver (3 Tier-Stufen) |
| Nahkampf (2) | Nahkampfmesser (Backstab-Bonus), Kampfaxt (langsamer, mehr Schaden, 3 Tier-Stufen) |
| Utility (3) | Wurfladung (Flächenschaden), Rauchgranate (blockiert Bot-Sichtlinie), Heilkapsel (Selbstheilung über Zeit) |

Jede Waffe hat eigene Feuerrate/Schaden/Magazingröße/Streuung/Reichweite/ADS-Zoom sowie ein
spürbares, sich beim Halten aufbauendes Recoil-Pattern. Jede Tier-Stufe trägt einen eigenen Namen
(z. B. Sturmgewehr → *Kernglut*, Wuchtrevolver → *Sechserkern* → *Letztes Wort*) und eine eigene
Akzentfarbe; ab der zweiten Stufe kommt ein pulsierendes Energie-Riss-Overlay dazu.

## Progression & Loadout

- **XP & Level:** Eliminations, Kopfschüsse, Backstabs, Utility-Kills, Nahkampf-Kills, Assists und
  Rundensiege füllen aktive Aufträge; jedes Match gibt zusätzlich Basis-XP/-Fragmente (mehr bei Sieg).
- **Fragmente** (Ingame-Währung): unabhängig vom Level verdient, schalten Waffen/Tier-Stufen
  **vorzeitig** frei (Level-Anforderung wird dabei übersprungen).
- **Aufträge:** 4 gleichzeitig aktiv, zufällig aus einem Pool von 11 Vorlagen. Abschluss gibt einen
  XP-/Fragmente-Bonus und wird sofort durch einen neuen Auftrag ersetzt.
- **Loadout-Screen:** pro Slot alle Waffen + die Tier-Stufen der aktuell gewählten Waffe, mit
  Freischalt-Status (Level oder Preis); Klick auf ein gesperrtes Item versucht den Kauf.
- **Speicherung:** Level, XP, Fragmente, Freischaltungen, Loadout, Rang/SR und Bestenliste liegen
  komplett in `localStorage` (`kineticbreach_save_v1`) — bleiben über Sessions hinweg erhalten.

## Bots

Patrouillieren zwischen Wegpunkten, erkennen Ziele nur per Sichtlinien-Raycast (kein Wallhack, auch
durch Rauch blockiert), verfolgen und schießen mit begrenztem Magazin (laden bei leer nach), suchen
bei niedriger HP Deckung, weichen nach einem Treffer kurz reaktiv aus. Im Team-Modus bekämpfen sich
gegnerische Bots auch untereinander, nicht nur den Spieler. Innerhalb einer Eliminationsrunde bleibt
ein toter Bot tot (kein Mid-Round-Respawn); im Training respawnen Bots wie gewohnt nach kurzer Zeit.

## Maps

6 thematisch unterschiedliche Arenen im gleichen chunky Low-Poly-Look:

1. **Offene Arena** — weite Sichtlinien, wenige hohe Deckungen.
2. **Stillwerk** — acht identische, nach innen offene Raum-Module um eine leere Mitte; gelbliches
   Licht, liminale Endlos-Stimmung.
3. **Hochsteg** — lange Überführung über Wasser, niedrige Geländer statt hoher Randmauern.
4. **Nebelfeld** — nächtlicher Friedhof am Waldrand, dichter Nebel, enge Sichtlinien zwischen
   Gräbern und Bäumen.
5. **Hinterhof** — Kisten, Holzzäune, viele kleine Deckungsobjekte, verwinkelt.
6. **Kranhafen** — Container-Yard mit Kran-Silhouetten, offene und enge Bereiche gemischt.

## So startest du das Spiel über GitHub (GitHub Pages)

Das Spiel besteht nur aus statischen Dateien, GitHub kann es deshalb kostenlos ausliefern.

1. Repository öffnen: `https://github.com/leeshovo/arena-fps`
2. **Settings** (Zahnrad-Reiter oben) → links **Pages**.
3. Unter **Build and deployment → Source** die Option **Deploy from a branch** wählen.
4. Bei **Branch** `main` und den Ordner `/ (root)` wählen, dann **Save**.
5. Etwa eine Minute warten. Oben auf der Seite erscheint dann
   „Your site is live at **https://leeshovo.github.io/arena-fps/**“.

**Updates veröffentlichen:** Änderungen committen und pushen, GitHub Pages aktualisiert die Seite von selbst:

```bash
git add -A && git commit -m "Update" && git push
```

## Lokal starten

Wegen der ES-Module funktioniert ein Doppelklick auf `index.html` nicht, ein kleiner Webserver genügt:

```bash
npx serve .
```

```bash
python -m http.server 8000
```

Danach `http://localhost:3000` (serve) bzw. `http://localhost:8000` (Python) öffnen. Pointer Lock
(Mauslook) und Sound (Nutzergeste nötig) funktionieren nur in einem echten Browser-Tab, nicht in
eingebetteten Vorschau-Frames.

## Projektstruktur

```
index.html        Grundgerüst, Import-Map (inkl. three/addons für Post-Processing), alle Screens
style.css         Aussehen von HUD, Menüs, Loadout, Modus-Auswahl, Scoreboard, Rundenbanner
js/
  main.js         Einstieg: Rendering/Post-FX-Setup, Input, Game-Loop, Best-of-5-Rundensteuerung
  player.js       Bewegung (inkl. Doppelsprung/Slide/Dash), Pointer-Lock, Kollision, Gesundheit
  weapons.js      14-Waffen-Katalog mit Tier-Stufen, Schuss-/Nahkampf-/Utility-Logik, ADS, Recoil
  bots.js         Gegner-KI: Teams, Sichtlinie (inkl. Rauch), Munition, Schwierigkeit, Modelle
  maps.js         6 Arena-Definitionen, Kachel-Textur, Kollision, Sichtlinie, Bodenmarkierungen
  ui.js           Alle Menü-/HUD-Screens (Hauptmenü, Loadout, Modus-Auswahl, HUD, Match-Ende)
  effects.js      Partikel (Lande-/Sprint-/Dash-Staub)
  postfx.js       Post-Processing: Bloom, Chromatic Aberration, Screen-Shake
  audio.js        Prozedural erzeugte Soundeffekte (Web Audio API, keine Dateien)
  save.js         localStorage-Schema (eine JSON-Struktur für alles Folgende)
  progression.js  XP/Level-Kurve, Fragmente, Unlock-Katalog, Rang-/SR-System, Bestenliste
  challenges.js   Auftrags-Pool, aktive Aufträge, Fortschritt, Belohnung
  loadout.js      Aktuelle Waffen-/Tier-Auswahl, Freischalt-Abfragen
```

## Anpassen

Waffenwerte und Tier-Stufen stehen im `WEAPON_CATALOG` in [`js/weapons.js`](js/weapons.js). Der
Unlock-Katalog (Level/Preis pro Waffe) steht in [`js/progression.js`](js/progression.js) —
Tier-Unlocks werden daraus automatisch aus `WEAPON_CATALOG` abgeleitet. Der Rang-Ladder steht dort
in `RANKS`. Auftrags-Vorlagen im `AUFTRAG_POOL` in [`js/challenges.js`](js/challenges.js).
Bot-Verhalten und Schwierigkeitsgrade in [`js/bots.js`](js/bots.js) (`DIFFICULTY_PRESETS`).
Spielmodi in der `MODES`-Liste in [`js/main.js`](js/main.js). Neue Maps lassen sich in
[`js/maps.js`](js/maps.js) als weiterer Eintrag im `MAPS`-Array ergänzen.
