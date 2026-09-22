// weapons.js — Waffensystem: Katalog aus 14 Waffen (6 Primär/3 Sekundär/2 Nahkampf/3 Utility),
// je Match aus dem Loadout zusammengesetzt. Schuss-Raycasting (inkl. Pellets/Burst), Nachladen,
// Nahkampf, Utility (Explosion/Rauch/Heilung), Skins, Mündungsblitz/Tracer, Recoil, Bobbing.
import * as THREE from "three";
import * as Audio from "./audio.js";

export const SLOT = { PRIMARY: 0, SECONDARY: 1, MELEE: 2, UTILITY: 3 };
const SLOT_TYPE = ["primary", "secondary", "melee", "utility"];

// ---------------------------------------------------------------------------
// Skins — reine Farbpaletten, auf jede Waffe anwendbar (Katalog-IDs aus progression.js)
// ---------------------------------------------------------------------------
export const SKIN_PALETTES = {
  skin_default: null, // benutzt die Eigenfarben der Waffe
  skin_glacier: { color: 0x0f1a1f, accent: 0x4fd1ff },
  skin_inferno: { color: 0x1a0e08, accent: 0xff5522 },
  skin_neon_violet: { color: 0x0c0810, accent: 0xea3bff },
  skin_gold: { color: 0x181410, accent: 0xffd24f },
};

// ---------------------------------------------------------------------------
// Waffenkatalog
// ---------------------------------------------------------------------------
export const WEAPON_CATALOG = {
  // --- Primärwaffen ------------------------------------------------------
  rifle_ar: {
    id: "rifle_ar", type: "auto", slotType: "primary", name: "Sturmgewehr",
    damage: 18, headMultiplier: 1.25, fireRate: 9, magSize: 30, reserveMax: 90, reloadTime: 1.6,
    range: 55, optimalRange: 26, minDamageMultiplier: 0.55,
    spreadBase: 0.006, spreadMax: 0.05, spreadPerShot: 0.006, spreadRecover: 0.12, moveSpreadMult: 2.2,
    recoilKick: 0.0075, moveSpeedMult: 0.9,
    adsSpreadMult: 0.18, adsSpeedMult: 0.8, adsFov: 55,
    color: 0x15171c, accent: 0xb84dff,
    viewmodel: { kind: "rifle", bodyW: 0.09, bodyH: 0.13, bodyLen: 0.62, bodyZ: -0.1, stockLen: 0.2, magW: 0.06, magH: 0.22, magD: 0.09, barrelR: 0.018, barrelLen: 0.22 },
  },
  rifle_smg: {
    id: "rifle_smg", type: "auto", slotType: "primary", name: "SMG", grantsAirJump: true,
    damage: 13, headMultiplier: 1.2, fireRate: 14, magSize: 40, reserveMax: 160, reloadTime: 1.3,
    range: 35, optimalRange: 14, minDamageMultiplier: 0.45,
    spreadBase: 0.009, spreadMax: 0.07, spreadPerShot: 0.006, spreadRecover: 0.16, moveSpreadMult: 1.8,
    recoilKick: 0.005, moveSpeedMult: 0.97,
    adsSpreadMult: 0.22, adsSpeedMult: 0.85, adsFov: 58,
    color: 0x171a20, accent: 0x4fd1ff,
    viewmodel: { kind: "rifle", bodyW: 0.08, bodyH: 0.12, bodyLen: 0.4, bodyZ: -0.06, stockLen: 0.12, magW: 0.055, magH: 0.26, magD: 0.08, barrelR: 0.015, barrelLen: 0.12 },
  },
  rifle_dmr: {
    id: "rifle_dmr", type: "semi", slotType: "primary", name: "Marksman Rifle",
    damage: 42, headMultiplier: 1.3, fireRate: 2.6, magSize: 12, reserveMax: 48, reloadTime: 1.9,
    range: 75, optimalRange: 50, minDamageMultiplier: 0.6,
    spreadBase: 0.003, spreadMax: 0.02, spreadPerShot: 0.01, spreadRecover: 0.2, moveSpreadMult: 3,
    recoilKick: 0.013, moveSpeedMult: 0.88,
    adsSpreadMult: 0.1, adsSpeedMult: 0.72, adsFov: 46,
    color: 0x14171c, accent: 0xff8a3d,
    viewmodel: { kind: "rifle", bodyW: 0.085, bodyH: 0.12, bodyLen: 0.78, bodyZ: -0.14, stockLen: 0.22, magW: 0.05, magH: 0.16, magD: 0.08, barrelR: 0.016, barrelLen: 0.3, hasScope: true },
  },
  rifle_shotgun: {
    id: "rifle_shotgun", type: "auto", slotType: "primary", name: "Schrotflinte",
    pelletCount: 8, damage: 9, headMultiplier: 1.15, fireRate: 1.1, magSize: 6, reserveMax: 24, reloadTime: 2.2,
    range: 20, optimalRange: 7, minDamageMultiplier: 0.12,
    spreadBase: 0.05, spreadMax: 0.08, spreadPerShot: 0.01, spreadRecover: 0.3, moveSpreadMult: 1.3,
    recoilKick: 0.02, moveSpeedMult: 0.85,
    adsSpreadMult: 0.6, adsSpeedMult: 0.85, adsFov: 66,
    color: 0x1a1512, accent: 0xff8a3d,
    viewmodel: { kind: "rifle", bodyW: 0.1, bodyH: 0.13, bodyLen: 0.5, bodyZ: -0.08, stockLen: 0.16, magW: 0.09, magH: 0.09, magD: 0.28, magTilt: 0, barrelR: 0.022, barrelLen: 0.24, doubleBarrel: true },
  },
  rifle_lmg: {
    id: "rifle_lmg", type: "auto", slotType: "primary", name: "LMG",
    damage: 20, headMultiplier: 1.2, fireRate: 8, magSize: 75, reserveMax: 150, reloadTime: 2.8,
    range: 50, optimalRange: 24, minDamageMultiplier: 0.5,
    spreadBase: 0.012, spreadMax: 0.065, spreadPerShot: 0.005, spreadRecover: 0.08, moveSpreadMult: 3,
    recoilKick: 0.007, moveSpeedMult: 0.78,
    adsSpreadMult: 0.3, adsSpeedMult: 0.7, adsFov: 60,
    color: 0x181a16, accent: 0x6bff8e,
    viewmodel: { kind: "rifle", bodyW: 0.1, bodyH: 0.15, bodyLen: 0.68, bodyZ: -0.1, stockLen: 0.2, magW: 0, magH: 0, magD: 0, barrelR: 0.02, barrelLen: 0.26, hasDrum: true, hasBipod: true },
  },
  rifle_burst: {
    id: "rifle_burst", type: "burst", slotType: "primary", name: "Burst-Gewehr", grantsAirJump: true,
    damage: 16, headMultiplier: 1.3, burstCount: 3, burstInterval: 0.045, fireRate: 2.2,
    magSize: 24, reserveMax: 96, reloadTime: 1.5,
    range: 50, optimalRange: 30, minDamageMultiplier: 0.55,
    spreadBase: 0.005, spreadMax: 0.03, spreadPerShot: 0.007, spreadRecover: 0.18, moveSpreadMult: 2,
    recoilKick: 0.008, moveSpeedMult: 0.92,
    adsSpreadMult: 0.15, adsSpeedMult: 0.8, adsFov: 56,
    color: 0x161a1f, accent: 0xb84dff,
    viewmodel: { kind: "rifle", bodyW: 0.085, bodyH: 0.12, bodyLen: 0.55, bodyZ: -0.09, stockLen: 0.18, magW: 0.055, magH: 0.2, magD: 0.08, barrelR: 0.017, barrelLen: 0.2 },
  },

  // --- Sekundärwaffen ------------------------------------------------------
  pistol_std: {
    id: "pistol_std", type: "semi", slotType: "secondary", name: "Pistole", grantsAirJump: true,
    damage: 22, headMultiplier: 1.25, fireRate: 6.5, magSize: 12, reserveMax: 48, reloadTime: 1.15,
    range: 40, optimalRange: 18, minDamageMultiplier: 0.5,
    spreadBase: 0.004, spreadMax: 0.035, spreadPerShot: 0.008, spreadRecover: 0.16, moveSpreadMult: 1.8,
    recoilKick: 0.009, moveSpeedMult: 0.95,
    fanShotCount: 3, fanShotSpread: 0.012, fanShotInterval: 0.07, fanShotCooldown: 0.9,
    color: 0x1c1f26, accent: 0xff8a3d,
    viewmodel: { kind: "pistol", bodyW: 0.07, bodyH: 0.12, bodyLen: 0.24, gripLen: 0.16, barrelR: 0.014, barrelLen: 0.1 },
  },
  pistol_revolver: {
    id: "pistol_revolver", type: "semi", slotType: "secondary", name: "Wuchtrevolver",
    damage: 38, headMultiplier: 1.4, fireRate: 2.2, magSize: 6, reserveMax: 24, reloadTime: 1.6,
    range: 35, optimalRange: 20, minDamageMultiplier: 0.55,
    spreadBase: 0.006, spreadMax: 0.03, spreadPerShot: 0.012, spreadRecover: 0.22, moveSpreadMult: 1.6,
    recoilKick: 0.016, moveSpeedMult: 0.97,
    adsSpreadMult: 0.15, adsSpeedMult: 0.82, adsFov: 54,
    color: 0x1a1a1a, accent: 0xffd24f,
    viewmodel: { kind: "pistol", bodyW: 0.075, bodyH: 0.12, bodyLen: 0.2, gripLen: 0.16, barrelR: 0.016, barrelLen: 0.16, cylinder: true },
  },
  pistol_machine: {
    id: "pistol_machine", type: "semi", slotType: "secondary", name: "Maschinenpistole", grantsAirJump: true,
    damage: 14, headMultiplier: 1.15, fireRate: 11, magSize: 20, reserveMax: 80, reloadTime: 1.0,
    range: 28, optimalRange: 10, minDamageMultiplier: 0.4,
    spreadBase: 0.01, spreadMax: 0.06, spreadPerShot: 0.009, spreadRecover: 0.2, moveSpreadMult: 2,
    recoilKick: 0.006, moveSpeedMult: 0.98,
    fanShotCount: 4, fanShotSpread: 0.02, fanShotInterval: 0.05, fanShotCooldown: 0.8,
    color: 0x1c2128, accent: 0x4fd1ff,
    viewmodel: { kind: "pistol", bodyW: 0.065, bodyH: 0.1, bodyLen: 0.2, gripLen: 0.14, barrelR: 0.012, barrelLen: 0.06, foregrip: true },
  },

  // --- Nahkampfwaffen ------------------------------------------------------
  melee_knife: {
    id: "melee_knife", type: "melee", slotType: "melee", name: "Nahkampfmesser", grantsAirJump: true,
    damage: 55, range: 2.3, cooldown: 0.65, moveSpeedMult: 1.1,
    heavyDamage: 45, heavyRange: 2.8, heavyCooldown: 1.25, backstabDotThreshold: -0.3,
    color: 0x1a1d22, accent: 0xb84dff,
    viewmodel: { kind: "knife" },
  },
  melee_axe: {
    id: "melee_axe", type: "melee", slotType: "melee", name: "Kampfaxt",
    damage: 65, range: 2.1, cooldown: 0.85, moveSpeedMult: 1.05,
    heavyDamage: 60, heavyRange: 2.6, heavyCooldown: 1.5, backstabDotThreshold: -2, // keine Backstab-Sonderregel
    color: 0x1c1712, accent: 0xff8a3d,
    viewmodel: { kind: "axe" },
  },

  // --- Utility ------------------------------------------------------------
  utility_grenade: {
    id: "utility_grenade", type: "explosive", slotType: "utility", name: "Wurfladung",
    throwSpeed: 17, cooldown: 5.0, fuseTime: 1.5, explosionRadius: 5.5, explosionDamage: 80,
    knockbackForce: 15, moveSpeedMult: 1.0,
    subspacePadCooldown: 4.0, subspacePadLaunchForce: 15, subspacePadLingerTime: 6.0,
    color: 0x181b20, accent: 0xff8a3d,
    viewmodel: { kind: "grenade" },
  },
  utility_smoke: {
    id: "utility_smoke", type: "smoke", slotType: "utility", name: "Rauchgranate",
    throwSpeed: 15, cooldown: 6.0, fuseTime: 1.2, moveSpeedMult: 1.0,
    smokeRadius: 5.5, smokeDuration: 8.0,
    color: 0x22262b, accent: 0xcfd6dc,
    viewmodel: { kind: "grenade" },
  },
  utility_medkit: {
    id: "utility_medkit", type: "heal", slotType: "utility", name: "Med-Kit",
    cooldown: 14.0, healAmount: 50, healChannelTime: 1.4, moveSpeedMult: 1.0,
    color: 0x1a1f1c, accent: 0x6bff8e,
    viewmodel: { kind: "medkit" },
  },
};

export function getWeaponDef(id) {
  return WEAPON_CATALOG[id] || null;
}

const ADS_DEFAULT_FOV = 78;
const UP = new THREE.Vector3(0, 1, 0);
const IMPACT_COLORS = [0xb84dff, 0xff8a3d, 0x4fd1ff, 0xff4d8f, 0x6bff8e];

// ---------------------------------------------------------------------------
// Viewmodel-Geometrie — parametrisch, damit alle 14 Waffen ohne 14 Einzel-
// funktionen ein klar unterscheidbares, aber konsistentes Aussehen bekommen.
// ---------------------------------------------------------------------------
function addEnergyCracks(group, color, segments) {
  const cracks = [];
  for (const seg of segments) {
    const geo = new THREE.BoxGeometry(seg.len, 0.01, 0.005);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.4, roughness: 0.25, metalness: 0.1,
      transparent: true, opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(seg.x, seg.y, seg.z);
    mesh.rotation.set(seg.rx || 0, seg.ry || 0, seg.rz || 0);
    group.add(mesh);
    cracks.push({ mesh, phase: Math.random() * Math.PI * 2, speed: 2.5 + Math.random() * 2.5 });
  }
  group.userData.cracks = cracks;
}

function autoCracks(bounds) {
  // Verteilt 3-4 Risse zufällig, aber deterministisch genug übers Waffenvolumen.
  const segs = [];
  const n = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    segs.push({
      len: bounds.len * (0.18 + Math.random() * 0.18),
      x: (Math.random() - 0.5) * bounds.w,
      y: (Math.random() - 0.5) * bounds.h * 0.7,
      z: bounds.z + (Math.random() - 0.5) * bounds.len * 0.8,
      ry: (Math.random() - 0.5) * 1.2,
      rz: (Math.random() - 0.5) * 1.2,
    });
  }
  return segs;
}

function buildParametricGun(def, skin) {
  const p = def.viewmodel;
  const color = skin ? skin.color : def.color;
  const accent = skin ? skin.accent : def.accent;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.6 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(p.bodyW, p.bodyH, p.bodyLen), bodyMat);
  body.position.set(0, 0, p.bodyZ);
  g.add(body);

  if (p.stockLen) {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(p.bodyW * 0.75, p.bodyH * 0.75, p.stockLen), bodyMat);
    stock.position.set(0, -0.005, p.bodyZ + p.bodyLen / 2 + p.stockLen / 2 - 0.015);
    g.add(stock);
  }

  if (p.magW) {
    const mag = new THREE.Mesh(new THREE.BoxGeometry(p.magW, p.magH, p.magD), darkMat);
    mag.position.set(0, -p.magH / 2 - p.bodyH * 0.1, p.bodyZ - p.bodyLen * 0.12);
    mag.rotation.x = p.magTilt ?? 0.14;
    mag.userData.isMag = true;
    g.add(mag);
  }

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(p.barrelR, p.barrelR, p.barrelLen, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, p.bodyH * 0.08, p.bodyZ - p.bodyLen / 2 - p.barrelLen / 2);
  g.add(barrel);
  if (p.doubleBarrel) {
    const barrel2 = barrel.clone();
    barrel2.position.x = p.barrelR * 2.4;
    g.add(barrel2);
    barrel.position.x = -p.barrelR * 1.2;
    barrel2.position.x = p.barrelR * 1.2;
  }

  if (p.hasScope) {
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), darkMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, p.bodyH * 0.7, p.bodyZ);
    g.add(scope);
  }
  if (p.hasDrum) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10), darkMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, -p.bodyH * 0.55, p.bodyZ - p.bodyLen * 0.08);
    g.add(drum);
  }
  if (p.hasBipod) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.15, 0.012), darkMat);
      leg.position.set(side * 0.05, -p.bodyH * 0.5 - 0.075, p.bodyZ - p.bodyLen / 2 - p.barrelLen * 0.3);
      leg.rotation.z = side * 0.35;
      g.add(leg);
    }
  }

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.018, p.bodyLen * 0.7),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.1 })
  );
  stripe.position.set(p.bodyW / 2 + 0.005, p.bodyH * 0.12, p.bodyZ);
  g.add(stripe);

  addEnergyCracks(g, accent, autoCracks({ w: p.bodyW, h: p.bodyH, len: p.bodyLen, z: p.bodyZ }));

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, p.bodyH * 0.08, p.bodyZ - p.bodyLen / 2 - p.barrelLen - 0.02);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  g.userData.magMesh = g.children.find((c) => c.userData.isMag) || null;
  return g;
}

function buildParametricPistol(def, skin) {
  const p = def.viewmodel;
  const color = skin ? skin.color : def.color;
  const accent = skin ? skin.accent : def.accent;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.6 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(p.bodyW, p.bodyH, p.bodyLen), bodyMat);
  g.add(body);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(p.bodyW * 0.85, p.gripLen, p.bodyW * 1.1), darkMat);
  grip.position.set(0, -p.gripLen / 2 - p.bodyH * 0.35, p.bodyLen * 0.28);
  grip.rotation.x = 0.25;
  g.add(grip);

  if (p.cylinder) {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(p.barrelR * 1.8, p.barrelR * 1.8, 0.08, 7), darkMat);
    cyl.rotation.z = Math.PI / 2;
    cyl.position.set(0, 0.01, -p.bodyLen * 0.05);
    g.add(cyl);
  }
  if (p.foregrip) {
    const fg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), darkMat);
    fg.position.set(0, -p.bodyH * 0.55, -p.bodyLen * 0.25);
    g.add(fg);
  }

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(p.barrelR, p.barrelR, p.barrelLen, 8), darkMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, p.bodyH * 0.1, -p.bodyLen / 2 - p.barrelLen / 2);
  g.add(barrel);

  addEnergyCracks(g, accent, autoCracks({ w: p.bodyW, h: p.bodyH, len: p.bodyLen, z: 0 }).slice(0, 3));

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, p.bodyH * 0.1, -p.bodyLen / 2 - p.barrelLen - 0.015);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  return g;
}

function buildMeleeModel(def, skin) {
  const color = skin ? skin.color : def.color;
  const accent = skin ? skin.accent : def.accent;
  const g = new THREE.Group();
  const isAxe = def.viewmodel.kind === "axe";

  const blade = new THREE.Mesh(
    isAxe ? new THREE.BoxGeometry(0.16, 0.02, 0.12) : new THREE.BoxGeometry(0.04, 0.02, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xd8dee5, metalness: 0.6, roughness: 0.3 })
  );
  blade.position.set(0, 0, isAxe ? -0.22 : -0.2);
  if (isAxe) blade.rotation.z = 0.15;
  g.add(blade);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.045, isAxe ? 0.26 : 0.14),
    new THREE.MeshStandardMaterial({ color })
  );
  handle.position.set(0, 0, isAxe ? 0.02 : 0.02);
  g.add(handle);

  addEnergyCracks(g, accent, [
    { len: 0.07, x: 0.024, y: 0.0, z: 0.0, ry: 0.5, rz: 0.4 },
    { len: 0.05, x: -0.024, y: 0.0, z: 0.06, ry: -0.5, rz: -0.3 },
  ]);
  return g;
}

function buildUtilityModel(def, skin) {
  const color = skin ? skin.color : def.color;
  const accent = skin ? skin.accent : def.accent;
  const g = new THREE.Group();
  const kind = def.viewmodel.kind;

  if (kind === "medkit") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.16), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    g.add(box);
    const barH = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.022), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9 }));
    barH.position.z = 0.081;
    g.add(barH);
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.1, 0.022), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9 }));
    barV.position.z = 0.081;
    g.add(barV);
    addEnergyCracks(g, accent, [{ len: 0.07, x: 0.06, y: 0.03, z: -0.06, ry: 0.4, rz: 0.5 }]);
    return g;
  }

  const grenade = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  g.add(grenade);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.5 })
  );
  cap.position.set(0, 0.1, 0);
  g.add(cap);
  addEnergyCracks(g, accent, [
    { len: 0.08, x: 0.03, y: 0.0, z: 0.02, ry: 0.4, rz: 0.6 },
    { len: 0.06, x: -0.03, y: 0.02, z: -0.02, ry: -0.5, rz: -0.4 },
  ]);
  return g;
}

function buildViewmodel(def, skin) {
  const kind = def.viewmodel.kind;
  if (kind === "rifle") return buildParametricGun(def, skin);
  if (kind === "pistol") return buildParametricPistol(def, skin);
  if (kind === "knife" || kind === "axe") return buildMeleeModel(def, skin);
  return buildUtilityModel(def, skin);
}

const REST_POS = new THREE.Vector3(0.26, -0.24, -0.5);
const REST_ROT = new THREE.Euler(0, -0.05, 0.02);

export class WeaponSystem {
  /** @param {object} loadout { primary, secondary, melee, utility, skins:{primary,secondary,melee,utility} } */
  constructor(camera, scene, loadout) {
    this.camera = camera;
    this.scene = scene;
    this.currentIndex = SLOT.PRIMARY;

    this.setLoadout(loadout);

    this.reloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.meleeCooldown = 0;
    this.utilityCooldown = 0;
    this.recoilPitch = 0;
    this.recoilPitchVel = 0;
    this.currentSpread = 0;
    this.swayPhase = 0;
    this.viewKick = new THREE.Vector3();
    this.meleeSwing = 0;
    this.switchAnim = 0; // 0 = ruht, 1 = frisch gewechselt (fährt Waffe kurz runter/rauf)

    this.aiming = false;
    this.aimLerp = 0;
    this._shotQueueCount = 0;
    this._shotQueueTimer = 0;
    this._shotQueueSpread = null;
    this.fanShotCooldown = 0;
    this.heavyCooldown = 0;
    this.padCooldown = 0;
    this.healTimer = 0; // >0 während des Heilungs-Channels
    this.healCooldownTimer = 0;

    this.triggerHeld = false;
    this.pendingEvents = [];
    this.projectiles = [];
    this.tracers = [];
    this.pads = [];
    this.smokes = [];

    this._raycaster = new THREE.Raycaster();
    this.muzzleFlash = this._buildMuzzleFlash();
    camera.add(this.muzzleFlash);
    this.muzzleFlashTimer = 0;
  }

  /** Baut die 4 aktiven Slots (+ Viewmodels) aus dem übergebenen Loadout neu auf. */
  setLoadout(loadout) {
    if (this.viewmodels) {
      for (const vm of this.viewmodels) {
        this.camera.remove(vm);
        vm.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
      }
    }
    this.loadout = loadout;
    this.equipped = [
      getWeaponDef(loadout.primary) || WEAPON_CATALOG.rifle_ar,
      getWeaponDef(loadout.secondary) || WEAPON_CATALOG.pistol_std,
      getWeaponDef(loadout.melee) || WEAPON_CATALOG.melee_knife,
      getWeaponDef(loadout.utility) || WEAPON_CATALOG.utility_grenade,
    ];
    this.ammo = this.equipped.map((d) => (d.type === "auto" || d.type === "semi" || d.type === "burst" ? { mag: d.magSize, reserve: d.reserveMax } : null));
    this.viewmodels = this.equipped.map((def) => {
      const skinId = (loadout.skins || {})[def.slotType] || "skin_default";
      const skin = SKIN_PALETTES[skinId] || null;
      const model = buildViewmodel(def, skin);
      model.position.copy(REST_POS);
      model.rotation.copy(REST_ROT);
      model.visible = false;
      this.camera.add(model);
      return model;
    });
    this.currentIndex = Math.min(this.currentIndex, this.equipped.length - 1);
    this.viewmodels[this.currentIndex].visible = true;
  }

  _buildMuzzleFlash() {
    const group = new THREE.Group();
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), glowMat);
    group.add(glow);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const core = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), coreMat);
    core.position.z = 0.001;
    group.add(core);
    this._muzzleGlow = glow;
    this._muzzleCore = core;
    return group;
  }

  currentDef() {
    return this.equipped[this.currentIndex];
  }

  getMuzzleWorldPosition(target = new THREE.Vector3()) {
    const model = this.viewmodels[this.currentIndex];
    const muzzle = model.userData.muzzle || model;
    muzzle.getWorldPosition(target);
    return target;
  }

  switchTo(index) {
    if (index < 0 || index >= this.equipped.length || index === this.currentIndex) return false;
    if (this.reloading) this.reloading = false;
    this.aiming = false;
    this._shotQueueCount = 0;
    this.viewmodels[this.currentIndex].visible = false;
    this.currentIndex = index;
    this.viewmodels[this.currentIndex].visible = true;
    this.fireCooldown = Math.max(this.fireCooldown, 0.15);
    this.switchAnim = 1;
    return true;
  }

  switchNext(dir) {
    const idx = (this.currentIndex + dir + this.equipped.length) % this.equipped.length;
    return this.switchTo(idx);
  }

  startFire() {
    this.triggerHeld = true;
  }
  stopFire() {
    this.triggerHeld = false;
  }

  reload() {
    const def = this.currentDef();
    if (def.type !== "auto" && def.type !== "semi" && def.type !== "burst") return;
    const ammo = this.ammo[this.currentIndex];
    if (this.reloading || ammo.mag >= def.magSize || ammo.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = def.reloadTime;
    Audio.playReload();
  }

  _finishReload() {
    const def = this.currentDef();
    const ammo = this.ammo[this.currentIndex];
    const needed = def.magSize - ammo.mag;
    const take = Math.min(needed, ammo.reserve);
    ammo.mag += take;
    ammo.reserve -= take;
    this.reloading = false;
  }

  _applySpread(dir, spread) {
    if (spread <= 0.0001) return dir;
    const angle = Math.random() * spread;
    const rot = Math.random() * Math.PI * 2;
    const helper = Math.abs(dir.y) < 0.99 ? UP : new THREE.Vector3(1, 0, 0);
    const perp1 = new THREE.Vector3().crossVectors(dir, helper).normalize();
    const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();
    const sinA = Math.sin(angle);
    const offset = perp1.multiplyScalar(Math.cos(rot) * sinA).add(perp2.multiplyScalar(Math.sin(rot) * sinA));
    dir.multiplyScalar(Math.cos(angle)).add(offset).normalize();
    return dir;
  }

  _getEffectiveSpread(def) {
    if (this.aiming && def.adsSpreadMult) return this.currentSpread * def.adsSpreadMult;
    return this.currentSpread;
  }

  _computeDamage(def, distance, isHead, perPelletDamage = null) {
    let dmg = perPelletDamage ?? def.damage;
    if (distance > def.optimalRange) {
      const t = Math.min(1, (distance - def.optimalRange) / Math.max(0.01, def.range - def.optimalRange));
      dmg *= 1 - t * (1 - def.minDamageMultiplier);
    }
    if (isHead) dmg *= def.headMultiplier;
    return Math.max(1, Math.round(dmg));
  }

  /** Ein einzelner Hitscan-Strahl (auch für Schrotflinten-Pellets genutzt). */
  _fireRay(def, bots, spreadOverride, perPelletDamage) {
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const effectiveSpread = spreadOverride !== null && spreadOverride !== undefined ? spreadOverride : this._getEffectiveSpread(def);
    this._applySpread(dir, effectiveSpread);

    this._raycaster.set(origin, dir);
    this._raycaster.far = def.range;
    this._raycaster.near = 0;

    const targets = [];
    for (const b of bots) if (!b.dead) targets.push(b.headMesh, b.bodyMesh);
    for (const m of this._wallMeshesRef) targets.push(m);

    const hits = this._raycaster.intersectObjects(targets, false);
    let endPoint = origin.clone().addScaledVector(dir, def.range);
    let result = { hit: false };

    if (hits.length > 0) {
      const first = hits[0];
      endPoint = first.point.clone();
      if (first.object.userData?.bot) {
        const bot = first.object.userData.bot;
        const isHead = !!first.object.userData.isHead;
        const dmg = this._computeDamage(def, first.distance, isHead, perPelletDamage);
        const dmgResult = bot.takeDamage(dmg, isHead, "player");
        result = { hit: true, isHead, killed: dmgResult.killed, bot, damage: dmg };
        this._spawnImpactFX(first, false);
      } else if (first.object.userData?.isWall) {
        this._spawnImpactFX(first, true);
      }
    }
    return { result, muzzleEnd: endPoint };
  }

  _fireOnce(bots, spreadOverride = null) {
    const def = this.currentDef();
    const ammo = this.ammo[this.currentIndex];
    ammo.mag -= 1;

    let lastEnd = null;
    if (def.pelletCount) {
      for (let i = 0; i < def.pelletCount; i++) {
        const { result, muzzleEnd } = this._fireRay(def, bots, spreadOverride, def.damage);
        lastEnd = muzzleEnd;
        if (result.hit) this.pendingEvents.push(result);
        this._spawnTracer(this.getMuzzleWorldPosition(), muzzleEnd, def.accent, 0.05);
      }
    } else {
      const { result, muzzleEnd } = this._fireRay(def, bots, spreadOverride, null);
      lastEnd = muzzleEnd;
      this._spawnTracer(this.getMuzzleWorldPosition(), muzzleEnd, def.accent);
      if (result.hit) this.pendingEvents.push(result);
    }

    this._triggerMuzzleFlash();
    this._applyRecoil(def);
    Audio.playShot(Math.min(2, 0.7 + def.damage / 40));
    this.currentSpread = Math.min(def.spreadMax, this.currentSpread + def.spreadPerShot);
    return lastEnd;
  }

  _triggerMuzzleFlash() {
    this.muzzleFlashTimer = 0.05;
    this._muzzleCore.material.opacity = 1;
    this._muzzleGlow.material.opacity = 0.85;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI;
    const model = this.viewmodels[this.currentIndex];
    const muzzle = model.userData.muzzle || model;
    this.muzzleFlash.position.copy(muzzle.position);
    this.muzzleFlash.scale.setScalar(0.85 + Math.random() * 0.45);
  }

  _applyRecoil(def) {
    this.recoilPitchVel += def.recoilKick;
    this.viewKick.z += 0.05;
    this.viewKick.y -= 0.015;
  }

  _spawnTracer(from, to, color, life = 0.09) {
    const dist = from.distanceTo(to);
    if (dist < 0.05) return;
    const geo = new THREE.CylinderGeometry(0.006, 0.006, dist, 5, 1, true);
    geo.translate(0, dist / 2, 0);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from);
    mesh.lookAt(to);
    this.scene.add(mesh);
    this.tracers.push({ mesh, life, maxLife: life });
  }

  /** Farbspritzer auf Wänden bzw. kurzer Hitmarker-Blitz im Raum bei bestätigten Treffern. */
  _spawnImpactFX(hit, isWallHit) {
    if (isWallHit) {
      const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 0, 1);
      const color = IMPACT_COLORS[Math.floor(Math.random() * IMPACT_COLORS.length)];
      const size = 0.15 + Math.random() * 0.13;
      const geo = new THREE.CircleGeometry(size, 7);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(hit.point).addScaledVector(normal, 0.015);
      mesh.lookAt(mesh.position.clone().add(normal));
      mesh.rotation.z = Math.random() * Math.PI * 2;
      this.scene.add(mesh);
      this.tracers.push({ mesh, life: 3.2, maxLife: 3.2, isDecal: true });
    } else {
      const geo = new THREE.OctahedronGeometry(0.075, 0);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(hit.point);
      this.scene.add(mesh);
      this.tracers.push({ mesh, life: 0.22, maxLife: 0.22, isHitIcon: true });
    }
  }

  meleeAttack(bots) {
    const def = this.equipped[SLOT.MELEE];
    if (this.meleeCooldown > 0) return { hit: false };
    this.meleeCooldown = def.cooldown;
    this.meleeSwing = 1;
    Audio.playMelee();

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    this._raycaster.set(origin, dir);
    this._raycaster.far = def.range;
    this._raycaster.near = 0;

    const targets = [];
    for (const b of bots) if (!b.dead) targets.push(b.headMesh, b.bodyMesh);
    for (const m of this._wallMeshesRef) targets.push(m);

    const hits = this._raycaster.intersectObjects(targets, false);
    if (hits.length > 0 && hits[0].object.userData?.bot) {
      const bot = hits[0].object.userData.bot;
      const isHead = !!hits[0].object.userData.isHead;
      const dmgResult = bot.takeDamage(def.damage, isHead, "player");
      const result = { hit: true, isHead, killed: dmgResult.killed, bot, damage: def.damage, isMelee: true };
      this.pendingEvents.push(result);
      this._spawnImpactFX(hits[0], false);
      return result;
    }
    return { hit: false };
  }

  // --- Rechtsklick-Fähigkeiten (statt klassischem ADS bei Sekundär/Nahkampf) ---

  setAiming(isAiming) {
    const def = this.currentDef();
    this.aiming = !!isAiming && !!def.adsSpreadMult;
  }

  getAimProgress() {
    return this.aimLerp;
  }

  getAdsFov() {
    return this.currentDef().adsFov || ADS_DEFAULT_FOV;
  }

  getMoveSpeedMultiplier() {
    const def = this.currentDef();
    let mult = def.moveSpeedMult || 1;
    if (this.aiming && def.adsSpeedMult) mult *= def.adsSpeedMult;
    return mult;
  }

  /** Rechtsklick (einmaliger Trigger) für Waffen ohne ADS: Fächerschuss/Heavy-Backstab/Subspace-Pad. */
  rightClickPress(bots) {
    const def = this.currentDef();
    if (def.fanShotCount) return this._triggerFanShot();
    if (def.heavyDamage) return this._heavyMelee(bots);
    if (def.subspacePadCooldown) return this._placeSubspacePad();
    return null;
  }

  _placeSubspacePad() {
    const def = this.equipped[SLOT.UTILITY];
    if (def.type !== "explosive" || this.padCooldown > 0) return false;
    this.padCooldown = def.subspacePadCooldown;

    const pos = new THREE.Vector3();
    this.camera.getWorldPosition(pos);
    pos.y = 0.06;

    const geo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: def.accent, emissive: def.accent, emissiveIntensity: 0.65, roughness: 0.4, metalness: 0.1,
      transparent: true, opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.pads.push({ mesh, life: def.subspacePadLingerTime, launchForce: def.subspacePadLaunchForce, armDelay: 0.2 });
    return true;
  }

  _triggerFanShot() {
    const def = this.currentDef();
    const ammo = this.ammo[this.currentIndex];
    if (!ammo || this.reloading || this.fanShotCooldown > 0 || ammo.mag <= 0) return false;
    this._shotQueueCount = Math.min(def.fanShotCount, ammo.mag);
    this._shotQueueTimer = 0;
    this._shotQueueSpread = def.fanShotSpread;
    this.fanShotCooldown = def.fanShotCooldown;
    return true;
  }

  _heavyMelee(bots) {
    const def = this.equipped[SLOT.MELEE];
    if (this.heavyCooldown > 0) return { hit: false };
    this.heavyCooldown = def.heavyCooldown;
    this.meleeSwing = 1;
    Audio.playMelee();

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    this._raycaster.set(origin, dir);
    this._raycaster.far = def.heavyRange;
    this._raycaster.near = 0;

    const targets = [];
    for (const b of bots) if (!b.dead) targets.push(b.headMesh, b.bodyMesh);
    for (const m of this._wallMeshesRef) targets.push(m);

    const hits = this._raycaster.intersectObjects(targets, false);
    if (hits.length > 0 && hits[0].object.userData?.bot) {
      const bot = hits[0].object.userData.bot;
      const isHead = !!hits[0].object.userData.isHead;

      const botForward = new THREE.Vector3(Math.sin(bot.mesh.rotation.y), 0, Math.cos(bot.mesh.rotation.y));
      const botPos = bot.bodyMesh.getWorldPosition(new THREE.Vector3());
      const toAttacker = new THREE.Vector3().subVectors(origin, botPos);
      toAttacker.y = 0;
      toAttacker.normalize();
      const isBackstab = botForward.dot(toAttacker) < def.backstabDotThreshold;

      const dmg = isBackstab ? 9999 : def.heavyDamage;
      const dmgResult = bot.takeDamage(dmg, isHead, "player");
      const result = { hit: true, isHead, killed: dmgResult.killed, bot, damage: dmg, isBackstab, isMelee: true };
      this.pendingEvents.push(result);
      this._spawnImpactFX(hits[0], false);
      return result;
    }
    return { hit: false };
  }

  /** G-Taste im Utility-Slot: wirft Explosion/Rauch oder startet die Heilung — je nach Waffe. */
  throwUtility() {
    const def = this.equipped[SLOT.UTILITY];
    if (this.utilityCooldown > 0) return false;

    if (def.type === "heal") {
      if (this.healTimer > 0) return false;
      this.utilityCooldown = def.cooldown;
      this.healTimer = def.healChannelTime;
      return true;
    }

    this.utilityCooldown = def.cooldown;
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    origin.addScaledVector(dir, 0.5);

    const velocity = dir.clone().multiplyScalar(def.throwSpeed);
    velocity.y += 3.5;

    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.6, emissive: def.accent, emissiveIntensity: 0.35 })
    );
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, velocity, fuse: def.fuseTime, def });
    return true;
  }

  _explode(proj, player, bots) {
    const def = proj.def;
    const center = proj.mesh.position.clone();
    this.scene.remove(proj.mesh);
    proj.mesh.geometry.dispose();
    proj.mesh.material.dispose();

    if (def.type === "smoke") {
      this._spawnSmoke(center, def);
      return;
    }

    Audio.playExplosion();
    const fxGeo = new THREE.IcosahedronGeometry(1, 0);
    const fxMat = new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.85, depthWrite: false });
    const fx = new THREE.Mesh(fxGeo, fxMat);
    fx.position.copy(center);
    fx.scale.setScalar(0.1);
    this.scene.add(fx);
    this.tracers.push({ mesh: fx, life: 0.35, maxLife: 0.35, isExplosion: true, maxScale: def.explosionRadius * 0.9 });

    const applyFalloff = (dist) => {
      if (dist > def.explosionRadius) return 0;
      const t = 1 - dist / def.explosionRadius;
      return Math.max(0, Math.round(def.explosionDamage * t));
    };

    const playerEye = player.getEyePosition();
    const distToPlayer = center.distanceTo(playerEye);
    if (distToPlayer <= def.explosionRadius) {
      const playerDmg = applyFalloff(distToPlayer);
      const t = 1 - distToPlayer / def.explosionRadius;
      const pushDir = new THREE.Vector3().subVectors(playerEye, center);
      if (pushDir.lengthSq() < 0.0001) pushDir.set(0, 1, 0);
      pushDir.normalize();
      const knockback = pushDir.multiplyScalar((def.knockbackForce || 0) * t);
      this.pendingEvents.push({ type: "explosionDamagePlayer", damage: playerDmg, knockback });
    }

    for (const b of bots) {
      if (b.dead) continue;
      const botPos = b.bodyMesh.getWorldPosition(new THREE.Vector3());
      const dist = center.distanceTo(botPos);
      const dmg = applyFalloff(dist);
      if (dmg > 0) {
        const dmgResult = b.takeDamage(dmg, false, "player");
        this.pendingEvents.push({ hit: true, isHead: false, killed: dmgResult.killed, bot: b, damage: dmg, isExplosion: true });
      }
    }
  }

  _spawnSmoke(center, def) {
    const geo = new THREE.IcosahedronGeometry(def.smokeRadius * 0.7, 1);
    const mat = new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.4, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);
    mesh.position.y = Math.max(mesh.position.y, def.smokeRadius * 0.35);
    mesh.scale.setScalar(0.15);
    this.scene.add(mesh);
    this.smokes.push({ mesh, life: def.smokeDuration, maxLife: def.smokeDuration, radius: def.smokeRadius });
  }

  /** Liefert aktive Rauchwolken als {position, radius} für die Sichtlinien-Prüfung der Bots. */
  getSmokeVolumes() {
    return this.smokes.map((s) => ({ position: s.mesh.position, radius: s.radius }));
  }

  setWallMeshes(wallMeshes) {
    this._wallMeshesRef = wallMeshes;
  }

  resetForRound(loadout) {
    if (loadout) this.setLoadout(loadout);
    this.ammo = this.equipped.map((d) => (d.type === "auto" || d.type === "semi" || d.type === "burst" ? { mag: d.magSize, reserve: d.reserveMax } : null));
    this.reloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.meleeCooldown = 0;
    this.utilityCooldown = 0;
    this.currentSpread = 0;
    this.recoilPitch = 0;
    this.recoilPitchVel = 0;
    this.triggerHeld = false;
    this.aiming = false;
    this.aimLerp = 0;
    this._shotQueueCount = 0;
    this._shotQueueTimer = 0;
    this.fanShotCooldown = 0;
    this.heavyCooldown = 0;
    this.padCooldown = 0;
    this.healTimer = 0;
    this.pendingEvents = [];

    for (const p of this.projectiles) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
    this.projectiles = [];
    for (const t of this.tracers) { this.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }
    this.tracers = [];
    for (const pad of this.pads) { this.scene.remove(pad.mesh); pad.mesh.geometry.dispose(); pad.mesh.material.dispose(); }
    this.pads = [];
    for (const s of this.smokes) { this.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }
    this.smokes = [];

    for (const vm of this.viewmodels) vm.visible = false;
    this.currentIndex = SLOT.PRIMARY;
    this.viewmodels[this.currentIndex].visible = true;
  }

  getRecoilPitch() {
    return this.recoilPitch;
  }

  drainEvents() {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  getHUDState() {
    const def = this.currentDef();
    const ammo = this.ammo[this.currentIndex];
    return {
      weaponName: def.name,
      slotIndex: this.currentIndex,
      hasAmmo: !!ammo,
      mag: ammo ? ammo.mag : null,
      reserve: ammo ? ammo.reserve : null,
      reloading: this.reloading,
      meleeCooldownPct: 1 - Math.min(1, this.meleeCooldown / this.equipped[SLOT.MELEE].cooldown),
      utilityCooldownPct: 1 - Math.min(1, this.utilityCooldown / this.equipped[SLOT.UTILITY].cooldown),
      heavyCooldownPct: 1 - Math.min(1, this.heavyCooldown / (this.equipped[SLOT.MELEE].heavyCooldown || 1)),
      healing: this.healTimer > 0,
      healProgress: this.equipped[SLOT.UTILITY].healChannelTime ? 1 - Math.max(0, this.healTimer) / this.equipped[SLOT.UTILITY].healChannelTime : 0,
      spread: this._getEffectiveSpread(def),
      aiming: this.aiming,
      aimProgress: this.aimLerp,
      moveSpeedMult: this.getMoveSpeedMultiplier(),
    };
  }

  /**
   * @param {number} dt
   * @param {object} moveState { isMoving, isSprinting, grounded }
   * @param {object} ctx { bots, player }
   */
  update(dt, moveState, ctx) {
    const def = this.currentDef();

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this._finishReload();
    }

    // Automatik-/Semi-/Burst-Feuer
    this.fireCooldown -= dt;
    if (this.triggerHeld && !this.reloading) {
      const ammo = this.ammo[this.currentIndex];
      if ((def.type === "auto" || def.type === "semi") && this.fireCooldown <= 0) {
        if (ammo.mag > 0) {
          this._fireOnce(ctx.bots);
          this.fireCooldown = 1 / def.fireRate;
          if (def.type === "semi") this.triggerHeld = false;
        } else if (ammo.reserve > 0) {
          this.reload();
        }
      } else if (def.type === "burst" && this._shotQueueCount <= 0 && this.fireCooldown <= 0) {
        if (ammo.mag > 0) {
          this._shotQueueCount = Math.min(def.burstCount, ammo.mag);
          this._shotQueueTimer = 0;
          this._shotQueueSpread = null;
          this.fireCooldown = 1 / def.fireRate;
        } else if (ammo.reserve > 0) {
          this.reload();
        }
        this.triggerHeld = false; // ein Klick = ein Burst
      }
    }

    // Fächerschuss / Burst-Warteschlange (gemeinsamer Mechanismus)
    if (this._shotQueueCount > 0) {
      const ammo = this.ammo[this.currentIndex];
      this._shotQueueTimer -= dt;
      if (this._shotQueueTimer <= 0) {
        if (ammo && ammo.mag > 0) {
          this._fireOnce(ctx.bots, this._shotQueueSpread);
          this._shotQueueCount--;
          this._shotQueueTimer = def.fanShotInterval ?? def.burstInterval ?? 0.06;
        } else {
          this._shotQueueCount = 0;
        }
      }
    }

    // Zielen (ADS) sanft ein-/ausblenden
    const aimTarget = this.aiming ? 1 : 0;
    this.aimLerp += (aimTarget - this.aimLerp) * Math.min(1, dt * 10);

    // Spread-Erholung
    const baseSpread = (def.spreadBase || 0) * (moveState.isMoving ? (def.moveSpreadMult || 1) : 1);
    const recover = (def.spreadRecover || 0.15) * dt;
    this.currentSpread = Math.max(baseSpread, this.currentSpread - recover);

    // Recoil-Erholung
    this.recoilPitchVel += -this.recoilPitch * 18 * dt;
    this.recoilPitchVel *= Math.max(0, 1 - 10 * dt);
    this.recoilPitch += this.recoilPitchVel * dt;

    // View-Kick-Erholung
    this.viewKick.multiplyScalar(Math.max(0, 1 - 12 * dt));

    // Mündungsblitz ausblenden
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this._muzzleCore.material.opacity = 0;
        this._muzzleGlow.material.opacity = 0;
      }
    }

    // Cooldowns
    if (this.meleeCooldown > 0) this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    if (this.utilityCooldown > 0) this.utilityCooldown = Math.max(0, this.utilityCooldown - dt);
    if (this.meleeSwing > 0) this.meleeSwing = Math.max(0, this.meleeSwing - dt * 4);
    if (this.fanShotCooldown > 0) this.fanShotCooldown = Math.max(0, this.fanShotCooldown - dt);
    if (this.heavyCooldown > 0) this.heavyCooldown = Math.max(0, this.heavyCooldown - dt);
    if (this.padCooldown > 0) this.padCooldown = Math.max(0, this.padCooldown - dt);
    if (this.switchAnim > 0) this.switchAnim = Math.max(0, this.switchAnim - dt * 5);

    // Heilungs-Channel (Med-Kit)
    if (this.healTimer > 0) {
      this.healTimer -= dt;
      if (this.healTimer <= 0) {
        this.healTimer = 0;
        this.pendingEvents.push({ type: "healPlayer", amount: this.equipped[SLOT.UTILITY].healAmount });
      }
    }

    // Waffen-Bobbing/Sway
    if (moveState.isMoving && moveState.grounded) {
      const freq = moveState.isSprinting ? 14 : 10.5;
      this.swayPhase += dt * freq;
    } else {
      const rest = Math.round(this.swayPhase / (Math.PI * 2)) * Math.PI * 2;
      this.swayPhase += (rest - this.swayPhase) * Math.min(1, dt * 6);
    }
    const bobAmp = moveState.isSprinting ? 0.022 : 0.013;
    const swayX = Math.sin(this.swayPhase) * bobAmp;
    const swayY = Math.abs(Math.cos(this.swayPhase)) * bobAmp * 0.7;
    const meleeKick = this.meleeSwing * -0.25;
    const switchDip = Math.sin(this.switchAnim * Math.PI) * 0.14; // kurzes Absenken beim Wechsel

    const model = this.viewmodels[this.currentIndex];
    model.position.set(
      REST_POS.x + swayX + this.viewKick.x,
      REST_POS.y + swayY + this.viewKick.y - switchDip,
      REST_POS.z + this.viewKick.z + meleeKick
    );
    model.rotation.set(
      REST_ROT.x - this.viewKick.z * 1.5 + switchDip * 1.2,
      REST_ROT.y + swayX * 0.4,
      REST_ROT.z + this.meleeSwing * 0.6
    );

    // Reload-Animation: Waffe senkt sich ab und dreht leicht (Magazin raus/rein angedeutet)
    if (this.reloading) {
      const t = 1 - Math.max(0, this.reloadTimer) / def.reloadTime;
      const wave = Math.sin(t * Math.PI);
      model.rotation.x += wave * 0.4;
      model.position.y -= wave * 0.1;
      if (model.userData.magMesh) model.userData.magMesh.position.y = -((def.viewmodel.magH || 0) / 2 + def.viewmodel.bodyH * 0.1) - wave * 0.12;
    } else if (model.userData.magMesh) {
      model.userData.magMesh.position.y = -((def.viewmodel.magH || 0) / 2 + def.viewmodel.bodyH * 0.1);
    }

    // Energie-Risse pulsieren lassen
    this._crackTime = (this._crackTime || 0) + dt;
    if (model.userData.cracks) {
      for (const c of model.userData.cracks) {
        const pulse = 0.5 + 0.5 * Math.sin(this._crackTime * c.speed + c.phase);
        c.mesh.material.emissiveIntensity = 0.7 + pulse * 1.3;
        c.mesh.material.opacity = 0.55 + pulse * 0.4;
      }
    }

    // Projektile
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.velocity.y -= 18 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 6;
      if (p.mesh.position.y <= 0.14) {
        p.mesh.position.y = 0.14;
        p.velocity.y *= -0.35;
        p.velocity.x *= 0.7;
        p.velocity.z *= 0.7;
      }
      p.fuse -= dt;
      if (p.fuse <= 0) {
        this._explode(p, ctx.player, ctx.bots);
        this.projectiles.splice(i, 1);
      }
    }

    // Subspace-Pads
    for (let i = this.pads.length - 1; i >= 0; i--) {
      const pad = this.pads[i];
      if (pad.armDelay > 0) pad.armDelay -= dt;
      pad.life -= dt;
      let triggered = false;
      if (pad.armDelay <= 0 && ctx.player && ctx.player.alive) {
        const dx = ctx.player.position.x - pad.mesh.position.x;
        const dz = ctx.player.position.z - pad.mesh.position.z;
        const dy = ctx.player.position.y - pad.mesh.position.y;
        if (dx * dx + dz * dz < 0.85 * 0.85 && Math.abs(dy) < 1.2) {
          ctx.player.applyImpulse({ x: 0, y: pad.launchForce, z: 0 });
          triggered = true;
        }
      }
      pad.mesh.rotation.y += dt * 1.5;
      pad.mesh.position.y = 0.06 + Math.sin(performance.now() * 0.004) * 0.02;
      if (triggered || pad.life <= 0) {
        this.scene.remove(pad.mesh);
        pad.mesh.geometry.dispose();
        pad.mesh.material.dispose();
        this.pads.splice(i, 1);
      }
    }

    // Rauchwolken: kurz aufblähen, lange stehen, am Ende verblassen
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.life -= dt;
      const t = 1 - Math.max(0, s.life) / s.maxLife;
      const growIn = Math.min(1, t * 6);
      s.mesh.scale.setScalar(growIn);
      s.mesh.material.opacity = 0.4 * Math.min(1, growIn) * (s.life < 1 ? Math.max(0, s.life) : 1);
      s.mesh.rotation.y += dt * 0.15;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.smokes.splice(i, 1);
      }
    }

    // Tracer, Decals, Hit-Icons, Explosions-FX ausblenden
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.isExplosion) {
        const p = 1 - Math.max(0, t.life) / t.maxLife;
        t.mesh.scale.setScalar(0.1 + p * t.maxScale);
        t.mesh.material.opacity = 0.85 * (1 - p);
      } else if (t.isDecal) {
        const fadeStart = t.maxLife * 0.65;
        t.mesh.material.opacity = t.life > fadeStart ? 0.92 : Math.max(0, t.life / fadeStart) * 0.92;
      } else if (t.isHitIcon) {
        const p = 1 - Math.max(0, t.life) / t.maxLife;
        t.mesh.scale.setScalar(0.6 + p * 1.4);
        t.mesh.rotation.y += dt * 20;
        t.mesh.material.opacity = Math.max(0, 1 - p);
      } else {
        t.mesh.material.opacity = Math.max(0, t.life / t.maxLife) * 0.9;
      }
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }
}
