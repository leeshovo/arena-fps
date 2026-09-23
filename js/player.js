// player.js — Spielerbewegung, Pointer-Lock-Maussteuerung, Kollision, Head-Bobbing, Gesundheit.
// Bewusst kontrolliert statt twitchy: WASD+Sprint, ein Doppelsprung, eine Boden-Slide und ein
// kurzer Dash mit Cooldown decken die Bewegungstiefe ab, ohne auf reine Reflexe zu setzen.
import * as THREE from "three";
import { resolveMove } from "./maps.js";

const EYE_HEIGHT = 1.7;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.4;
const WALK_SPEED = 6.0;
const SPRINT_MULT = 1.6;
const JUMP_SPEED = 7.5;
const DOUBLE_JUMP_MULT = 0.88;
const GRAVITY = 22;
const MOUSE_SENS = 0.0022;
const BOB_FREQ = 11.5;
const BOB_AMP = 0.045;
const MAX_HP = 100;

// Slide: sprinten, Slide-Taste, Momentum-Burst der graduell abbremst; Sprung währenddessen
// trägt den Schwung in die Luft.
const SLIDE_BURST_MULT = 1.9;
const SLIDE_END_SPEED_MULT = 0.65;
const SLIDE_DURATION = 0.55;
const SLIDE_COOLDOWN = 0.5;
const CROUCH_HEIGHT_MULT = 0.55;
const CROUCH_EYE_MULT = 0.62;
const CROUCH_LERP_SPEED = 10;

// Dash: kurzer, schneller Bewegungsschub in Blick-/Laufrichtung zum Ausweichen/Repositionieren.
const DASH_SPEED = 15.5;
const DASH_DURATION = 0.16;
const DASH_COOLDOWN = 4.0;

// Explosions-Rückstoß (z.B. nahe eigene Wurfladung): klingt über Zeit ab.
const EXTERNAL_DECAY = 0.05; // Anteil, der nach 1 Sekunde noch übrig ist

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.position = new THREE.Vector3(0, 0, 0); // Fußposition
    this.velocityY = 0;
    this.grounded = true;
    this.airJumpsUsed = 0;

    this.yaw = 0;
    this.pitch = 0;

    this.hp = MAX_HP;
    this.maxHp = MAX_HP;
    this.alive = true;
    this.team = "blue"; // von main.js je nach Modus gesetzt

    this.isMoving = false;
    this.isSprinting = false;
    this.bobPhase = 0;

    // Slide
    this.sliding = false;
    this.slideTimer = 0;
    this.slideCooldown = 0;
    this.slideDir = new THREE.Vector3();
    this.slideInitialSpeed = 0;
    this.crouchLerp = 0;
    this._prevSlideKey = false;
    this._prevJumpKey = false;

    // Dash
    this.dashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDir = new THREE.Vector3();
    this._prevDashKey = false;

    // Explosions-Rückstoß: abklingender externer Geschwindigkeits-Impuls
    this.externalVelocity = new THREE.Vector3();

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
    this.airJumpsUsed = 0;
    this.hp = this.maxHp;
    this.alive = true;
    this.sliding = false;
    this.slideTimer = 0;
    this.slideCooldown = 0;
    this.crouchLerp = 0;
    this.dashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.externalVelocity.set(0, 0, 0);
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

  /** Wirkt einen externen Geschwindigkeits-Impuls (z.B. Explosions-Rückstoß). Klingt über Zeit ab. */
  applyImpulse(vec) {
    this.externalVelocity.x += vec.x;
    this.externalVelocity.z += vec.z;
    this.velocityY += vec.y;
    if (vec.y > 0) this.grounded = false;
  }

  /** true, wenn der Dash gerade einsatzbereit ist (für die HUD-Cooldown-Anzeige). */
  getDashCooldownPct() {
    return 1 - Math.min(1, this.dashCooldown / DASH_COOLDOWN);
  }

  /**
   * @param {number} dt Delta-Zeit in Sekunden
   * @param {object} keys Aktueller Tastatur-Zustand { forward, back, left, right, jump, sprint, slide, dash }
   * @param {THREE.Box3[]} wallBoxes Kollisionsboxen der aktuellen Map
   * @param {object} bounds { half } Arena-Grenzen
   * @param {number} extraPitch Zusätzlicher Pitch-Offset (z.B. Waffen-Recoil)
   * @param {number} weaponSpeedMult Move-Speed-Multiplikator der aktuell getragenen Waffe
   * @param {number} extraYaw Zusätzlicher Yaw-Offset (Recoil-Pattern)
   */
  update(dt, keys, wallBoxes, bounds, extraPitch = 0, weaponSpeedMult = 1, extraYaw = 0) {
    if (!this.alive) {
      this._applyCamera(extraPitch, extraYaw);
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

    const speed = WALK_SPEED * weaponSpeedMult * (this.isSprinting ? SPRINT_MULT : 1);

    // --- Slide: sprinten, Slide-Taste (Strg/C) drücken, optional direkt springen ---
    const slidePressed = keys.slide && !this._prevSlideKey;
    this._prevSlideKey = keys.slide;
    if (slidePressed && !this.sliding && this.slideCooldown <= 0 && this.grounded && this.isSprinting) {
      this.sliding = true;
      this.slideTimer = SLIDE_DURATION;
      this.slideInitialSpeed = speed * SLIDE_BURST_MULT;
      this.slideDir.set(moveLen > 0.001 ? moveX / moveLen : forward.x, 0, moveLen > 0.001 ? moveZ / moveLen : forward.z);
    }

    // --- Dash: kurzer Burst in Bewegungs-/Blickrichtung, unabhängig von Sprint/Slide ---
    const dashPressed = keys.dash && !this._prevDashKey;
    this._prevDashKey = keys.dash;
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashJustStarted = false;
    if (dashPressed && !this.dashing && this.dashCooldown <= 0) {
      this.dashing = true;
      this.dashJustStarted = true;
      this.dashTimer = DASH_DURATION;
      this.dashCooldown = DASH_COOLDOWN;
      this.sliding = false;
      this.dashDir.set(moveLen > 0.001 ? moveX / moveLen : forward.x, 0, moveLen > 0.001 ? moveZ / moveLen : forward.z);
    }

    const half = bounds.half;
    const effHeight = THREE.MathUtils.lerp(PLAYER_HEIGHT, PLAYER_HEIGHT * CROUCH_HEIGHT_MULT, this.crouchLerp);

    // Basisbewegung: Dash > Slide > normales WASD (Priorität, nicht additiv)
    let baseDx = 0;
    let baseDz = 0;
    if (this.dashing) {
      baseDx = this.dashDir.x * DASH_SPEED * dt;
      baseDz = this.dashDir.z * DASH_SPEED * dt;
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) this.dashing = false;
    } else if (this.sliding) {
      const t = 1 - this.slideTimer / SLIDE_DURATION;
      const curSpeed = THREE.MathUtils.lerp(this.slideInitialSpeed, this.slideInitialSpeed * SLIDE_END_SPEED_MULT, t);
      baseDx = this.slideDir.x * curSpeed * dt;
      baseDz = this.slideDir.z * curSpeed * dt;

      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.sliding = false;
        this.slideCooldown = SLIDE_COOLDOWN;
      }
    } else {
      if (moveLen > 0.001) {
        const nx = moveX / moveLen;
        const nz = moveZ / moveLen;
        baseDx = nx * speed * dt;
        baseDz = nz * speed * dt;
      }
      if (this.slideCooldown > 0) this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    }

    // Externer Impuls (z.B. Explosions-Rückstoß) abklingen lassen und mit einrechnen
    this.externalVelocity.multiplyScalar(Math.pow(EXTERNAL_DECAY, dt));
    const dx = baseDx + this.externalVelocity.x * dt;
    const dz = baseDz + this.externalVelocity.z * dt;
    if (dx !== 0 || dz !== 0) {
      const { x, z } = resolveMove(wallBoxes, this.position, dx, dz, this.position.y, effHeight, PLAYER_RADIUS);
      this.position.x = THREE.MathUtils.clamp(x, -half, half);
      this.position.z = THREE.MathUtils.clamp(z, -half, half);
    }

    // --- Vertikale Bewegung: Schwerkraft + Sprung + ein Doppelsprung in der Luft ---
    const jumpPressed = keys.jump && !this._prevJumpKey;
    this._prevJumpKey = keys.jump;
    const wasGrounded = this.grounded;
    if (this.grounded && jumpPressed) {
      this.velocityY = JUMP_SPEED;
      this.grounded = false;
    } else if (!this.grounded && jumpPressed && this.airJumpsUsed < 1) {
      this.velocityY = JUMP_SPEED * DOUBLE_JUMP_MULT;
      this.airJumpsUsed += 1;
    }
    this.velocityY -= GRAVITY * dt;
    this.position.y += this.velocityY * dt;
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocityY = 0;
      this.grounded = true;
    }
    if (!wasGrounded && this.grounded) {
      this.airJumpsUsed = 0; // Landung: Doppelsprung wieder frei
    }

    // --- Crouch/Slide-Höhe sanft an-/abgleiten lassen (macht den Spieler dabei ein kleineres Ziel) ---
    const crouchTarget = this.sliding ? 1 : 0;
    this.crouchLerp += (crouchTarget - this.crouchLerp) * Math.min(1, dt * CROUCH_LERP_SPEED);

    // --- Head-Bobbing (während Slide/Dash unterdrückt) ---
    if (this.isMoving && !this.sliding && !this.dashing) {
      const freq = BOB_FREQ * (this.isSprinting ? 1.25 : 1);
      this.bobPhase += dt * freq;
    } else {
      // sanft zur Ruhelage zurückkehren
      const rest = Math.round(this.bobPhase / Math.PI) * Math.PI;
      this.bobPhase += (rest - this.bobPhase) * Math.min(1, dt * 8);
    }
    const bobSuppress = 1 - this.crouchLerp;
    const bobY = this.grounded ? Math.abs(Math.sin(this.bobPhase)) * BOB_AMP * bobSuppress : 0;
    const bobX = this.grounded ? Math.cos(this.bobPhase * 0.5) * BOB_AMP * 0.6 * bobSuppress : 0;

    this._applyCamera(extraPitch, extraYaw, bobX, bobY);

    // Hitbox für Bot-Raycasts mitführen (schrumpft während des Slides -> schwerer zu treffen)
    const hitHeight = THREE.MathUtils.lerp(PLAYER_HEIGHT, PLAYER_HEIGHT * CROUCH_HEIGHT_MULT, this.crouchLerp);
    this.hitMesh.scale.y = hitHeight / PLAYER_HEIGHT;
    this.hitMesh.position.set(this.position.x, this.position.y + hitHeight / 2, this.position.z);
  }

  _applyCamera(extraPitch, extraYaw = 0, bobX = 0, bobY = 0) {
    const eyeH = THREE.MathUtils.lerp(EYE_HEIGHT, EYE_HEIGHT * CROUCH_EYE_MULT, this.crouchLerp);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw + extraYaw;
    this.camera.rotation.x = this.pitch + extraPitch;
    this.camera.rotation.z = 0;
    this.camera.position.set(
      this.position.x + bobX,
      this.position.y + eyeH + bobY,
      this.position.z
    );
  }

  isGroundedAndMoving() {
    return this.grounded && this.isMoving;
  }
}

export { EYE_HEIGHT, PLAYER_HEIGHT, PLAYER_RADIUS, MAX_HP };
