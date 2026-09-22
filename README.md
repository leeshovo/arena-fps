# Arena FPS

Ein vollständiger Low-Poly Arcade-Shooter im Browser: 8 Spielmodi, 14 Waffen mit 5 Skins,
Team-Bots mit wählbarer Schwierigkeit, ein XP-/Level-/Währungs-System mit Loadout-Freischaltungen
und rotierenden Challenges — alles clientseitig, ohne Backend.

**Spielen: https://leeshovo.github.io/arena-fps/**

Gebaut mit [Three.js](https://threejs.org/) (r160) über eine Import-Map direkt vom CDN geladen —
kein Build-Schritt, keine externen 3D-/Audio-Dateien. Alle Geometrie besteht aus Primitives, alle
Sounds werden zur Laufzeit per Web Audio API synthetisiert.

**Optik:** helle, sterile Chunky-Low-Poly-Arenen mit prozeduralem Kachelraster, weichen Kontakt-
schatten, Bloom und kurzer Chromatic Aberration/Screen-Shake bei Treffern. Dunkle Waffen-Viewmodels
mit pulsierendem Energie-Riss-Overlay, humanoide Team-Bots, Landestaub/Sprintstaub-Partikel und
farbige Paintball-Treffer-Decals — angelehnt an den Rivals-Look.

## Steuerung

| Taste | Aktion |
| --- | --- |
| W A S D | Bewegen |
| Maus | Umsehen (Pointer Lock) |
| Leertaste | Springen |
| Shift | Sprinten |
| Strg / C | Slide (im Sprint) — + Sprung = **Slide-Jump** für Extra-Speed |
| Linksklick | Schießen (halten für Automatikfeuer) |
| Rechtsklick | Waffen-Fähigkeit (ADS/Fächerschuss/Heavy-Backstab/Subspace-Pad — je nach Waffe) |
| 1 – 4 / Mausrad | Waffe wechseln |
| R | Nachladen |
| F | Nahkampf (Quick-Melee, unabhängig vom Slot) |
| G | Utility (Wurfladung/Rauch/Heilung — je nach Loadout) |
| M | Match jederzeit verlassen |

## Menü-Navigation

**Hauptmenü** (Level, XP-Balken, Währung, 4 aktive Challenges) → **Loadout** (Waffen/Skins wählen
oder freischalten) → **Modus & Map** (Spielmodus, Schwierigkeit, Karte) → **Match** → **Rundenende**
(Scoreboard + XP/Währung/Unlocks) → zurück zum Hauptmenü. „Spielen“ im Hauptmenü überspringt den
Loadout-Screen und nutzt das zuletzt gewählte Loadout.

## Spielmodi

- **Duell:** 1v1 gegen einen Bot. Erster auf 5 Eliminationen gewinnt sofort.
- **Team-Deathmatch:** 3v3 — du und 2 Bot-Verbündete (blaues Team) gegen ein feindliches Bot-Team
  (rot). Bots bekämpfen sich dabei auch gegenseitig, nicht nur dich. Erstes Team auf 30 gewinnt.
  Schädigst du einen Bot kurz bevor ihn ein Verbündeter eliminiert, zählt das als **Assist**.
- **Training:** kein Zeitlimit, jederzeit mit `M` verlassen — zum Ausprobieren neuer Waffen/Skins.
- **Free-for-All:** klassisches Free-for-All gegen 4 Bots, 90 Sekunden.
- **Gun Game:** jede Elimination schaltet die nächste Waffe frei (Waffenwechsel gesperrt), Sieg bei
  Elimination mit der letzten Waffe (Utility).
- **Juggernaut:** 400 HP, 15 % langsamer, gegen die volle Bot-Übermacht.
- **Swift Standoff:** 1 HP für alle — jeder Treffer eliminiert sofort.
- **Chicken Game:** Rotlicht/Grünlicht — bei Rot friert alles ein (Bots pausieren), Bewegung/Schuss/
  Zielen = Sofort-Aus.

Zusätzlich vor jeder Runde wählbar: **Schwierigkeit** (Leicht/Normal/Schwer) — steuert Zielgenauigkeit,
Feuerrate, Sichtweite und Reaktionszeit der Bots.

**Nicht nachgebaut** (brauchen echtes Multiplayer/Accounts): Ranked, Party/Matchmaking, Head Honcho,
Zombie Tower, Spleef, Hardcore Parkour und weitere Rivals-Modi, die auf echten Mitspielern basieren.

## Waffenroster (14 Waffen + 5 Skins)

| Slot | Waffen |
| --- | --- |
| Primär (6) | Sturmgewehr, SMG, Marksman Rifle (DMR), Schrotflinte (8 Pellets), LMG, Burst-Gewehr (3er-Burst) |
| Sekundär (3) | Pistole (Fächerschuss), Wuchtrevolver (ADS), Maschinenpistole (Fächerschuss) |
| Nahkampf (2) | Nahkampfmesser (Heavy-Backstab), Kampfaxt (Heavy ohne Backstab-Bonus, mehr Flächenschaden) |
| Utility (3) | Wurfladung (Explosion + Subspace-Pad), Rauchgranate (blockiert Bot-Sichtlinie), Med-Kit (Selbstheilung) |

Jede Primärwaffe hat eigene Feuerrate/Schaden/Magazingröße/Streuung/Reichweite und einen eigenen
Move-Speed-Modifier. Skins (Standard, Gletscher, Inferno, Neon-Violett, Gold) überfärben Grundfarbe
und Energie-Risse jeder ausgerüsteten Waffe unabhängig voneinander.

## Movement-Techs

- **Slide-Jump:** Im Sprint Strg/C — kurzer Speed-Burst, geduckte Sicht, kleinere Hitbox. Springen
  währenddessen trägt den Schwung in die Luft.
- **Grenade-Boost:** Die Wurfladung wirkt einen echten Rückstoß-Impuls — nah genug dran katapultiert
  sie einen nach oben/hinten (kostet aber HP).
- **Subspace-Jump:** Rechtsklick mit Wurfladung legt ein Pad ab, das schadenfrei nach oben katapultiert.
- **Triple-Jump:** Leichte Waffen (SMG, Burst-Gewehr, Pistole, Maschinenpistole, Messer) geben beim
  Wechsel in der Luft einen Extra-Sprung — 1↔2 wechseln kettet zwei davon zum vollen Triple-Jump.

## Progression & Loadout

- **XP & Level:** Eliminations, Kopfschüsse, Backstabs, Utility-Kills, Nahkampf-Kills, Assists und
  Rundensiege füllen aktive Challenges; jede Runde gibt zusätzlich Basis-XP/-Währung (mehr bei Sieg).
- **Währung:** unabhängig vom Level verdient, schaltet Items **vorzeitig** frei (Level-Anforderung
  wird dabei übersprungen).
- **Challenges:** 4 gleichzeitig aktiv, zufällig aus einem Pool von 11 Vorlagen. Abschluss gibt einen
  XP-/Währungs-Bonus und wird sofort durch eine neue Challenge ersetzt.
- **Loadout-Screen:** pro Slot alle Waffen + Skins mit Freischalt-Status (Level oder Preis), Klick auf
  ein gesperrtes Item versucht den Kauf.
- **Speicherung:** Level, XP, Währung, Freischaltungen, aktuelles Loadout und Challenges liegen
  komplett in `localStorage` (`arenafps_save_v1`) — bleiben über Sessions hinweg erhalten.

## Bots

Patrouillieren zwischen Wegpunkten, erkennen Ziele nur per Sichtlinien-Raycast (kein Wallhack, auch
durch Rauch blockiert), verfolgen und schießen mit begrenztem Magazin (laden bei leer nach), suchen
bei niedriger HP Deckung, weichen nach einem Treffer kurz reaktiv aus und respawnen nach Verzögerung.
Im Team-Modus bekämpfen sich gegnerische Bots auch untereinander, nicht nur den Spieler.

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
style.css         Aussehen von HUD, Menüs, Loadout, Modus-Auswahl
js/
  main.js         Einstieg: Rendering/Post-FX-Setup, Input, Game-Loop, Menü-Navigation, Modi
  player.js       Bewegung, Pointer-Lock-Maussteuerung, Kollision, Head-Bobbing, Gesundheit
  weapons.js      14-Waffen-Katalog, Loadout-Aufbau, Schuss-/Nahkampf-/Utility-Logik, Skins
  bots.js         Gegner-KI: Teams, Sichtlinie (inkl. Rauch), Munition, Schwierigkeit, Modelle
  maps.js         3 Arena-Definitionen, Kachel-Textur, Kollision, Sichtlinie, Bodenmarkierungen
  ui.js           Alle Menü-/HUD-Screens (Hauptmenü, Loadout, Modus-Auswahl, HUD, Rundenende)
  effects.js       Partikel (Lande-/Sprintstaub)
  postfx.js       Post-Processing: Bloom, Chromatic Aberration, Screen-Shake
  audio.js        Prozedural erzeugte Soundeffekte (Web Audio API, keine Dateien)
  save.js         localStorage-Schema (eine JSON-Struktur für alles Folgende)
  progression.js  XP/Level-Kurve, Währung, Unlock-Katalog
  challenges.js   Challenge-Pool, aktive Challenges, Fortschritt, Belohnung
  loadout.js      Aktuelle Waffen-/Skin-Auswahl, Freischalt-Abfragen
```

## Anpassen

Waffenwerte stehen im `WEAPON_CATALOG` in [`js/weapons.js`](js/weapons.js), Skins in
`SKIN_PALETTES`. Der Unlock-Katalog (Level/Preis pro Item) steht in `UNLOCK_CATALOG` in
[`js/progression.js`](js/progression.js), die Challenge-Vorlagen im `CHALLENGE_POOL` in
[`js/challenges.js`](js/challenges.js). Bot-Verhalten und Schwierigkeitsgrade in
[`js/bots.js`](js/bots.js) (`DIFFICULTY_PRESETS`). Spielmodi in der `MODES`-Liste in
[`js/main.js`](js/main.js). Neue Maps lassen sich in [`js/maps.js`](js/maps.js) als weiterer
Eintrag im `MAPS`-Array ergänzen.
