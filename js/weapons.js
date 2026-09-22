// weapons.js — Waffensystem: 4 Slots, Schuss-Raycasting, Nachladen, Nahkampf, Utility-Wurf,
// Mündungsblitz/Tracer, Recoil & Waffen-Bobbing. Primitives-only Low-Poly-Viewmodels.
import * as THREE from "three";

export const SLOT = { PRIMARY: 0, SECONDARY: 1, MELEE: 2, UTILITY: 3 };

export const WEAPON_DEFS = [
  {
    id: "rifle",
    slot: SLOT.PRIMARY,
    name: "Sturmgewehr",
    type: "auto",
    damage: 18,
    headMultiplier: 1.25, // wie im echten Rivals seit dem Hitscan-Nerf (1.5x -> 1.25x)
    fireRate: 9, // Schuss/Sekunde
    magSize: 30,
    reserveMax: 90,
    reloadTime: 1.6,
    range: 55,
    optimalRange: 26,
    minDamageMultiplier: 0.55,
    spreadBase: 0.006,
    spreadMax: 0.05,
    spreadPerShot: 0.006,
    spreadRecover: 0.12,
    moveSpreadMult: 2.2,
    recoilKick: 0.0075,
    moveSpeedMult: 0.9, // -10% Move Speed, wie in Rivals
    adsSpreadMult: 0.18, // Rechtsklick: Zielen (ADS) statt Ability
    adsSpeedMult: 0.8, // zusätzliche Verlangsamung beim Zielen
    adsFov: 55,
    color: 0x2c3440,
    accent: 0x4fd1ff,
  },
  {
    id: "pistol",
    slot: SLOT.SECONDARY,
    name: "Pistole",
    type: "semi",
    damage: 22,
    headMultiplier: 1.25,
    fireRate: 6.5,
    magSize: 12,
    reserveMax: 48,
    reloadTime: 1.15,
    range: 40,
    optimalRange: 18,
    minDamageMultiplier: 0.5,
    spreadBase: 0.004,
    spreadMax: 0.035,
    spreadPerShot: 0.008,
    spreadRecover: 0.16,
    moveSpreadMult: 1.8,
    recoilKick: 0.009,
    moveSpeedMult: 0.95, // -5% Move Speed
    fanShotCount: 3, // Rechtsklick: Fächerschuss statt ADS
    fanShotSpread: 0.012,
    fanShotInterval: 0.07,
    fanShotCooldown: 0.9,
    color: 0x3a4250,
    accent: 0xff6b4a,
  },
  {
    id: "melee",
    slot: SLOT.MELEE,
    name: "Nahkampfmesser",
    type: "melee",
    damage: 55,
    range: 2.3,
    cooldown: 0.65,
    moveSpeedMult: 1.1, // +10% Move Speed, wie in Rivals
    heavyDamage: 45, // Rechtsklick: Heavy-Backstab statt ADS
    heavyRange: 2.8,
    heavyCooldown: 1.25,
    backstabDotThreshold: -0.3,
    color: 0x8a94a3,
    accent: 0xffffff,
  },
  {
    id: "utility",
    slot: SLOT.UTILITY,
    name: "Wurfladung",
    type: "utility",
    throwSpeed: 17,
    cooldown: 5.0,
    fuseTime: 1.5,
    explosionRadius: 5.5,
    explosionDamage: 80,
    moveSpeedMult: 1.0, // normale Move Speed
    color: 0x33393f,
    accent: 0xff6b4a,
  },
];

const ADS_DEFAULT_FOV = 78;

const UP = new THREE.Vector3(0, 1, 0);

function buildRifleModel(def) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.13, 0.62),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7 })
  );
  body.position.set(0, 0, -0.1);
  g.add(body);

  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.1, 0.2),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8 })
  );
  stock.position.set(0, -0.01, 0.27);
  g.add(stock);

  const mag = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.22, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.8 })
  );
  mag.position.set(0, -0.16, -0.02);
  mag.rotation.x = 0.15;
  g.add(mag);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.5 })
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, -0.52);
  g.add(barrel);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.02, 0.4),
    new THREE.MeshStandardMaterial({ color: def.accent, emissive: def.accent, emissiveIntensity: 0.6 })
  );
  stripe.position.set(0.046, 0.02, -0.1);
  g.add(stripe);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.015, -0.63);
  g.add(muzzle);
  g.userData.muzzle = muzzle;

  return g;
}

function buildPistolModel(def) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.12, 0.24),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.6 })
  );
  g.add(body);
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.16, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.8 })
  );
  grip.position.set(0, -0.13, 0.07);
  grip.rotation.x = 0.25;
  g.add(grip);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x11151a })
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.17);
  g.add(barrel);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, -0.23);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  return g;
}

function buildMeleeModel(def) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.02, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xd8dee5, metalness: 0.6, roughness: 0.3 })
  );
  blade.position.set(0, 0, -0.2);
  g.add(blade);
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.045, 0.14),
    new THREE.MeshStandardMaterial({ color: def.color })
  );
  handle.position.set(0, 0, 0.02);
  g.add(handle);
  return g;
}

function buildUtilityModel(def) {
  const g = new THREE.Group();
  const grenade = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.09, 0),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.6 })
  );
  g.add(grenade);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6),
    new THREE.MeshStandardMaterial({ color: def.accent })
  );
  cap.position.set(0, 0.1, 0);
  g.add(cap);
  return g;
}

const BUILDERS = { rifle: buildRifleModel, pistol: buildPistolModel, melee: buildMeleeModel, utility: buildUtilityModel };

const REST_POS = new THREE.Vector3(0.26, -0.24, -0.5);
const REST_ROT = new THREE.Euler(0, -0.05, 0.02);

export class WeaponSystem {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.currentIndex = SLOT.PRIMARY;

    this.ammo = WEAPON_DEFS.map((d) =>
      d.type === "auto" || d.type === "semi" ? { mag: d.magSize, reserve: d.reserveMax } : null
    );

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
    this.viewKickRot = new THREE.Euler();
    this.meleeSwing = 0;

    // Rechtsklick-Fähigkeiten (ersetzen ADS bei Waffen ohne eigenes adsSpreadMult)
    this.aiming = false;
    this.aimLerp = 0;
    this.fanShotQueue = 0;
    this.fanShotTimer = 0;
    this.fanShotCooldown = 0;
    this.heavyCooldown = 0;

    this.triggerHeld = false;
    this.pendingEvents = [];
    this.projectiles = [];
    this.tracers = [];

    this._raycaster = new THREE.Raycaster();

    this.viewmodels = WEAPON_DEFS.map((def) => {
      const model = BUILDERS[def.id](def);
      model.position.copy(REST_POS);
      model.rotation.copy(REST_ROT);
      model.visible = false;
      camera.add(model);
      return model;
    });
    this.viewmodels[this.currentIndex].visible = true;

    this.muzzleFlash = this._buildMuzzleFlash();
    camera.add(this.muzzleFlash);
    this.muzzleFlashTimer = 0;
  }

  _buildMuzzleFlash() {
    const geo = new THREE.PlaneGeometry(0.22, 0.22);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geo, mat);
  }

  currentDef() {
    return WEAPON_DEFS[this.currentIndex];
  }

  getMuzzleWorldPosition(target = new THREE.Vector3()) {
    const model = this.viewmodels[this.currentIndex];
    const muzzle = model.userData.muzzle || model;
    muzzle.getWorldPosition(target);
    return target;
  }

  switchTo(index) {
    if (index < 0 || index >= WEAPON_DEFS.length || index === this.currentIndex) return;
    if (this.reloading) this.reloading = false;
    this.aiming = false;
    this.fanShotQueue = 0;
    this.viewmodels[this.currentIndex].visible = false;
    this.currentIndex = index;
    this.viewmodels[this.currentIndex].visible = true;
    this.fireCooldown = Math.max(this.fireCooldown, 0.15);
  }

  switchNext(dir) {
    const idx = (this.currentIndex + dir + WEAPON_DEFS.length) % WEAPON_DEFS.length;
    this.switchTo(idx);
  }

  startFire() {
    this.triggerHeld = true;
  }
  stopFire() {
    this.triggerHeld = false;
  }

  reload() {
    const def = this.currentDef();
    if (def.type !== "auto" && def.type !== "semi") return;
    const ammo = this.ammo[this.currentIndex];
    if (this.reloading || ammo.mag >= def.magSize || ammo.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = def.reloadTime;
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

  _computeDamage(def, distance, isHead) {
    let dmg = def.damage;
    if (distance > def.optimalRange) {
      const t = Math.min(1, (distance - def.optimalRange) / Math.max(0.01, def.range - def.optimalRange));
      dmg *= 1 - t * (1 - def.minDamageMultiplier);
    }
    if (isHead) dmg *= def.headMultiplier;
    return Math.max(1, Math.round(dmg));
  }

  _fireOnce(bots, spreadOverride = null) {
    const def = this.currentDef();
    const ammo = this.ammo[this.currentIndex];
    ammo.mag -= 1;

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const effectiveSpread = spreadOverride !== null ? spreadOverride : this._getEffectiveSpread(def);
    this._applySpread(dir, effectiveSpread);

    this._raycaster.set(origin, dir);
    this._raycaster.far = def.range;
    this._raycaster.near = 0;

    const targets = [];
    for (const b of bots) {
      if (!b.dead) {
        targets.push(b.headMesh, b.bodyMesh);
      }
    }
    for (const m of this._wallMeshesRef) targets.push(m);

    const hits = this._raycaster.intersectObjects(targets, false);
    let endPoint = origin.clone().addScaledVector(dir, def.range);
    let result = { hit: false };

    if (hits.length > 0) {
      const first = hits[0];
      endPoint = first.point.clone();
      if (first.object.userData && first.object.userData.bot) {
        const bot = first.object.userData.bot;
        const isHead = !!first.object.userData.isHead;
        const dmg = this._computeDamage(def, first.distance, isHead);
        const dmgResult = bot.takeDamage(dmg, isHead);
        result = { hit: true, isHead, killed: dmgResult.killed, bot, damage: dmg };
      }
    }

    this._spawnTracer(this.getMuzzleWorldPosition(), endPoint, def.accent);
    this._triggerMuzzleFlash();
    this._applyRecoil(def);

    this.currentSpread = Math.min(def.spreadMax, this.currentSpread + def.spreadPerShot);

    if (result.hit) this.pendingEvents.push(result);
    return result;
  }

  _triggerMuzzleFlash() {
    this.muzzleFlashTimer = 0.045;
    this.muzzleFlash.material.opacity = 1;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI;
    const model = this.viewmodels[this.currentIndex];
    const muzzle = model.userData.muzzle || model;
    this.muzzleFlash.position.copy(muzzle.position);
    this.muzzleFlash.scale.setScalar(0.8 + Math.random() * 0.4);
  }

  _applyRecoil(def) {
    this.recoilPitchVel += def.recoilKick;
    this.viewKick.z += 0.05;
    this.viewKick.y -= 0.015;
  }

  _spawnTracer(from, to, color) {
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
    this.tracers.push({ mesh, life: 0.09, maxLife: 0.09 });
  }

  meleeAttack(bots) {
    const def = WEAPON_DEFS[SLOT.MELEE];
    if (this.meleeCooldown > 0) return { hit: false };
    this.meleeCooldown = def.cooldown;
    this.meleeSwing = 1;

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
    if (hits.length > 0 && hits[0].object.userData && hits[0].object.userData.bot) {
      const bot = hits[0].object.userData.bot;
      const isHead = !!hits[0].object.userData.isHead;
      const dmgResult = bot.takeDamage(def.damage, isHead);
      const result = { hit: true, isHead, killed: dmgResult.killed, bot, damage: def.damage };
      this.pendingEvents.push(result);
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

  /** Rechtsklick (einmaliger Trigger) für Waffen ohne ADS: Pistole = Fächerschuss, Messer = Heavy-Backstab. */
  rightClickPress(bots) {
    const def = this.currentDef();
    if (def.fanShotCount) return this._triggerFanShot();
    if (def.heavyDamage) return this._heavyMelee(bots);
    return null;
  }

  _triggerFanShot() {
    const def = this.currentDef();
    const ammo = this.ammo[this.currentIndex];
    if (!ammo || this.reloading || this.fanShotCooldown > 0 || ammo.mag <= 0) return false;
    this.fanShotQueue = Math.min(def.fanShotCount, ammo.mag);
    this.fanShotTimer = 0;
    this.fanShotCooldown = def.fanShotCooldown;
    return true;
  }

  _heavyMelee(bots) {
    const def = WEAPON_DEFS[SLOT.MELEE];
    if (this.heavyCooldown > 0) return { hit: false };
    this.heavyCooldown = def.heavyCooldown;
    this.meleeSwing = 1;

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
    if (hits.length > 0 && hits[0].object.userData && hits[0].object.userData.bot) {
      const bot = hits[0].object.userData.bot;
      const isHead = !!hits[0].object.userData.isHead;

      // Backstab: Angreifer steht (grob) auf der Rückseite der Blickrichtung des Bots.
      const botForward = new THREE.Vector3(Math.sin(bot.mesh.rotation.y), 0, Math.cos(bot.mesh.rotation.y));
      const botPos = bot.bodyMesh.getWorldPosition(new THREE.Vector3());
      const toAttacker = new THREE.Vector3().subVectors(origin, botPos);
      toAttacker.y = 0;
      toAttacker.normalize();
      const isBackstab = botForward.dot(toAttacker) < def.backstabDotThreshold;

      const dmg = isBackstab ? 9999 : def.heavyDamage;
      const dmgResult = bot.takeDamage(dmg, isHead);
      const result = { hit: true, isHead, killed: dmgResult.killed, bot, damage: dmg, isBackstab };
      this.pendingEvents.push(result);
      return result;
    }
    return { hit: false };
  }

  throwUtility() {
    const def = WEAPON_DEFS[SLOT.UTILITY];
    if (this.utilityCooldown > 0) return false;
    this.utilityCooldown = def.cooldown;

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    origin.addScaledVector(dir, 0.5);

    const velocity = dir.clone().multiplyScalar(def.throwSpeed);
    velocity.y += 3.5;

    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.14, 0),
      new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.6 })
    );
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.projectiles.push({ mesh, velocity, fuse: def.fuseTime, def });
    return true;
  }

  _explode(proj, player, bots) {
    const def = proj.def;
    const center = proj.mesh.position.clone();

    // Effekt: expandierende, verblassende Kugel
    const fxGeo = new THREE.SphereGeometry(1, 12, 8);
    const fxMat = new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
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

    // Spieler-Splash (inkl. Eigenschaden)
    const playerEye = player.getEyePosition();
    const distToPlayer = center.distanceTo(playerEye);
    const playerDmg = applyFalloff(distToPlayer);
    if (playerDmg > 0) {
      this.pendingEvents.push({ type: "explosionDamagePlayer", damage: playerDmg });
    }

    // Bot-Splash
    for (const b of bots) {
      if (b.dead) continue;
      const botPos = b.bodyMesh.getWorldPosition(new THREE.Vector3());
      const dist = center.distanceTo(botPos);
      const dmg = applyFalloff(dist);
      if (dmg > 0) {
        const dmgResult = b.takeDamage(dmg, false);
        this.pendingEvents.push({ hit: true, isHead: false, killed: dmgResult.killed, bot: b, damage: dmg, isExplosion: true });
      }
    }

    this.scene.remove(proj.mesh);
    proj.mesh.geometry.dispose();
    proj.mesh.material.dispose();
  }

  /** Muss vor dem ersten Schuss einmalig gesetzt werden (Wände der aktuellen Map). */
  setWallMeshes(wallMeshes) {
    this._wallMeshesRef = wallMeshes;
  }

  /** Setzt Munition, Cooldowns und aktive Effekte für eine neue Runde zurück. */
  resetForRound() {
    this.ammo = WEAPON_DEFS.map((d) =>
      d.type === "auto" || d.type === "semi" ? { mag: d.magSize, reserve: d.reserveMax } : null
    );
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
    this.fanShotQueue = 0;
    this.fanShotTimer = 0;
    this.fanShotCooldown = 0;
    this.heavyCooldown = 0;
    this.pendingEvents = [];

    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.projectiles = [];
    for (const t of this.tracers) {
      this.scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
    }
    this.tracers = [];

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
      hasAmmo: !!ammo,
      mag: ammo ? ammo.mag : null,
      reserve: ammo ? ammo.reserve : null,
      reloading: this.reloading,
      meleeCooldownPct: 1 - Math.min(1, this.meleeCooldown / WEAPON_DEFS[SLOT.MELEE].cooldown),
      utilityCooldownPct: 1 - Math.min(1, this.utilityCooldown / WEAPON_DEFS[SLOT.UTILITY].cooldown),
      heavyCooldownPct: 1 - Math.min(1, this.heavyCooldown / (WEAPON_DEFS[SLOT.MELEE].heavyCooldown || 1)),
      fanShotCooldownPct: 1 - Math.min(1, this.fanShotCooldown / (WEAPON_DEFS[SLOT.SECONDARY].fanShotCooldown || 1)),
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

    // Reload
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this._finishReload();
    }

    // Auto-/Semi-Feuer
    this.fireCooldown -= dt;
    if (this.triggerHeld && !this.reloading && (def.type === "auto" || def.type === "semi")) {
      const ammo = this.ammo[this.currentIndex];
      if (this.fireCooldown <= 0) {
        if (ammo.mag > 0) {
          this._fireOnce(ctx.bots);
          this.fireCooldown = 1 / def.fireRate;
          if (def.type === "semi") this.triggerHeld = false; // Semi-Auto: pro Klick ein Schuss
        } else if (ammo.reserve > 0) {
          this.reload();
        }
      }
    }

    // Cooldowns
    if (this.meleeCooldown > 0) this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    if (this.utilityCooldown > 0) this.utilityCooldown = Math.max(0, this.utilityCooldown - dt);
    if (this.meleeSwing > 0) this.meleeSwing = Math.max(0, this.meleeSwing - dt * 4);
    if (this.fanShotCooldown > 0) this.fanShotCooldown = Math.max(0, this.fanShotCooldown - dt);
    if (this.heavyCooldown > 0) this.heavyCooldown = Math.max(0, this.heavyCooldown - dt);

    // Fächerschuss-Queue (Pistolen-Rechtsklick): mehrere Schüsse mit kurzem Intervall
    if (this.fanShotQueue > 0) {
      const ammo = this.ammo[this.currentIndex];
      this.fanShotTimer -= dt;
      if (this.fanShotTimer <= 0) {
        if (ammo && ammo.mag > 0) {
          this._fireOnce(ctx.bots, def.fanShotSpread);
          this.fanShotQueue--;
          this.fanShotTimer = def.fanShotInterval;
        } else {
          this.fanShotQueue = 0;
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

    // Recoil-Erholung (Feder zurück zu 0)
    this.recoilPitchVel += (-this.recoilPitch) * 18 * dt;
    this.recoilPitchVel *= Math.max(0, 1 - 10 * dt);
    this.recoilPitch += this.recoilPitchVel * dt;

    // View-Kick-Erholung
    this.viewKick.multiplyScalar(Math.max(0, 1 - 12 * dt));

    // Mündungsblitz ausblenden
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) this.muzzleFlash.material.opacity = 0;
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

    const model = this.viewmodels[this.currentIndex];
    model.position.set(
      REST_POS.x + swayX + this.viewKick.x,
      REST_POS.y + swayY + this.viewKick.y,
      REST_POS.z + this.viewKick.z + meleeKick
    );
    model.rotation.set(
      REST_ROT.x - this.viewKick.z * 1.5,
      REST_ROT.y + swayX * 0.4,
      REST_ROT.z + this.meleeSwing * 0.6
    );

    // Reload-Nicken
    if (this.reloading) {
      const t = 1 - Math.max(0, this.reloadTimer) / def.reloadTime;
      model.rotation.x += Math.sin(t * Math.PI) * 0.35;
      model.position.y -= Math.sin(t * Math.PI) * 0.08;
    }

    // Projektile (Utility) aktualisieren
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

    // Tracer & Explosions-FX ausblenden
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.isExplosion) {
        const p = 1 - Math.max(0, t.life) / t.maxLife;
        t.mesh.scale.setScalar(0.1 + p * t.maxScale);
        t.mesh.material.opacity = 0.85 * (1 - p);
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
