// maps.js — Arena-Definitionen, Geometrie-Erzeugung und Kollisions-/Sichtlinien-Hilfsfunktionen.
import * as THREE from "three";

const WALL_HEIGHT_TALL = 4.5;
const WALL_HEIGHT_LOW = 1.3;
const BOUNDARY_HEIGHT = 5;

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
// MAP 1: Offene Arena mit ein paar hohen Blöcken als Sichtschutz
// ---------------------------------------------------------------------------
const arenaHalf1 = 26;
const map1 = {
  id: "arena",
  name: "Offene Arena",
  description: "Weite Sichtlinien, wenige hohe Deckungen",
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
// MAP 2: Mehr Deckungsobjekte (Kisten, niedrige Mauern) für taktisches Spiel
// ---------------------------------------------------------------------------
const arenaHalf2 = 24;
const map2 = {
  id: "coveryard",
  name: "Deckungshof",
  description: "Kisten & niedrige Mauern, taktischer",
  accent: 0xff6b4a,
  groundColor: 0xe3e7ec,
  groundHalf: arenaHalf2,
  skyColor: 0xdfe9f0,
  fogColor: 0xdfe9f0,
  fogNear: 35,
  fogFar: 85,
  walls: [
    ...boundaryWalls(arenaHalf2, 0x9fb4c9),
    // Kisten-Cluster
    box(6, 1, 6, 2, 2, 2, 0xff6b4a),
    box(9, 1, 6, 2, 2, 2, 0xffa066),
    box(6, 1, 9, 2, 2, 2, 0xffa066),
    box(-7, 1, -7, 2, 2, 2, 0xff6b4a),
    box(-10, 1, -7, 2, 2, 2, 0xffa066),
    box(-7, 1, -10, 2, 2, 2, 0xffa066),
    // Niedrige Mauern
    box(0, WALL_HEIGHT_LOW / 2, 4, 8, WALL_HEIGHT_LOW, 1, 0x4fd1ff),
    box(0, WALL_HEIGHT_LOW / 2, -4, 8, WALL_HEIGHT_LOW, 1, 0x4fd1ff),
    box(12, WALL_HEIGHT_LOW / 2, 0, 1, WALL_HEIGHT_LOW, 10, 0x4fd1ff),
    box(-12, WALL_HEIGHT_LOW / 2, 0, 1, WALL_HEIGHT_LOW, 10, 0x4fd1ff),
    // Ein paar hohe Blöcke als Sichtschutz an den Ecken
    box(16, WALL_HEIGHT_TALL / 2, 16, 3, WALL_HEIGHT_TALL, 3, 0xff6b4a),
    box(-16, WALL_HEIGHT_TALL / 2, 16, 3, WALL_HEIGHT_TALL, 3, 0xff6b4a),
    box(16, WALL_HEIGHT_TALL / 2, -16, 3, WALL_HEIGHT_TALL, 3, 0xff6b4a),
    box(-16, WALL_HEIGHT_TALL / 2, -16, 3, WALL_HEIGHT_TALL, 3, 0xff6b4a),
    box(0, WALL_HEIGHT_LOW / 2, 16, 6, WALL_HEIGHT_LOW, 1, 0x4fd1ff),
    box(0, WALL_HEIGHT_LOW / 2, -16, 6, WALL_HEIGHT_LOW, 1, 0x4fd1ff),
  ],
  spawnPoints: [
    [19, 0, 19], [-19, 0, 19], [19, 0, -19], [-19, 0, -19],
    [0, 0, 20], [0, 0, -20], [20, 0, 0], [-20, 0, 0],
  ],
  patrolPoints: [
    [16, 0, 10], [4, 0, 8], [-4, 0, 8], [-16, 0, 10],
    [-16, 0, -10], [-4, 0, -8], [4, 0, -8], [16, 0, -10],
  ],
  coverSpots: [
    [6, 0, 3.5], [9, 0, 3.5], [-7, 0, -4.5], [-10, 0, -4.5],
    [0, 0, 5.5], [0, 0, -5.5], [12, 0, 4], [-12, 0, -4],
  ],
};

// ---------------------------------------------------------------------------
// MAP 3: Enge Korridor-Map mit mehreren Wegen/Kreuzungen
// ---------------------------------------------------------------------------
const arenaHalf3 = 26;
const map3 = {
  id: "corridors",
  name: "Korridore",
  description: "Enge Gänge, viele Kreuzungen",
  accent: 0x6bff8e,
  groundColor: 0xdde2e8,
  groundHalf: arenaHalf3,
  skyColor: 0xc9d6e0,
  fogColor: 0xc9d6e0,
  fogNear: 22,
  fogFar: 60,
  walls: [
    ...boundaryWalls(arenaHalf3, 0x9fb4c9),
    // Äußerer Ring aus Korridor-Wänden
    box(-18, WALL_HEIGHT_TALL / 2, 0, 1, WALL_HEIGHT_TALL, 30, 0x6bff8e),
    box(18, WALL_HEIGHT_TALL / 2, 0, 1, WALL_HEIGHT_TALL, 30, 0x6bff8e),
    box(0, WALL_HEIGHT_TALL / 2, -18, 30, WALL_HEIGHT_TALL, 1, 0x6bff8e),
    box(0, WALL_HEIGHT_TALL / 2, 18, 30, WALL_HEIGHT_TALL, 1, 0x6bff8e),
    // Innere Kreuz-Struktur mit Lücken (Kreuzungen)
    box(-9, WALL_HEIGHT_TALL / 2, -9, 1, WALL_HEIGHT_TALL, 9, 0x9fe6b0),
    box(-9, WALL_HEIGHT_TALL / 2, 6, 1, WALL_HEIGHT_TALL, 9, 0x9fe6b0),
    box(9, WALL_HEIGHT_TALL / 2, -9, 1, WALL_HEIGHT_TALL, 9, 0x9fe6b0),
    box(9, WALL_HEIGHT_TALL / 2, 6, 1, WALL_HEIGHT_TALL, 9, 0x9fe6b0),
    box(-6, WALL_HEIGHT_TALL / 2, -9, 9, WALL_HEIGHT_TALL, 1, 0x9fe6b0),
    box(6, WALL_HEIGHT_TALL / 2, 9, 9, WALL_HEIGHT_TALL, 1, 0x9fe6b0),
    // Zentrale kleine Deckung an der mittleren Kreuzung
    box(0, 1, 0, 2, 2, 2, 0x6bff8e),
    // Ein paar zusätzliche Trennwände für mehr Wege
    box(-13, WALL_HEIGHT_TALL / 2, 13, 8, WALL_HEIGHT_TALL, 1, 0x9fe6b0),
    box(13, WALL_HEIGHT_TALL / 2, -13, 8, WALL_HEIGHT_TALL, 1, 0x9fe6b0),
  ],
  spawnPoints: [
    [-21, 0, -21], [21, 0, 21], [-21, 0, 21], [21, 0, -21],
    [0, 0, 0.1], [-21, 0, 0], [21, 0, 0], [0, 0, -21],
  ],
  patrolPoints: [
    [-13, 0, -13], [-13, 0, 0], [-13, 0, 13], [0, 0, 13],
    [13, 0, 13], [13, 0, 0], [13, 0, -13], [0, 0, -13],
  ],
  coverSpots: [
    [-9, 0, -1], [9, 0, 1], [-1, 0, 9], [1, 0, -9],
    [-13, 0, -9], [13, 0, 9], [3, 0, 3], [-3, 0, -3],
  ],
};

export const MAPS = [map1, map2, map3];

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

  const groundGeo = new THREE.PlaneGeometry(mapDef.groundHalf * 2, mapDef.groundHalf * 2);
  const groundMat = new THREE.MeshStandardMaterial({ color: mapDef.groundColor, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  group.add(ground);

  const wallMeshes = [];
  const wallBoxes = [];

  for (const w of mapDef.walls) {
    const geo = new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]);
    const mat = new THREE.MeshStandardMaterial({ color: w.color, roughness: 0.9, metalness: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(w.pos[0], w.pos[1], w.pos[2]);
    mesh.userData.isWall = true;
    group.add(mesh);
    wallMeshes.push(mesh);

    const box3 = new THREE.Box3().setFromObject(mesh);
    wallBoxes.push(box3);
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
    bounds: { half: mapDef.groundHalf - 1 },
    accent: mapDef.accent,
  };
}

/** Entfernt eine zuvor gebaute Map wieder aus der Szene. */
export function disposeMap(scene, mapData) {
  if (!mapData) return;
  scene.remove(mapData.group);
  mapData.group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
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
