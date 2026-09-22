// main.js — Einstiegspunkt: Rendering-Setup, Input-Handling, Game-Loop, Rundensteuerung.
import * as THREE from "three";
import { MAPS, buildMap, disposeMap } from "./maps.js";
import { Player } from "./player.js";
import { WeaponSystem, SLOT } from "./weapons.js";
import { createBots, disposeBots } from "./bots.js";
import * as UI from "./ui.js";

const ROUND_DURATION = 90;
const BOT_COUNT = 4;

// --- Renderer / Szene / Kamera ---------------------------------------------------------
const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.05, 200);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8892a0, 0.9);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.05);
sunLight.position.set(18, 30, 12);
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
fillLight.position.set(-14, 12, -10);
scene.add(fillLight);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Gameplay-Objekte --------------------------------------------------------------------
const player = new Player(camera, canvas);
const weapons = new WeaponSystem(camera, scene);

let currentMapData = null;
let bots = [];
let botKillCounts = new Map();
let score = { player: 0, bots: 0 };
let roundTimeLeft = ROUND_DURATION;
let roundActive = false;
let deathRespawnTimer = 0;

// --- Input ---------------------------------------------------------------------------
const keys = { forward: false, back: false, left: false, right: false, jump: false, sprint: false };

const KEY_MAP = {
  KeyW: "forward",
  KeyS: "back",
  KeyA: "left",
  KeyD: "right",
  Space: "jump",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
};

window.addEventListener("keydown", (e) => {
  if (KEY_MAP[e.code]) {
    keys[KEY_MAP[e.code]] = true;
    if (e.code === "Space") e.preventDefault();
  }
  if (!roundActive || !player.alive) return;
  if (e.code === "Digit1") weapons.switchTo(SLOT.PRIMARY);
  else if (e.code === "Digit2") weapons.switchTo(SLOT.SECONDARY);
  else if (e.code === "Digit3") weapons.switchTo(SLOT.MELEE);
  else if (e.code === "Digit4") weapons.switchTo(SLOT.UTILITY);
  else if (e.code === "KeyR") weapons.reload();
  else if (e.code === "KeyF") weapons.meleeAttack(bots);
  else if (e.code === "KeyG") weapons.throwUtility();
});

window.addEventListener("keyup", (e) => {
  if (KEY_MAP[e.code]) keys[KEY_MAP[e.code]] = false;
});

canvas.addEventListener("mousedown", (e) => {
  if (!player.isLocked) {
    player.requestLock();
    return;
  }
  if (e.button === 0 && player.alive) weapons.startFire();
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 0) weapons.stopFire();
});
window.addEventListener("blur", () => weapons.stopFire());
document.addEventListener("pointerlockchange", () => {
  if (!player.isLocked) weapons.stopFire();
});

window.addEventListener(
  "wheel",
  (e) => {
    if (!roundActive || !player.alive || !player.isLocked) return;
    weapons.switchNext(e.deltaY > 0 ? 1 : -1);
  },
  { passive: true }
);

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// --- Rundensteuerung -------------------------------------------------------------------
function startRound(mapDef) {
  if (currentMapData) {
    disposeMap(scene, currentMapData);
    disposeBots(scene, bots);
  }

  currentMapData = buildMap(scene, mapDef);
  weapons.setWallMeshes(currentMapData.wallMeshes);
  weapons.resetForRound();

  bots = createBots(scene, BOT_COUNT, currentMapData);
  botKillCounts = new Map(bots.map((b) => [b.id, 0]));

  const spawn = currentMapData.spawnPoints[Math.floor(Math.random() * currentMapData.spawnPoints.length)];
  player.spawn(spawn);
  scene.add(player.hitMesh);

  score = { player: 0, bots: 0 };
  roundTimeLeft = ROUND_DURATION;
  roundActive = true;
  deathRespawnTimer = 0;

  UI.hideMainMenu();
  UI.hideRoundEnd();
  UI.hideDeathScreen();
  UI.showHud();

  player.requestLock();
}

function endRound() {
  roundActive = false;
  weapons.stopFire();
  if (document.pointerLockElement === canvas) document.exitPointerLock();

  const botStats = bots.map((b) => ({ name: b.name, kills: botKillCounts.get(b.id) || 0 }));
  UI.showRoundEnd(score.player, score.bots, botStats, () => {
    disposeMap(scene, currentMapData);
    disposeBots(scene, bots);
    currentMapData = null;
    bots = [];
    UI.hideHud();
    UI.showMainMenu(MAPS, startRound);
  });
}

function handlePlayerDamage(amount, attackerBot) {
  UI.flashDamage();
  const result = player.takeDamage(amount);
  if (result.died) {
    weapons.stopFire();
    deathRespawnTimer = 3;
    const label = attackerBot ? attackerBot.name : "deiner eigenen Wurfladung";
    UI.showDeathScreen(label);
    score.bots += 1;
    if (attackerBot) {
      botKillCounts.set(attackerBot.id, (botKillCounts.get(attackerBot.id) || 0) + 1);
      UI.addKillFeed(`${attackerBot.name} hat dich eliminiert`, true);
    } else {
      UI.addKillFeed(`Du wurdest von deiner eigenen Wurfladung eliminiert`, true);
    }
  }
}

// --- Game Loop ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  if (roundActive) {
    if (player.alive) {
      const recoilPitch = weapons.getRecoilPitch();
      player.update(dt, keys, currentMapData.wallBoxes, currentMapData.bounds, recoilPitch);
    }

    const moveState = { isMoving: player.isMoving, isSprinting: player.isSprinting, grounded: player.grounded };
    weapons.update(dt, moveState, { bots, player });

    for (const ev of weapons.drainEvents()) {
      if (ev.type === "explosionDamagePlayer") {
        handlePlayerDamage(ev.damage, null);
        continue;
      }
      if (ev.hit) {
        UI.showHitmarker();
        if (ev.killed) {
          score.player += 1;
          const how = ev.isExplosion ? " (Wurfladung)" : ev.isHead ? " (Kopfschuss)" : "";
          UI.addKillFeed(`Du hast ${ev.bot.name} eliminiert${how}`, false);
        }
      }
    }

    // Bots aktualisieren
    for (const bot of bots) {
      const botEvents = bot.update(dt, player, currentMapData.wallBoxes, currentMapData.wallMeshes, currentMapData.bounds);
      for (const ev of botEvents) {
        if (ev.type === "hitPlayer") {
          handlePlayerDamage(ev.amount, bot);
        }
      }
    }

    // Spieler-Respawn
    if (!player.alive) {
      deathRespawnTimer -= dt;
      UI.updateRespawnCountdown(deathRespawnTimer);
      if (deathRespawnTimer <= 0) {
        const spawn = currentMapData.spawnPoints[Math.floor(Math.random() * currentMapData.spawnPoints.length)];
        player.spawn(spawn);
        UI.hideDeathScreen();
      }
    }

    // Rundentimer
    roundTimeLeft -= dt;
    if (roundTimeLeft <= 0) {
      roundTimeLeft = 0;
      endRound();
    }

    // HUD synchronisieren
    const hud = weapons.getHUDState();
    UI.setHealth(player.hp, player.maxHp);
    UI.setAmmo(hud);
    UI.setCooldowns(hud.meleeCooldownPct, hud.utilityCooldownPct);
    UI.setCrosshairSpread(hud.spread);
    UI.setTimer(roundTimeLeft);
    UI.setScore(score.player, score.bots);
    UI.setLockHintVisible(!player.isLocked);
  }

  renderer.render(scene, camera);
}

// --- Start ---------------------------------------------------------------------------
UI.initUI();
UI.showMainMenu(MAPS, startRound);
animate();
