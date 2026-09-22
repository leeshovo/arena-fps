# Arena FPS

Ein schneller Low-Poly Arcade-Shooter im Browser: 3 Arenen, 4 Waffenslots, patrouillierende und
schießende Bots, 90-Sekunden-Runden mit Scoreboard.

**Spielen: https://leeshovo.github.io/arena-fps/**

Gebaut mit [Three.js](https://threejs.org/) (r160) über eine Import-Map direkt vom CDN geladen —
kein Build-Schritt, keine externen 3D-Modelle, alles aus Primitives (Box/Plane/Zylinder) und Farben.

## Steuerung

| Taste | Aktion |
| --- | --- |
| W A S D | Bewegen |
| Maus | Umsehen (Pointer Lock) |
| Leertaste | Springen |
| Shift | Sprinten |
| Linksklick | Schießen (halten für Automatikfeuer) |
| 1 – 4 / Mausrad | Waffe wechseln (Sturmgewehr, Pistole, Messer, Wurfladung) |
| R | Nachladen |
| F | Nahkampf |
| G | Utility (Wurfladung) |

## Spielprinzip

- **Waffen:** Sturmgewehr und Pistole mit Magazin, Nachladen, Streuung, Rückstoß, Distanz-Schadensfalloff
  und Kopfschuss-Multiplikator. Dazu ein Nahkampfmesser (Cooldown, einmaliger Treffer) und eine Wurfladung
  mit Flugbahn, Explosionsradius und Schaden an Spieler *und* Bots (auch Eigenschaden).
- **Bots:** 4 Gegner pro Runde. Patrouillieren zwischen Wegpunkten, erkennen den Spieler nur per
  Sichtlinien-Raycast (kein Wallhack), verfolgen und schießen dann bewusst ungenau, suchen bei niedriger
  HP Deckung und respawnen nach kurzer Verzögerung.
- **Runden:** 90 Sekunden Zeitlimit, Live-Score im HUD, danach Scoreboard mit „Neue Runde“.
- **Maps:** Offene Arena (weite Sichtlinien), Deckungshof (Kisten & niedrige Mauern) und Korridore
  (enge Gänge mit mehreren Kreuzungen) — Auswahl über ein Menü vor Rundenstart.

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

Danach `http://localhost:3000` (serve) bzw. `http://localhost:8000` (Python) öffnen. Pointer Lock (Mauslook)
funktioniert nur in einem echten Browser-Tab, nicht in eingebetteten Vorschau-Frames.

## Projektstruktur

```
index.html      Grundgerüst, Import-Map, HUD-Markup
style.css       Aussehen von HUD und Menüs
js/
  main.js       Einstieg: Rendering-Setup, Input-Handling, Game-Loop, Rundensteuerung
  player.js     Bewegung, Pointer-Lock-Maussteuerung, Kollision, Head-Bobbing, Gesundheit
  weapons.js    4 Waffenslots, Schuss-Raycasting, Nachladen, Nahkampf, Utility-Wurf, Effekte
  bots.js       Gegner-KI: Patrouille, Sichtlinie, Verfolgung, Deckung, Respawn
  maps.js       3 Arena-Definitionen, Kollisions- und Sichtlinien-Hilfsfunktionen
  ui.js         HUD, Menüs, Kill-Feed, Treffer-/Schadens-Feedback
```

## Anpassen

Waffenwerte (Schaden, Feuerrate, Magazingröße, Streuung, Reichweite) stehen in `WEAPON_DEFS` in
[`js/weapons.js`](js/weapons.js). Bot-Verhalten (Sichtweite, Genauigkeit, Deckungsschwelle) in den
Konstanten am Anfang von [`js/bots.js`](js/bots.js). Neue Maps lassen sich in [`js/maps.js`](js/maps.js)
als weiterer Eintrag im `MAPS`-Array ergänzen (Wände, Spawnpunkte, Patrouillenrouten, Deckungspunkte).
