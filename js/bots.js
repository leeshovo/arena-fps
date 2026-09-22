// bots.js — Gegner-KI: Patrouille, Sichtlinien-Erkennung, Verfolgung, Deckung bei wenig HP,
// bewusst unpräzises Schießen, Respawn nach Elimination.
import * as THREE from "three";
import { hasLineOfSight, resolveMove } from "./maps.js";

const BOT_HEIGHT = 1.8;
const BOT_RADIUS = 0.4;
const BOT_SPEED = 4.3;
const SIGHT_RANGE = 32;
const FOV_COS = Math.cos(THREE.MathUtils.degToRad(100) / 2);
const ATTACK_RANGE = 20;
const MIN_KEEP_DISTANCE = 7;
const FIRE_RATE = 2.6; // Schuss/Sekunde
const RESPAWN_DELAY = 4;
const COVER_HP_RATIO = 0.32;
const WAYPOINT_REACH_DIST = 1.4;

const BODY_COLORS = [0xff6b4a, 0x4fd1ff, 0xffd24f, 0x9d6bff, 0x6bff8e];

let botCounter = 0;

function buildBotMesh(colorIndex) {
  const group = new THREE.Group();
  const color = BODY_COLORS[colorIndex % BODY_COLORS.length];

  const torsoGeo = new THREE.BoxGeometry(0.7, 1.0, 0.4);
  const torsoMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.0;
  group.add(torso);

  const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 0.9 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.71;
  group.add(head);

  const gunGeo = new THREE.BoxGeometry(0.09, 0.09, 0.45);
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x22262c });
  const gun = new THREE.Mesh(gunGeo, gunMat);
  gun.position.set(0.42, 1.05, 0.15);
  group.add(gun);

  const legGeo = new THREE.BoxGeometry(0.6, 0.5, 0.36);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.9 });
  const legs = new THREE.Mesh(legGeo, legMat);
  legs.position.y = 0.25;
  group.add(legs);

  torso.userData.isHead = false;
  head.userData.isHead = true;

  return { group, torso, head };
}

export class Bot {
  constructor(scene, mapData, colorIndex) {
    this.id = botCounter++;
    this.name = `Bot ${this.id + 1}`;
    this.scene = scene;
    this.mapData = mapData;

    const { group, torso, head } = buildBotMesh(colorIndex);
    this.mesh = group;
    this.bodyMesh = torso;
    this.headMesh = head;
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
    this.stateFlipTimer = 0;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 2 + Math.random() * 2;

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
    this.mesh.visible = true;
    this._syncMesh();
    if (!initial) {
      // kurzer Spawn-"Pop"
      this.mesh.scale.setScalar(0.001);
    }
  }

  takeDamage(amount, isHead) {
    if (this.dead) return { killed: false };
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.mesh.visible = false;
      this.respawnTimer = RESPAWN_DELAY;
      return { killed: true };
    }
    return { killed: false };
  }

  getEyePosition(target = new THREE.Vector3()) {
    return target.set(this.position.x, this.position.y + 1.55, this.position.z);
  }

  _syncMesh() {
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    if (this.mesh.scale.x < 1) {
      this.mesh.scale.setScalar(Math.min(1, this.mesh.scale.x + 0.08));
    }
  }

  _moveToward(target, dt, wallBoxes, bounds, speedMult = 1) {
    const dir = new THREE.Vector3(target.x - this.position.x, 0, target.z - this.position.z);
    const dist = dir.length();
    if (dist < 0.05) return dist;
    dir.normalize();

    const step = BOT_SPEED * speedMult * dt;
    const { x, z } = resolveMove(wallBoxes, this.position, dir.x * step, dir.z * step, this.position.y, BOT_HEIGHT, BOT_RADIUS);

    // Wenn blockiert (kaum Bewegung), seitlich ausweichen
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

    // Blickrichtung zum Ziel drehen
    const facing = Math.atan2(target.x - this.position.x, target.z - this.position.z);
    this.mesh.rotation.y = facing;

    return dist;
  }

  _canSeePlayer(player, wallMeshes) {
    const eye = this.getEyePosition();
    const playerEye = player.getEyePosition();
    const distV = new THREE.Vector3().subVectors(playerEye, eye);
    const dist = distV.length();
    if (dist > SIGHT_RANGE) return false;

    const facing = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
    const toPlayer = distV.clone();
    toPlayer.y = 0;
    toPlayer.normalize();
    if (facing.dot(toPlayer) < FOV_COS && this.state !== "chase" && this.state !== "attack" && this.state !== "cover") {
      return false; // außerhalb Sichtfeld während Patrouille
    }

    return hasLineOfSight(wallMeshes, eye, playerEye, SIGHT_RANGE);
  }

  _shootAtPlayer(player, wallMeshes) {
    const eye = this.getEyePosition();
    const playerEye = player.getEyePosition();
    const dist = eye.distanceTo(playerEye);

    // Bewusst unpräzise Trefferquote: Streuung wächst mit Distanz.
    const inaccuracy = 0.9 + dist * 0.045;
    const targetPoint = playerEye.clone().add(
      new THREE.Vector3((Math.random() - 0.5) * inaccuracy, (Math.random() - 0.5) * inaccuracy * 0.6, (Math.random() - 0.5) * inaccuracy)
    );

    const dir = new THREE.Vector3().subVectors(targetPoint, eye).normalize();
    const raycaster = new THREE.Raycaster(eye, dir, 0, SIGHT_RANGE);
    const targets = [...wallMeshes, player.hitMesh];
    const hits = raycaster.intersectObjects(targets, false);

    if (hits.length > 0 && hits[0].object === player.hitMesh) {
      const base = 7 + Math.random() * 7;
      const falloff = Math.max(0.4, 1 - dist / SIGHT_RANGE);
      const dmg = Math.round(base * falloff);
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

  update(dt, player, wallBoxes, wallMeshes, bounds) {
    const events = [];

    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawnAt();
      return events;
    }

    this._syncMesh();

    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    const canSee = player.alive && this._canSeePlayer(player, wallMeshes);
    const hpRatio = this.hp / this.maxHp;

    if (canSee && hpRatio <= COVER_HP_RATIO && this.state !== "cover") {
      this.state = "cover";
      this.coverTarget = this._nearestCoverSpot();
    } else if (canSee && this.state !== "cover") {
      const eye = this.getEyePosition();
      const dist = eye.distanceTo(player.getEyePosition());
      this.state = dist <= ATTACK_RANGE ? "attack" : "chase";
    } else if (!canSee && this.state !== "cover") {
      this.state = "patrol";
    }

    if (this.state === "patrol") {
      const target = this.mapData.patrolPoints[this.waypointIndex];
      const dist = this._moveToward(target, dt, wallBoxes, bounds, 0.55);
      if (dist < WAYPOINT_REACH_DIST) {
        this.waypointIndex = (this.waypointIndex + 1) % this.mapData.patrolPoints.length;
      }
    } else if (this.state === "chase") {
      this._moveToward(player.position, dt, wallBoxes, bounds, 1.0);
    } else if (this.state === "attack") {
      const eye = this.getEyePosition();
      const dist = eye.distanceTo(player.getEyePosition());

      // Auf Distanz bleiben + leicht strafen
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeDir *= -1;
        this.strafeTimer = 1.5 + Math.random() * 2;
      }
      if (dist < MIN_KEEP_DISTANCE) {
        const away = new THREE.Vector3().subVectors(this.position, player.position).normalize();
        const retreatTarget = this.position.clone().addScaledVector(away, 4);
        this._moveToward(retreatTarget, dt, wallBoxes, bounds, 0.8);
      } else {
        const facing = Math.atan2(player.position.x - this.position.x, player.position.z - this.position.z);
        const perp = new THREE.Vector3(Math.cos(facing), 0, -Math.sin(facing)).multiplyScalar(this.strafeDir);
        const strafeTarget = this.position.clone().addScaledVector(perp, 3);
        this._moveToward(strafeTarget, dt, wallBoxes, bounds, 0.5);
      }

      if (canSee && this.fireCooldown <= 0) {
        this.fireCooldown = 1 / FIRE_RATE;
        const shotResult = this._shootAtPlayer(player, wallMeshes);
        events.push(shotResult);
      }
    } else if (this.state === "cover") {
      const target = this.coverTarget || this._nearestCoverSpot();
      const eye = this.getEyePosition();
      const distToCover = target ? target.distanceTo(this.position) : Infinity;

      if (distToCover > 1.2) {
        this._moveToward(target, dt, wallBoxes, bounds, 1.1);
      } else if (canSee && this.fireCooldown <= 0) {
        // Kurz aus der Deckung "peeken" und schießen
        this.fireCooldown = 1 / (FIRE_RATE * 0.7);
        const shotResult = this._shootAtPlayer(player, wallMeshes);
        events.push(shotResult);
      }

      // Bei Erholung oder Verlust des Ziels zurück zur normalen KI
      if (this.hp / this.maxHp > COVER_HP_RATIO + 0.15) {
        this.state = "patrol";
      }
    }

    return events;
  }
}

export function createBots(scene, count, mapData) {
  const bots = [];
  for (let i = 0; i < count; i++) {
    bots.push(new Bot(scene, mapData, i));
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
