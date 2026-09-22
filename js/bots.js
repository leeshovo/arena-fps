// bots.js — Gegner-KI: Patrouille, Sichtlinien-Erkennung (inkl. Rauch-Blockade), Team-System
// (Bots können sich auch gegenseitig bekämpfen, z.B. im Team-Deathmatch), Deckung bei wenig HP,
// Munition/Nachladen, reaktives Ausweichen, wählbare Schwierigkeit, humanoide Low-Poly-Modelle.
import * as THREE from "three";
import { hasLineOfSight, resolveMove } from "./maps.js";

export const TEAM = { BLUE: "blue", RED: "red" };

const BOT_HEIGHT = 1.8;
const BOT_RADIUS = 0.4;
const BOT_SPEED = 4.3;
const SIGHT_RANGE = 32;
const FOV_COS = Math.cos(THREE.MathUtils.degToRad(100) / 2);
const ATTACK_RANGE = 20;
const MIN_KEEP_DISTANCE = 7;
const FIRE_RATE = 2.6; // Schuss/Sekunde (Basis, Schwierigkeit skaliert)
const RESPAWN_DELAY = 4;
const COVER_HP_RATIO = 0.32;
const WAYPOINT_REACH_DIST = 1.4;
const BOT_MAG_SIZE = 18;
const BOT_RELOAD_TIME = 1.8;

export const DIFFICULTY_PRESETS = {
  easy: { name: "Leicht", accuracyMult: 1.7, fireRateMult: 0.7, sightMult: 0.85, reactionDelay: 0.4 },
  normal: { name: "Normal", accuracyMult: 1.0, fireRateMult: 1.0, sightMult: 1.0, reactionDelay: 0.18 },
  hard: { name: "Schwer", accuracyMult: 0.55, fireRateMult: 1.3, sightMult: 1.15, reactionDelay: 0.05 },
};

const TEAM_COLORS = {
  [TEAM.BLUE]: [0x4fd1ff, 0x3fa9d6, 0x6be0ff],
  [TEAM.RED]: [0xff6b4a, 0xe0553a, 0xff8f6b],
};

let botCounter = 0;

function buildBotMesh(team, colorIndex) {
  const group = new THREE.Group();
  const palette = TEAM_COLORS[team] || TEAM_COLORS[TEAM.RED];
  const color = palette[colorIndex % palette.length];

  const torsoGeo = new THREE.BoxGeometry(0.62, 0.72, 0.34);
  const torsoMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);

  const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 0.9 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.67;
  head.castShadow = true;
  group.add(head);

  const armMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const armGeo = new THREE.BoxGeometry(0.16, 0.58, 0.18);
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.39, 1.08, 0);
  armL.rotation.z = 0.08;
  armL.castShadow = true;
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.39, 1.08, 0);
  armR.rotation.z = -0.08;
  armR.castShadow = true;
  group.add(armR);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.9 });
  const legGeo = new THREE.BoxGeometry(0.24, 0.66, 0.26);
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.15, 0.4, 0);
  legL.castShadow = true;
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.15, 0.4, 0);
  legR.castShadow = true;
  group.add(legR);

  const gunGeo = new THREE.BoxGeometry(0.08, 0.08, 0.42);
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x22262c });
  const gun = new THREE.Mesh(gunGeo, gunMat);
  gun.position.set(0.42, 1.12, -0.12);
  group.add(gun);

  torso.userData.isHead = false;
  head.userData.isHead = true;
  armL.userData.isHead = false;
  armR.userData.isHead = false;

  return { group, torso, head, legL, legR, armL, armR };
}

function segmentIntersectsSphere(from, to, center, radius) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 0.001) return false;
  dir.normalize();
  const toCenter = new THREE.Vector3().subVectors(center, from);
  const proj = THREE.MathUtils.clamp(toCenter.dot(dir), 0, len);
  const closest = from.clone().addScaledVector(dir, proj);
  return closest.distanceTo(center) < radius;
}

function isAliveCombatant(c) {
  if (!c) return false;
  return c.dead !== undefined ? !c.dead : !!c.alive;
}

export class Bot {
  constructor(scene, mapData, colorIndex, team = TEAM.RED, difficulty = "normal") {
    this.id = botCounter++;
    this.name = `Bot ${this.id + 1}`;
    this.scene = scene;
    this.mapData = mapData;
    this.team = team;
    this.difficulty = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.normal;

    const { group, torso, head, legL, legR, armL, armR } = buildBotMesh(team, colorIndex);
    this.mesh = group;
    this.bodyMesh = torso;
    this.headMesh = head;
    this.legL = legL;
    this.legR = legR;
    this.armL = armL;
    this.armR = armR;
    this.bodyMesh.userData.bot = this;
    this.headMesh.userData.bot = this;
    scene.add(this.mesh);

    this.maxHp = 100;
    this.hp = this.maxHp;
    this.dead = false;
    this.respawnTimer = 0;

    this.position = new THREE.Vector3();
    this.state = "patrol"; // patrol | chase | attack | cover
    this.waypointIndex = Math.floor(Math.random() * mapData.patrolPoints.length);
    this.fireCooldown = Math.random() * 0.5;
    this.coverTarget = null;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 2 + Math.random() * 2;
    this.walkPhase = Math.random() * Math.PI * 2;

    this.magAmmo = BOT_MAG_SIZE;
    this.reloading = false;
    this.reloadTimer = 0;

    this.lastAttacker = null;
    this.secondLastAttacker = null;
    this.dodgeTimer = 0;
    this.dodgeDir = 1;

    this.currentTargetId = null;
    this.targetAcquiredAt = 0;

    this.respawnAt(true);
  }

  respawnAt(initial = false) {
    const points = this.mapData.spawnPoints;
    const p = points[Math.floor(Math.random() * points.length)];
    this.position.set(p.x, 0, p.z);
    this.hp = this.maxHp;
    this.dead = false;
    this.state = "patrol";
    this.waypointIndex = Math.floor(Math.random() * this.mapData.patrolPoints.length);
    this.magAmmo = BOT_MAG_SIZE;
    this.reloading = false;
    this.mesh.visible = true;
    this._syncMesh();
    if (!initial) this.mesh.scale.setScalar(0.001);
  }

  /** @param {number} amount @param {boolean} isHead @param {string} sourceTag z.B. "player" oder eine Bot-Id */
  takeDamage(amount, isHead, sourceTag) {
    if (this.dead) return { killed: false };
    this.hp -= amount;
    this.secondLastAttacker = this.lastAttacker;
    this.lastAttacker = sourceTag ?? this.lastAttacker;
    this.dodgeTimer = 0.4;
    this.dodgeDir = Math.random() < 0.5 ? 1 : -1;

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.mesh.visible = false;
      this.respawnTimer = RESPAWN_DELAY;
      const assistTag = this.secondLastAttacker && this.secondLastAttacker !== this.lastAttacker ? this.secondLastAttacker : null;
      return { killed: true, killerTag: this.lastAttacker, assistTag };
    }
    return { killed: false };
  }

  getEyePosition(target = new THREE.Vector3()) {
    return target.set(this.position.x, this.position.y + 1.55, this.position.z);
  }

  _syncMesh() {
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    if (this.mesh.scale.x < 1) this.mesh.scale.setScalar(Math.min(1, this.mesh.scale.x + 0.08));
  }

  _animateWalk(dt, moving) {
    if (moving) this.walkPhase += dt * 9;
    const swing = moving ? Math.sin(this.walkPhase) * 0.5 : 0;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.7;
    this.armR.rotation.x = swing * 0.7;
  }

  _moveToward(target, dt, wallBoxes, bounds, speedMult = 1) {
    const dir = new THREE.Vector3(target.x - this.position.x, 0, target.z - this.position.z);
    const dist = dir.length();
    if (dist < 0.05) return dist;
    dir.normalize();

    // Reaktiver Sidestep kurz nach einem Treffer
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(this.dodgeDir * 0.6);
      dir.add(perp).normalize();
    }

    const step = BOT_SPEED * speedMult * dt;
    const { x, z } = resolveMove(wallBoxes, this.position, dir.x * step, dir.z * step, this.position.y, BOT_HEIGHT, BOT_RADIUS);

    const moved = Math.hypot(x - this.position.x, z - this.position.z);
    if (moved < step * 0.3) {
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(this.strafeDir);
      const alt = resolveMove(wallBoxes, this.position, perp.x * step, perp.z * step, this.position.y, BOT_HEIGHT, BOT_RADIUS);
      this.position.x = THREE.MathUtils.clamp(alt.x, -bounds.half, bounds.half);
      this.position.z = THREE.MathUtils.clamp(alt.z, -bounds.half, bounds.half);
    } else {
      this.position.x = THREE.MathUtils.clamp(x, -bounds.half, bounds.half);
      this.position.z = THREE.MathUtils.clamp(z, -bounds.half, bounds.half);
    }

    const facing = Math.atan2(target.x - this.position.x, target.z - this.position.z);
    this.mesh.rotation.y = facing;
    this._animateWalk(dt, moved > 0.001);
    return dist;
  }

  _canSee(targetEntity, wallMeshes, smokeVolumes) {
    const eye = this.getEyePosition();
    const targetEye = targetEntity.getEyePosition();
    const distV = new THREE.Vector3().subVectors(targetEye, eye);
    const dist = distV.length();
    const sightRange = SIGHT_RANGE * this.difficulty.sightMult;
    if (dist > sightRange) return false;

    const facing = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
    const toTarget = distV.clone();
    toTarget.y = 0;
    toTarget.normalize();
    if (facing.dot(toTarget) < FOV_COS && this.state === "patrol") return false;

    if (!hasLineOfSight(wallMeshes, eye, targetEye, sightRange)) return false;
    if (smokeVolumes && smokeVolumes.length) {
      for (const s of smokeVolumes) {
        if (segmentIntersectsSphere(eye, targetEye, s.position, s.radius)) return false;
      }
    }
    return true;
  }

  /** Wählt das nächste sichtbare gegnerische Ziel (Spieler oder feindlicher Bot). */
  _selectTarget(player, allBots, wallMeshes, smokeVolumes) {
    const candidates = [];
    if (player && player.team !== this.team && isAliveCombatant(player)) candidates.push(player);
    for (const b of allBots) {
      if (b === this) continue;
      if (b.team === this.team) continue;
      if (!isAliveCombatant(b)) continue;
      candidates.push(b);
    }
    let best = null;
    let bestDist = Infinity;
    for (const c of candidates) {
      if (!this._canSee(c, wallMeshes, smokeVolumes)) continue;
      const d = this.position.distanceTo(c.position);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best;
  }

  _shootAtTarget(target, wallMeshes, sourceTag) {
    const eye = this.getEyePosition();
    const targetEye = target.getEyePosition();
    const dist = eye.distanceTo(targetEye);

    const inaccuracy = (0.9 + dist * 0.045) * this.difficulty.accuracyMult;
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * inaccuracy,
      (Math.random() - 0.5) * inaccuracy * 0.6,
      (Math.random() - 0.5) * inaccuracy
    );
    const targetPoint = targetEye.clone().add(jitter);
    const dir = new THREE.Vector3().subVectors(targetPoint, eye).normalize();
    const raycaster = new THREE.Raycaster(eye, dir, 0, SIGHT_RANGE);
    const hitMesh = target.hitMesh || target.bodyMesh;
    const hits = raycaster.intersectObjects([...wallMeshes, hitMesh], false);

    if (hits.length > 0 && hits[0].object === hitMesh) {
      const base = 7 + Math.random() * 7;
      const falloff = Math.max(0.4, 1 - dist / SIGHT_RANGE);
      const dmg = Math.round(base * falloff);
      if (target.dead !== undefined) {
        const result = target.takeDamage(dmg, false, sourceTag);
        return { type: "hitBot", amount: dmg, target, killed: result.killed, assistTag: result.assistTag, killerBot: this };
      }
      return { type: "hitPlayer", amount: dmg, bot: this };
    }
    return { type: "shotMissed" };
  }

  _nearestCoverSpot() {
    let best = null;
    let bestDist = Infinity;
    for (const c of this.mapData.coverSpots) {
      const d = c.distanceTo(this.position);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best;
  }

  /**
   * @param {number} dt
   * @param {object} player Spieler (Kombattant, kann auch selbst tot/Team sein)
   * @param {Bot[]} allBots alle Bots der Runde (für Team-Kämpfe)
   * @param {THREE.Box3[]} wallBoxes @param {THREE.Object3D[]} wallMeshes @param {object} bounds
   * @param {Array} smokeVolumes aktive Rauchwolken [{position, radius}]
   */
  update(dt, player, allBots, wallBoxes, wallMeshes, bounds, smokeVolumes = []) {
    const events = [];

    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawnAt();
      return events;
    }

    this._syncMesh();
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // Nachladen
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.magAmmo = BOT_MAG_SIZE;
      }
    }

    const target = this._selectTarget(player, allBots, wallMeshes, smokeVolumes);
    const canSee = !!target;
    if (canSee) {
      if (this.currentTargetId !== target) {
        this.currentTargetId = target;
        this.targetAcquiredAt = performance.now() / 1000;
      }
    } else {
      this.currentTargetId = null;
    }
    const hpRatio = this.hp / this.maxHp;

    if (canSee && hpRatio <= COVER_HP_RATIO && this.state !== "cover") {
      this.state = "cover";
      this.coverTarget = this._nearestCoverSpot();
    } else if (canSee && this.state !== "cover") {
      const dist = this.getEyePosition().distanceTo(target.getEyePosition());
      this.state = dist <= ATTACK_RANGE ? "attack" : "chase";
    } else if (!canSee && this.state !== "cover") {
      this.state = "patrol";
    }

    const reacted = canSee && performance.now() / 1000 - this.targetAcquiredAt >= this.difficulty.reactionDelay;

    if (this.state === "patrol") {
      const wp = this.mapData.patrolPoints[this.waypointIndex];
      const dist = this._moveToward(wp, dt, wallBoxes, bounds, 0.55);
      if (dist < WAYPOINT_REACH_DIST) this.waypointIndex = (this.waypointIndex + 1) % this.mapData.patrolPoints.length;
    } else if (this.state === "chase") {
      this._moveToward(target.position, dt, wallBoxes, bounds, 1.0);
    } else if (this.state === "attack") {
      const dist = this.getEyePosition().distanceTo(target.getEyePosition());
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeDir *= -1;
        this.strafeTimer = 1.5 + Math.random() * 2;
      }
      if (dist < MIN_KEEP_DISTANCE) {
        const away = new THREE.Vector3().subVectors(this.position, target.position).normalize();
        this._moveToward(this.position.clone().addScaledVector(away, 4), dt, wallBoxes, bounds, 0.8);
      } else {
        const facing = Math.atan2(target.position.x - this.position.x, target.position.z - this.position.z);
        const perp = new THREE.Vector3(Math.cos(facing), 0, -Math.sin(facing)).multiplyScalar(this.strafeDir);
        this._moveToward(this.position.clone().addScaledVector(perp, 3), dt, wallBoxes, bounds, 0.5);
      }

      if (reacted && !this.reloading && this.fireCooldown <= 0) {
        if (this.magAmmo > 0) {
          this.fireCooldown = 1 / (FIRE_RATE * this.difficulty.fireRateMult);
          this.magAmmo -= 1;
          events.push(this._shootAtTarget(target, wallMeshes, `bot:${this.id}`));
          if (this.magAmmo <= 0) {
            this.reloading = true;
            this.reloadTimer = BOT_RELOAD_TIME;
          }
        } else if (!this.reloading) {
          this.reloading = true;
          this.reloadTimer = BOT_RELOAD_TIME;
        }
      }
    } else if (this.state === "cover") {
      const coverPoint = this.coverTarget || this._nearestCoverSpot();
      const distToCover = coverPoint ? coverPoint.distanceTo(this.position) : Infinity;

      if (distToCover > 1.2) {
        this._moveToward(coverPoint, dt, wallBoxes, bounds, 1.1);
      } else if (canSee && reacted && !this.reloading && this.fireCooldown <= 0) {
        if (this.magAmmo > 0) {
          this.fireCooldown = 1 / (FIRE_RATE * this.difficulty.fireRateMult * 0.7);
          this.magAmmo -= 1;
          events.push(this._shootAtTarget(target, wallMeshes, `bot:${this.id}`));
          if (this.magAmmo <= 0) {
            this.reloading = true;
            this.reloadTimer = BOT_RELOAD_TIME;
          }
        } else {
          this.reloading = true;
          this.reloadTimer = BOT_RELOAD_TIME;
        }
      }

      if (this.hp / this.maxHp > COVER_HP_RATIO + 0.15) this.state = "patrol";
    }

    return events;
  }
}

export function createBots(scene, count, mapData, team = TEAM.RED, difficulty = "normal", colorOffset = 0) {
  const bots = [];
  for (let i = 0; i < count; i++) {
    bots.push(new Bot(scene, mapData, colorOffset + i, team, difficulty));
  }
  return bots;
}

export function disposeBots(scene, bots) {
  for (const b of bots) {
    scene.remove(b.mesh);
    b.mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
