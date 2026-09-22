// player.js — Spielerbewegung, Pointer-Lock-Maussteuerung, Kollision, Head-Bobbing, Gesundheit.
import * as THREE from "three";
import { resolveMove, checkCollision } from "./maps.js";

const EYE_HEIGHT = 1.7;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.4;
const WALK_SPEED = 6.0;
const SPRINT_MULT = 1.6;
const JUMP_SPEED = 7.5;
const GRAVITY = 22;
const MOUSE_SENS = 0.0022;
const BOB_FREQ = 11.5;
const BOB_AMP = 0.045;
const MAX_HP = 100;

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.position = new THREE.Vector3(0, 0, 0); // Fußposition
    this.velocityY = 0;
    this.grounded = true;

    this.yaw = 0;
    this.pitch = 0;

    this.hp = MAX_HP;
    this.maxHp = MAX_HP;
    this.alive = true;

    this.isMoving = false;
    this.isSprinting = false;
    this.bobPhase = 0;

    this.isLocked = false;

    // Unsichtbare Hitbox, an der Bots ihre Treffer-Raycasts ausrichten.
    const hitGeo = new THREE.BoxGeometry(PLAYER_RADIUS * 2, PLAYER_HEIGHT, PLAYER_RADIUS * 2);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.hitMesh.visible = false;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
  }

  requestLock() {
    if (document.pointerLockElement !== this.domElement) {
      this.domElement.requestPointerLock();
    }
  }

  _onPointerLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
  }

  _onMouseMove(e) {
    if (!this.isLocked) return;
    this.yaw -= e.movementX * MOUSE_SENS;
    this.pitch -= e.movementY * MOUSE_SENS;
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  spawn(position) {
    this.position.copy(position);
    this.position.y = 0;
    this.velocityY = 0;
    this.grounded = true;
    this.hp = this.maxHp;
    this.alive = true;
  }

  takeDamage(amount) {
    if (!this.alive) return { died: false };
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return { died: true };
    }
    return { died: false };
  }

  getEyePosition(target = new THREE.Vector3()) {
    return target.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
  }

  /**
   * @param {number} dt Delta-Zeit in Sekunden
   * @param {object} keys Aktueller Tastatur-Zustand { forward, back, left, right, jump, sprint }
   * @param {THREE.Box3[]} wallBoxes Kollisionsboxen der aktuellen Map
   * @param {object} bounds { half } Arena-Grenzen
   * @param {number} extraPitch Zusätzlicher Pitch-Offset (z.B. Waffen-Recoil)
   */
  update(dt, keys, wallBoxes, bounds, extraPitch = 0) {
    if (!this.alive) {
      this._applyCamera(extraPitch);
      return;
    }

    // --- Bewegungsrichtung relativ zur Blickrichtung (nur horizontal) ---
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);

    let moveX = 0;
    let moveZ = 0;
    if (keys.forward) { moveX += forward.x; moveZ += forward.z; }
    if (keys.back) { moveX -= forward.x; moveZ -= forward.z; }
    if (keys.right) { moveX += right.x; moveZ += right.z; }
    if (keys.left) { moveX -= right.x; moveZ -= right.z; }

    const moveLen = Math.hypot(moveX, moveZ);
    this.isMoving = moveLen > 0.001 && this.grounded;
    this.isSprinting = this.isMoving && keys.sprint && keys.forward;

    let speed = WALK_SPEED * (this.isSprinting ? SPRINT_MULT : 1);

    if (moveLen > 0.001) {
      moveX /= moveLen;
      moveZ /= moveLen;
      const half = bounds.half;
      const { x, z } = resolveMove(
        wallBoxes,
        this.position,
        moveX * speed * dt,
        moveZ * speed * dt,
        this.position.y,
        PLAYER_HEIGHT,
        PLAYER_RADIUS
      );
      this.position.x = THREE.MathUtils.clamp(x, -half, half);
      this.position.z = THREE.MathUtils.clamp(z, -half, half);
    }

    // --- Vertikale Bewegung: Schwerkraft + Sprung ---
    if (this.grounded && keys.jump) {
      this.velocityY = JUMP_SPEED;
      this.grounded = false;
    }
    this.velocityY -= GRAVITY * dt;
    this.position.y += this.velocityY * dt;
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocityY = 0;
      this.grounded = true;
    }

    // --- Head-Bobbing ---
    if (this.isMoving) {
      const freq = BOB_FREQ * (this.isSprinting ? 1.25 : 1);
      this.bobPhase += dt * freq;
    } else {
      // sanft zur Ruhelage zurückkehren
      const rest = Math.round(this.bobPhase / Math.PI) * Math.PI;
      this.bobPhase += (rest - this.bobPhase) * Math.min(1, dt * 8);
    }
    const bobY = this.grounded ? Math.abs(Math.sin(this.bobPhase)) * BOB_AMP : 0;
    const bobX = this.grounded ? Math.cos(this.bobPhase * 0.5) * BOB_AMP * 0.6 : 0;

    this._applyCamera(extraPitch, bobX, bobY);

    // Hitbox für Bot-Raycasts mitführen
    this.hitMesh.position.set(this.position.x, this.position.y + PLAYER_HEIGHT / 2, this.position.z);
  }

  _applyCamera(extraPitch, bobX = 0, bobY = 0) {
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch + extraPitch;
    this.camera.rotation.z = 0;
    this.camera.position.set(
      this.position.x + bobX,
      this.position.y + EYE_HEIGHT + bobY,
      this.position.z
    );
  }

  isGroundedAndMoving() {
    return this.grounded && this.isMoving;
  }
}

export { EYE_HEIGHT, PLAYER_HEIGHT, PLAYER_RADIUS, MAX_HP };
