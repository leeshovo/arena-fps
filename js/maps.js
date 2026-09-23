// maps.js — 6 Arena-Definitionen, Geometrie-Erzeugung und Kollisions-/Sichtlinien-Hilfsfunktionen.
import * as THREE from "three";

const WALL_HEIGHT_TALL = 4.5;
const WALL_HEIGHT_LOW = 1.3;
const BOUNDARY_HEIGHT = 5;

// ---------------------------------------------------------------------------
// Optik: helles, steriles Fliesen-/Gitterraster für Wände & Boden (rein visuell)
// ---------------------------------------------------------------------------
const GRID_CELL_SIZE = 2.2;
const WALL_LIGHTEN = 0.55; // Wände deutlich Richtung Weiß aufhellen, Akzent bleibt nur als Tönung

let _gridCanvas = null;
function getGridCanvas() {
  if (_gridCanvas) return _gridCanvas;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  // leicht erhabene Fliesenkante: helle Innenfase + etwas dunklere Außenlinie
  ctx.strokeStyle = "#eef1f5";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, size - 6, size - 6);
  ctx.strokeStyle = "#c7cdd6";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  _gridCanvas = canvas;
  return canvas;
}

/** Prozedurale Fliesen-Textur (dient gleichzeitig als Diffuse- und Bump-Map). */
function makeGridTexture(repeatX, repeatY) {
  const tex = new THREE.CanvasTexture(getGridCanvas());
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(1, repeatX), Math.max(1, repeatY));
  return tex;
}

function lightenColor(hex, amount) {
  return new THREE.Color(hex).lerp(new THREE.Color(0xffffff), amount);
}

function box(x, y, z, w, h, d, color) {
  return { pos: [x, y, z], size: [w, h, d], color };
}

// Randmauern rund um ein rechteckiges Spielfeld, damit niemand die Arena verlassen kann.
function boundaryWalls(half, color, thickness = 1) {
  return [
    box(0, BOUNDARY_HEIGHT / 2, -half - thickness / 2, half * 2 + thickness * 2, BOUNDARY_HEIGHT, thickness, color),
    box(0, BOUNDARY_HEIGHT / 2, half + thickness / 2, half * 2 + thickness * 2, BOUNDARY_HEIGHT, thickness, color),
    box(-half - thickness / 2, BOUNDARY_HEIGHT / 2, 0, thickness, BOUNDARY_HEIGHT, half * 2, color),
    box(half + thickness / 2, BOUNDARY_HEIGHT / 2, 0, thickness, BOUNDARY_HEIGHT, half * 2, color),
  ];
}

// ---------------------------------------------------------------------------
// MAP 1: Offene helle Arena — weite Sichtlinien, wenige hohe Deckungen
// ---------------------------------------------------------------------------
const arenaHalf1 = 26;
const map1 = {
  id: "arena",
  name: "Offene Arena",
  description: "Weite Sichtlinien, wenige hohe Deckungen",
  difficulty: "easy",
  accent: 0x4fd1ff,
  groundColor: 0xe8ecf1,
  groundHalf: arenaHalf1,
  skyColor: 0xcfe8ff,
  fogColor: 0xcfe8ff,
  fogNear: 40,
  fogFar: 95,
  walls: [
    ...boundaryWalls(arenaHalf1, 0x9fb4c9),
    box(8, WALL_HEIGHT_TALL / 2, 6, 3, WALL_HEIGHT_TALL, 3, 0x4fd1ff),
    box(-9, WALL_HEIGHT_TALL / 2, -5, 3, WALL_HEIGHT_TALL, 3, 0x4fd1ff),
    box(0, WALL_HEIGHT_TALL / 2, 0, 3.2, WALL_HEIGHT_TALL, 3.2, 0xff6b4a),
    box(14, WALL_HEIGHT_TALL / 2, -12, 3, WALL_HEIGHT_TALL, 3, 0x4fd1ff),
    box(-14, WALL_HEIGHT_TALL / 2, 12, 3, WALL_HEIGHT_TALL, 3, 0x4fd1ff),
    box(-16, WALL_HEIGHT_TALL / 2, -14, 3, WALL_HEIGHT_TALL, 3, 0x4fd1ff),
    box(16, WALL_HEIGHT_TALL / 2, 15, 3, WALL_HEIGHT_TALL, 3, 0x4fd1ff),
  ],
  spawnPoints: [
    [20, 0, 20], [-20, 0, 20], [20, 0, -20], [-20, 0, -20],
    [0, 0, 22], [0, 0, -22], [22, 0, 0], [-22, 0, 0],
  ],
  patrolPoints: [
    [18, 0, 18], [8, 0, 14], [-8, 0, 16], [-18, 0, 18],
    [-18, 0, -18], [-6, 0, -14], [8, 0, -16], [18, 0, -18],
  ],
  coverSpots: [
    [8, 0, 9], [8, 0, 3], [-9, 0, -2], [-9, 0, -8],
    [3, 0, 3], [-3, 0, -3], [14, 0, -9], [-14, 0, 9],
  ],
};

// ---------------------------------------------------------------------------
// MAP 2: Stillwerk — liminaler, leerer Innenraum. Acht identische, nach innen offene
// Raum-Module um eine leere Mitte, gelbliches Licht, surreale Endlos-Stimmung.
// ---------------------------------------------------------------------------
function stillwerkModules(color) {
  const walls = [];
  const h = WALL_HEIGHT_TALL;
  const ring = 15.5;
  const half = 3.5;
  const positions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ];
  for (const [gx, gz] of positions) {
    const cx = gx * ring;
    const cz = gz * ring;
    if (gx === 0) {
      // Nord/Süd-Modul: Rückwand auf der zentrumsfernen Seite, offen Richtung Mitte
      walls.push(box(cx, h / 2, cz + gz * half, 7, h, 0.4, color));
      walls.push(box(cx - half, h / 2, cz, 0.4, h, 7, color));
      walls.push(box(cx + half, h / 2, cz, 0.4, h, 7, color));
    } else if (gz === 0) {
      // Ost/West-Modul: Rückwand auf der zentrumsfernen Seite, offen Richtung Mitte
      walls.push(box(cx + gx * half, h / 2, cz, 0.4, h, 7, color));
      walls.push(box(cx, h / 2, cz - half, 7, h, 0.4, color));
      walls.push(box(cx, h / 2, cz + half, 7, h, 0.4, color));
    } else {
      // Eck-Modul: L-Form aus zwei zentrumsfernen Wänden, offen Richtung Mitte
      walls.push(box(cx, h / 2, cz + gz * half, 7, h, 0.4, color));
      walls.push(box(cx + gx * half, h / 2, cz, 0.4, h, 7, color));
    }
  }
  return walls;
}
const arenaHalf2 = 24;
const map2 = {
  id: "stillwerk",
  name: "Stillwerk",
  description: "Endlose, identische Räume — gelbliches Licht, unheimliche Stille",
  difficulty: "medium",
  accent: 0xd9c24f,
  groundColor: 0xe4dcc0,
  groundHalf: arenaHalf2,
  skyColor: 0xcdbf8f,
  fogColor: 0xcdbf8f,
  fogNear: 20,
  fogFar: 55,
  walls: [
    ...boundaryWalls(arenaHalf2, 0xb8ac7c),
    ...stillwerkModules(0xd9c24f),
    box(0, WALL_HEIGHT_LOW / 2, 0, 2, WALL_HEIGHT_LOW, 2, 0xd9c24f),
  ],
  spawnPoints: [
    [21, 0, 21], [-21, 0, 21], [21, 0, -21], [-21, 0, -21],
    [7, 0, 21], [-7, 0, -21], [21, 0, 7], [-21, 0, -7],
  ],
  patrolPoints: [
    [7.75, 0, 15.5], [15.5, 0, 7.75], [15.5, 0, -7.75], [7.75, 0, -15.5],
    [-7.75, 0, -15.5], [-15.5, 0, -7.75], [-15.5, 0, 7.75], [-7.75, 0, 15.5],
  ],
  coverSpots: [
    [5, 0, 15.5], [15.5, 0, 5], [15.5, 0, -5], [5, 0, -15.5],
    [-5, 0, -15.5], [-15.5, 0, -5], [-15.5, 0, 5], [-5, 0, 15.5],
  ],
};

// ---------------------------------------------------------------------------
// MAP 3: Hochsteg — lange Überführung mit Wasser darunter, wenig seitliche Deckung.
// Niedrige Geländer statt hoher Randmauern an den Längsseiten für offene Sichtlinien.
// ---------------------------------------------------------------------------
const bridgeHalfX = 9;
const bridgeHalfZ = 27;
const map3 = {
  id: "hochsteg",
  name: "Hochsteg",
  description: "Lange Überführung über Wasser, wenig seitliche Deckung",
  difficulty: "hard",
  accent: 0x4fd1ff,
  groundColor: 0x8fa9c4,
  groundHalf: bridgeHalfZ,
  skyColor: 0xaecbe0,
  fogColor: 0xaecbe0,
  fogNear: 30,
  fogFar: 80,
  walls: [
    box(0, BOUNDARY_HEIGHT / 2, -bridgeHalfZ - 0.5, bridgeHalfX * 2 + 2, BOUNDARY_HEIGHT, 1, 0x6f88a3),
    box(0, BOUNDARY_HEIGHT / 2, bridgeHalfZ + 0.5, bridgeHalfX * 2 + 2, BOUNDARY_HEIGHT, 1, 0x6f88a3),
    box(-bridgeHalfX - 0.4, WALL_HEIGHT_LOW / 2, 0, 0.8, WALL_HEIGHT_LOW, bridgeHalfZ * 2, 0x9fb4c9),
    box(bridgeHalfX + 0.4, WALL_HEIGHT_LOW / 2, 0, 0.8, WALL_HEIGHT_LOW, bridgeHalfZ * 2, 0x9fb4c9),
    box(-5, WALL_HEIGHT_TALL / 2, -15, 1.6, WALL_HEIGHT_TALL, 1.6, 0x4fd1ff),
    box(5, WALL_HEIGHT_TALL / 2, -15, 1.6, WALL_HEIGHT_TALL, 1.6, 0x4fd1ff),
    box(-5, WALL_HEIGHT_TALL / 2, 0, 1.6, WALL_HEIGHT_TALL, 1.6, 0x4fd1ff),
    box(5, WALL_HEIGHT_TALL / 2, 0, 1.6, WALL_HEIGHT_TALL, 1.6, 0x4fd1ff),
    box(-5, WALL_HEIGHT_TALL / 2, 15, 1.6, WALL_HEIGHT_TALL, 1.6, 0x4fd1ff),
    box(5, WALL_HEIGHT_TALL / 2, 15, 1.6, WALL_HEIGHT_TALL, 1.6, 0x4fd1ff),
  ],
  spawnPoints: [
    [-3, 0, -24], [3, 0, -24], [-3, 0, 24], [3, 0, 24],
    [-6, 0, -24], [6, 0, 24], [0, 0, -24], [0, 0, 24],
  ],
  patrolPoints: [
    [0, 0, -20], [0, 0, -10], [0, 0, 0], [0, 0, 10],
    [0, 0, 20], [4, 0, -7], [-4, 0, 7], [0, 0, -15],
  ],
  coverSpots: [
    [-5, 0, -17], [5, 0, -17], [-5, 0, -2], [5, 0, -2],
    [-5, 0, 13], [5, 0, 13], [-5, 0, 2], [5, 0, 2],
  ],
};

// ---------------------------------------------------------------------------
// MAP 4: Nebelfeld — Friedhof/Waldrand bei Nacht, dichter Nebel, enge Sichtlinien.
// ---------------------------------------------------------------------------
const graveSpots = [
  [-14, -9], [-11, -6], [-8, -11], [-5, -4], [-2, -8], [3, -6], [7, -10], [11, -5],
  [14, -8], [-13, 6], [-9, 9], [-4, 5], [2, 9], [6, 6], [10, 10], [13, 4],
];
const treeSpots = [
  [-17, 2], [-6, 13], [8, -15], [16, 9], [-15, -15], [15, -3], [0, 15], [-2, -16],
];
function nebelfeldWalls(graveColor, treeColor) {
  const walls = [];
  for (const [x, z] of graveSpots) walls.push(box(x, 0.6, z, 0.55, 1.2, 0.16, graveColor));
  for (const [x, z] of treeSpots) walls.push(box(x, 2.6, z, 0.45, 5.2, 0.45, treeColor));
  return walls;
}
const arenaHalf4 = 22;
const map4 = {
  id: "nebelfeld",
  name: "Nebelfeld",
  description: "Nächtlicher Friedhof am Waldrand, dichter Nebel",
  difficulty: "hard",
  accent: 0x9fe6b0,
  groundColor: 0x2c332b,
  groundHalf: arenaHalf4,
  skyColor: 0x171d1a,
  fogColor: 0x171d1a,
  fogNear: 9,
  fogFar: 30,
  walls: [
    ...boundaryWalls(arenaHalf4, 0x232a22),
    ...nebelfeldWalls(0x51584e, 0x2f2a22),
  ],
  spawnPoints: [
    [18, 0, 18], [-18, 0, 18], [18, 0, -18], [-18, 0, -18],
    [0, 0, 19], [0, 0, -19], [19, 0, 0], [-19, 0, 0],
  ],
  patrolPoints: [
    [14, 0, 12], [4, 0, 14], [-6, 0, 10], [-14, 0, 14],
    [-14, 0, -12], [-4, 0, -12], [6, 0, -14], [14, 0, -12],
  ],
  coverSpots: [
    [-6.5, 0, -11], [8.5, 0, -10], [-0.5, 0, -8], [4.5, 0, -6],
    [-7.5, 0, 9], [3.5, 0, 9], [12.5, 0, -5], [-11.5, 0, 6],
  ],
};

// ---------------------------------------------------------------------------
// MAP 5: Hinterhof — Spielplatz/Hinterhof, Kisten & Holzzäune, verwinkelt.
// ---------------------------------------------------------------------------
const arenaHalf5 = 21;
const map5 = {
  id: "hinterhof",
  name: "Hinterhof",
  description: "Kisten, Zäune, viele kleine Deckungsobjekte",
  difficulty: "medium",
  accent: 0xff8a3d,
  groundColor: 0xe6dcc4,
  groundHalf: arenaHalf5,
  skyColor: 0xbfe2ff,
  fogColor: 0xbfe2ff,
  fogNear: 32,
  fogFar: 78,
  walls: [
    ...boundaryWalls(arenaHalf5, 0xc9a86a),
    // Kisten-Cluster
    box(6, 0.8, 6, 1.6, 1.6, 1.6, 0xff8a3d),
    box(8.4, 0.8, 6, 1.6, 1.6, 1.6, 0xffc26b),
    box(6, 0.8, 8.4, 1.6, 1.6, 1.6, 0xffc26b),
    box(-7, 0.8, -7, 1.6, 1.6, 1.6, 0xff8a3d),
    box(-9.4, 0.8, -7, 1.6, 1.6, 1.6, 0xffc26b),
    box(-7, 0.8, -9.4, 1.6, 1.6, 1.6, 0xffc26b),
    // Zaun-Linien (Holzzäune, niedrig, mit Lücken für Wege)
    box(-2, WALL_HEIGHT_LOW * 0.6, 3, 6, WALL_HEIGHT_LOW * 1.2, 0.3, 0x9c7a4a),
    box(6, WALL_HEIGHT_LOW * 0.6, -1, 0.3, WALL_HEIGHT_LOW * 1.2, 7, 0x9c7a4a),
    box(-6, WALL_HEIGHT_LOW * 0.6, 1, 0.3, WALL_HEIGHT_LOW * 1.2, 7, 0x9c7a4a),
    box(2, WALL_HEIGHT_LOW * 0.6, -4, 6, WALL_HEIGHT_LOW * 1.2, 0.3, 0x9c7a4a),
    // Ecktürmchen als hohe Deckung
    box(15, WALL_HEIGHT_TALL / 2, 15, 2.4, WALL_HEIGHT_TALL, 2.4, 0xff8a3d),
    box(-15, WALL_HEIGHT_TALL / 2, 15, 2.4, WALL_HEIGHT_TALL, 2.4, 0xff8a3d),
    box(15, WALL_HEIGHT_TALL / 2, -15, 2.4, WALL_HEIGHT_TALL, 2.4, 0xff8a3d),
    box(-15, WALL_HEIGHT_TALL / 2, -15, 2.4, WALL_HEIGHT_TALL, 2.4, 0xff8a3d),
  ],
  spawnPoints: [
    [18, 0, 18], [-18, 0, 18], [18, 0, -18], [-18, 0, -18],
    [0, 0, 18], [0, 0, -18], [18, 0, 0], [-18, 0, 0],
  ],
  patrolPoints: [
    [12, 0, 8], [3, 0, 9], [-4, 0, 7], [-12, 0, 9],
    [-12, 0, -8], [-3, 0, -8], [4, 0, -9], [12, 0, -8],
  ],
  coverSpots: [
    [6, 0, 3.5], [9, 0, 8], [-7, 0, -3.5], [-12, 0, -9],
    [0, 0, 6], [0, 0, -6], [11, 0, -2], [-11, 0, 2],
  ],
};

// ---------------------------------------------------------------------------
// MAP 6: Kranhafen — Docks/Industrie, Container gemischt mit offenen Bereichen.
// ---------------------------------------------------------------------------
const arenaHalf6 = 26;
const containerSpots = [
  [8, -10, 4.5, 2.2, 2.2, 0x4fd1ff], [10.2, -10, 4.5, 2.2, 2.2, 0xff6b4a],
  [8, -6.5, 4.5, 2.2, 2.2, 0xffd24f], [-9, 9, 4.5, 2.2, 2.2, 0xff6b4a],
  [-11.2, 9, 4.5, 2.2, 2.2, 0x4fd1ff], [-9, 12.5, 4.5, 2.2, 2.2, 0x9fe6b0],
  [-13, -12, 4.5, 2.2, 2.2, 0xffd24f], [13, 12, 4.5, 2.2, 2.2, 0x4fd1ff],
];
function kranhafenWalls() {
  const walls = [];
  for (const [x, z, len, h, d, color] of containerSpots) walls.push(box(x, h / 2, z, len, h, d, color));
  // Kran-Silhouette (rein dekorativ, weit oberhalb der Spielhöhe)
  walls.push(box(-18, 4.5, -18, 0.6, 9, 0.6, 0xc9852a));
  walls.push(box(-14, 8.6, -18, 8, 0.5, 0.5, 0xc9852a));
  walls.push(box(17, 4.5, 17, 0.6, 9, 0.6, 0xc9852a));
  walls.push(box(13, 8.6, 17, 8, 0.5, 0.5, 0xc9852a));
  return walls;
}
const map6 = {
  id: "kranhafen",
  name: "Kranhafen",
  description: "Container-Yard mit offenen und engen Bereichen",
  difficulty: "medium",
  accent: 0xffb020,
  groundColor: 0xc7ccd2,
  groundHalf: arenaHalf6,
  skyColor: 0xc3cdd6,
  fogColor: 0xc3cdd6,
  fogNear: 34,
  fogFar: 82,
  walls: [
    ...boundaryWalls(arenaHalf6, 0x9aa3ad),
    ...kranhafenWalls(),
  ],
  spawnPoints: [
    [21, 0, 21], [-21, 0, 21], [21, 0, -21], [-21, 0, -21],
    [0, 0, 22], [0, 0, -22], [22, 0, 0], [-22, 0, 0],
  ],
  patrolPoints: [
    [16, 0, 14], [6, 0, 16], [-4, 0, 14], [-16, 0, 16],
    [-16, 0, -14], [-6, 0, -14], [8, 0, -16], [16, 0, -14],
  ],
  coverSpots: [
    [8, 0, 7], [9, 0, 3], [-6, 0, 9], [-6, 0, 13],
    [-16, 0, -11], [-1, 0, -2], [10, 0, 9], [4, 0, -6],
  ],
};

export const MAPS = [map1, map2, map3, map4, map5, map6];

// ---------------------------------------------------------------------------
// Geometrie-Aufbau
// ---------------------------------------------------------------------------

/**
 * Baut die Map-Geometrie in die Szene und liefert alle für Gameplay/KI
 * benötigten Referenzen zurück.
 */
export function buildMap(scene, mapDef) {
  const group = new THREE.Group();
  group.name = `map-${mapDef.id}`;

  const groundSize = mapDef.groundHalf * 2;
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
  const groundTex = makeGridTexture(groundSize / GRID_CELL_SIZE, groundSize / GRID_CELL_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({
    color: lightenColor(mapDef.groundColor, 0.25),
    map: groundTex,
    bumpMap: groundTex,
    bumpScale: 0.02,
    roughness: 1,
    metalness: 0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  group.add(ground);

  const wallMeshes = [];
  const wallBoxes = [];

  for (const w of mapDef.walls) {
    const geo = new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]);
    const wallTex = makeGridTexture(w.size[0] / GRID_CELL_SIZE, w.size[1] / GRID_CELL_SIZE);
    const mat = new THREE.MeshStandardMaterial({
      color: lightenColor(w.color, WALL_LIGHTEN),
      map: wallTex,
      bumpMap: wallTex,
      bumpScale: 0.018,
      roughness: 0.95,
      metalness: 0.02,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(w.pos[0], w.pos[1], w.pos[2]);
    mesh.userData.isWall = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    wallMeshes.push(mesh);

    const box3 = new THREE.Box3().setFromObject(mesh);
    wallBoxes.push(box3);
  }

  // Bodenmarkierungen: dezente Ringe an den Spawnpunkten zur Orientierung
  const markerMat = new THREE.MeshBasicMaterial({ color: mapDef.accent, transparent: true, opacity: 0.35, depthWrite: false });
  for (const sp of mapDef.spawnPoints) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 6), markerMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(sp[0], 0.02, sp[2]);
    group.add(ring);
  }
  // Mittelmarkierung
  const centerMark = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.55, 4), markerMat);
  centerMark.rotation.x = -Math.PI / 2;
  centerMark.rotation.z = Math.PI / 4;
  centerMark.position.set(0, 0.02, 0);
  group.add(centerMark);

  // Kleine Ambient-Deko: ein paar langsam rotierende Akzent-Kristalle
  const decorSpin = [];
  const decorPositions = mapDef.spawnPoints.filter((_, i) => i % 2 === 0);
  for (const dp of decorPositions) {
    const decoMat = new THREE.MeshStandardMaterial({ color: mapDef.accent, emissive: mapDef.accent, emissiveIntensity: 0.5, roughness: 0.4 });
    const deco = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), decoMat);
    deco.position.set(dp[0] * 0.85, 1.1, dp[2] * 0.85);
    deco.castShadow = true;
    group.add(deco);
    decorSpin.push(deco);
  }

  scene.add(group);
  scene.background = new THREE.Color(mapDef.skyColor);
  scene.fog = new THREE.Fog(mapDef.fogColor, mapDef.fogNear, mapDef.fogFar);

  const spawnPoints = mapDef.spawnPoints.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const patrolPoints = mapDef.patrolPoints.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const coverSpots = mapDef.coverSpots.map((p) => new THREE.Vector3(p[0], p[1], p[2]));

  return {
    group,
    ground,
    wallMeshes,
    wallBoxes,
    spawnPoints,
    patrolPoints,
    coverSpots,
    decorSpin,
    bounds: { half: mapDef.groundHalf - 1 },
    accent: mapDef.accent,
  };
}

/** Rotiert die Ambient-Deko-Objekte einer Map. Rein optisch, in der Game-Loop aufgerufen. */
export function updateMapDecor(mapData, dt) {
  if (!mapData || !mapData.decorSpin) return;
  for (const deco of mapData.decorSpin) {
    deco.rotation.y += dt * 0.6;
    deco.rotation.x += dt * 0.3;
    deco.position.y = 1.1 + Math.sin(performance.now() * 0.0008 + deco.id) * 0.08;
  }
}

/** Entfernt eine zuvor gebaute Map wieder aus der Szene. */
export function disposeMap(scene, mapData) {
  if (!mapData) return;
  scene.remove(mapData.group);
  mapData.group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose();
      if (obj.material.bumpMap && obj.material.bumpMap !== obj.material.map) obj.material.bumpMap.dispose();
      obj.material.dispose();
    }
  });
}

// ---------------------------------------------------------------------------
// Kollision (AABB, Achsen getrennt für sauberes Entlanggleiten an Wänden)
// ---------------------------------------------------------------------------

/** Prüft, ob ein zylindrischer Akteur (radius/height, feetY = Fußposition) mit einer Wand kollidiert. */
export function checkCollision(wallBoxes, x, z, feetY, height, radius) {
  for (let i = 0; i < wallBoxes.length; i++) {
    const b = wallBoxes[i];
    const overlapX = x + radius > b.min.x && x - radius < b.max.x;
    const overlapZ = z + radius > b.min.z && z - radius < b.max.z;
    const overlapY = feetY + height > b.min.y && feetY < b.max.y;
    if (overlapX && overlapZ && overlapY) return true;
  }
  return false;
}

/**
 * Bewegt eine Position um (dx, dz) und löst Kollisionen pro Achse auf,
 * sodass der Akteur an Wänden entlanggleitet statt hängen zu bleiben oder zu clippen.
 */
export function resolveMove(wallBoxes, position, dx, dz, feetY, height, radius) {
  let x = position.x;
  let z = position.z;

  const nx = x + dx;
  if (!checkCollision(wallBoxes, nx, z, feetY, height, radius)) {
    x = nx;
  }
  const nz = z + dz;
  if (!checkCollision(wallBoxes, x, nz, feetY, height, radius)) {
    z = nz;
  }
  return { x, z };
}

// ---------------------------------------------------------------------------
// Sichtlinie (für Bot-KI — "kein Wallhack")
// ---------------------------------------------------------------------------
const _losRaycaster = new THREE.Raycaster();

/** true = freie Sicht zwischen from und to (keine Wand dazwischen). */
export function hasLineOfSight(wallMeshes, from, to, maxDist = Infinity) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const dist = dir.length();
  if (dist < 0.05) return true;
  dir.normalize();
  _losRaycaster.set(from, dir);
  _losRaycaster.near = 0;
  _losRaycaster.far = Math.min(dist - 0.15, maxDist);
  if (_losRaycaster.far <= 0) return true;
  const hits = _losRaycaster.intersectObjects(wallMeshes, false);
  return hits.length === 0;
}

/** Liefert einen zufälligen Punkt innerhalb der Arena-Grenzen (mit Rand-Puffer). */
export function randomPointInBounds(bounds, margin = 3) {
  const half = bounds.half - margin;
  return new THREE.Vector3((Math.random() * 2 - 1) * half, 0, (Math.random() * 2 - 1) * half);
}
