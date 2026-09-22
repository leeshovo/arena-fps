// main.js — Einstiegspunkt: Rendering-Setup, Input-Handling, Game-Loop, Rundensteuerung.
import * as THREE from "three";
import { MAPS, buildMap, disposeMap } from "./maps.js";
import { Player, MAX_HP as PLAYER_DEFAULT_MAX_HP } from "./player.js";
import { WeaponSystem, SLOT } from "./weapons.js";
import { createBots, disposeBots } from "./bots.js";
import * as UI from "./ui.js";

const ROUND_DURATION = 90;
const BOT_COUNT = 4;
const BASE_FOV = 78;

// --- Spielmodi (an Roblox Rivals angelehnt, an das feste 4-Waffen-Loadout angepasst) -------------
const MODES = [
  {
    id: "normal",
    name: "Duell",
    description: "Klassisches Free-for-All gegen Bots, 90 Sekunden.",
  },
  {
    id: "gungame",
    name: "Gun Game",
    description: "Jede Elimination schaltet die nächste Waffe frei. Alle 4 durch = Sieg.",
    lockWeaponProgression: true,
  },
  {
    id: "juggernaut",
    name: "Juggernaut",
    description: "400 HP, aber langsamer. Überlebe die Bot-Übermacht.",
    playerMaxHp: 400,
    playerSpeedMult: 0.85,
  },
  {
    id: "swift",
    name: "Swift Standoff",
    description: "1 HP für alle. Ein Treffer = eliminiert.",
    playerMaxHp: 1,
    botMaxHp: 1,
  },
  {
    id: "chicken",
    name: "Chicken Game",
    description: "Rotlicht/Grünlicht: bei Rot nicht bewegen oder schießen!",
  },
];

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/** true, wenn beim Chicken Game gerade Rotlicht ist (jede Aktion = sofortiges Aus). */
function isChickenRedViolation() {
  return roundActive && currentMode.id === "chicken" && chickenPhase === "red" && player.alive;
}

// --- Renderer / Szene / Kamera ---------------------------------------------------------
const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.05, 200);
// Kamera muss Teil des Szenengraphs sein, damit an sie gehängte Objekte
// (Waffen-Viewmodels, Mündungsblitz) beim Rendern überhaupt durchlaufen werden.
scene.add(camera);

// Helle, weiche, nahezu schattenlose Studio-Ausleuchtung (steril statt düster)
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb9c2cc, 1.25);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.65);
sunLight.position.set(18, 30, 12);
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
fillLight.position.set(-16, 14, -12);
scene.add(fillLight);
const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
fillLight2.position.set(0, 10, -20);
scene.add(fillLight2);

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

// Modus-Status
let currentMode = MODES[0];
let gunGameStage = 0; // 0=Gewehr,1=Pistole,2=Messer,3=Utility -> entspricht SLOT-Werten
let chickenPhase = "green";
let chickenTimer = 0;

// --- Input ---------------------------------------------------------------------------
const keys = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, slide: false };

const KEY_MAP = {
  KeyW: "forward",
  KeyS: "back",
  KeyA: "left",
  KeyD: "right",
  Space: "jump",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  ControlLeft: "slide",
  ControlRight: "slide",
  KeyC: "slide",
};

window.addEventListener("keydown", (e) => {
  if (KEY_MAP[e.code]) {
    keys[KEY_MAP[e.code]] = true;
    if (e.code === "Space") e.preventDefault();
  }
  if (!roundActive || !player.alive) return;
  if (e.code === "Digit1") trySwitchWeapon(() => weapons.switchTo(SLOT.PRIMARY));
  else if (e.code === "Digit2") trySwitchWeapon(() => weapons.switchTo(SLOT.SECONDARY));
  else if (e.code === "Digit3") trySwitchWeapon(() => weapons.switchTo(SLOT.MELEE));
  else if (e.code === "Digit4") trySwitchWeapon(() => weapons.switchTo(SLOT.UTILITY));
  else if (e.code === "KeyR") weapons.reload();
  else if (e.code === "KeyF") {
    if (isChickenRedViolation()) return killPlayerInstant("Vom Rotlicht erwischt!");
    if (!currentMode.lockWeaponProgression || gunGameStage === SLOT.MELEE) weapons.meleeAttack(bots);
  } else if (e.code === "KeyG") {
    if (isChickenRedViolation()) return killPlayerInstant("Vom Rotlicht erwischt!");
    if (!currentMode.lockWeaponProgression || gunGameStage === SLOT.UTILITY) weapons.throwUtility();
  }
});

window.addEventListener("keyup", (e) => {
  if (KEY_MAP[e.code]) keys[KEY_MAP[e.code]] = false;
});

canvas.addEventListener("mousedown", (e) => {
  if (!player.isLocked) {
    player.requestLock();
    return;
  }
  if (!player.alive) return;
  if (isChickenRedViolation()) return killPlayerInstant("Vom Rotlicht erwischt!");
  if (e.button === 0) weapons.startFire();
  else if (e.button === 2) {
    // Rechtsklick: Zielen (ADS) beim Sturmgewehr (halten), sonst Einzel-Fähigkeit (Fächerschuss/Heavy)
    if (weapons.currentIndex === SLOT.PRIMARY) weapons.setAiming(true);
    else weapons.rightClickPress(bots);
  }
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 0) weapons.stopFire();
  else if (e.button === 2) weapons.setAiming(false);
});
window.addEventListener("blur", () => {
  weapons.stopFire();
  weapons.setAiming(false);
});
document.addEventListener("pointerlockchange", () => {
  if (!player.isLocked) {
    weapons.stopFire();
    weapons.setAiming(false);
  }
});

window.addEventListener(
  "wheel",
  (e) => {
    if (!roundActive || !player.alive || !player.isLocked) return;
    trySwitchWeapon(() => weapons.switchNext(e.deltaY > 0 ? 1 : -1));
  },
  { passive: true }
);

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

/**
 * Führt einen Waffenwechsel aus und triggert bei Erfolg die Triple-Jump-Tech: wechselt man in der Luft
 * auf eine leichte Waffe (Pistole/Messer), gibt es einen Extra-Sprung — pro Waffe nur einmal pro Sprung.
 */
function trySwitchWeapon(switchFn) {
  if (currentMode.lockWeaponProgression) return; // Gun Game: Waffe wird nur per Elimination freigeschaltet
  if (!switchFn()) return;
  const def = weapons.currentDef();
  if (def.grantsAirJump && !player.grounded && player.alive && player.canUseSwapJump(def.id)) {
    player.grantExtraJump();
    player.consumeSwapJump(def.id);
  }
}

// --- Rundensteuerung -------------------------------------------------------------------
function startRound(mapDef, modeDef = MODES[0]) {
  if (currentMapData) {
    disposeMap(scene, currentMapData);
    disposeBots(scene, bots);
  }

  currentMode = modeDef;
  gunGameStage = 0;
  chickenPhase = "green";
  chickenTimer = randomRange(3, 5);

  currentMapData = buildMap(scene, mapDef);
  weapons.setWallMeshes(currentMapData.wallMeshes);
  weapons.resetForRound();

  bots = createBots(scene, BOT_COUNT, currentMapData);
  botKillCounts = new Map(bots.map((b) => [b.id, 0]));
  if (modeDef.botMaxHp) {
    for (const b of bots) {
      b.maxHp = modeDef.botMaxHp;
      b.hp = modeDef.botMaxHp;
    }
  }

  player.maxHp = modeDef.playerMaxHp || PLAYER_DEFAULT_MAX_HP;
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
  UI.setChickenBanner(modeDef.id === "chicken", chickenPhase);

  player.requestLock();
}

function getModeBannerText() {
  switch (currentMode.id) {
    case "gungame":
      return `GUN GAME — Waffe ${gunGameStage + 1}/4`;
    case "juggernaut":
      return "JUGGERNAUT — überlebe die Bot-Übermacht";
    case "swift":
      return "SWIFT STANDOFF — 1 HP für alle";
    default:
      return null;
  }
}

function endRound(title) {
  roundActive = false;
  weapons.stopFire();
  weapons.setAiming(false);
  if (document.pointerLockElement === canvas) document.exitPointerLock();

  const botStats = bots.map((b) => ({ name: b.name, kills: botKillCounts.get(b.id) || 0 }));
  UI.showRoundEnd(
    score.player,
    score.bots,
    botStats,
    () => {
      disposeMap(scene, currentMapData);
      disposeBots(scene, bots);
      currentMapData = null;
      bots = [];
      UI.hideHud();
      UI.showMainMenu(MAPS, MODES, startRound);
    },
    title
  );
}

/** Sofortiges Aus ohne Schadenswert (Chicken-Game-Regelverstoß). */
function killPlayerInstant(reason) {
  if (!player.alive) return;
  UI.flashDamage();
  player.hp = 0;
  player.alive = false;
  weapons.stopFire();
  weapons.setAiming(false);
  deathRespawnTimer = 3;
  UI.showDeathScreen(reason);
  score.bots += 1;
  UI.addKillFeed(reason, true);
}

function handlePlayerDamage(amount, attackerBot) {
  UI.flashDamage();
  const result = player.takeDamage(amount);
  if (result.died) {
    weapons.stopFire();
    weapons.setAiming(false);
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
      const speedMult = weapons.getMoveSpeedMultiplier() * (currentMode.playerSpeedMult || 1);
      player.update(dt, keys, currentMapData.wallBoxes, currentMapData.bounds, recoilPitch, speedMult);
    }

    const moveState = { isMoving: player.isMoving, isSprinting: player.isSprinting, grounded: player.grounded };
    weapons.update(dt, moveState, { bots, player });

    // ADS-Zoom sanft auf die Kamera anwenden
    const aimT = weapons.getAimProgress();
    const targetFov = THREE.MathUtils.lerp(BASE_FOV, weapons.getAdsFov(), aimT);
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

    for (const ev of weapons.drainEvents()) {
      if (ev.type === "explosionDamagePlayer") {
        if (ev.knockback) player.applyImpulse(ev.knockback); // Grenade-Boost-Tech
        if (ev.damage > 0) handlePlayerDamage(ev.damage, null);
        continue;
      }
      if (ev.hit) {
        UI.showHitmarker();
        if (ev.killed) {
          score.player += 1;
          const how = ev.isBackstab ? " (Backstab)" : ev.isExplosion ? " (Wurfladung)" : ev.isHead ? " (Kopfschuss)" : "";
          UI.addKillFeed(`Du hast ${ev.bot.name} eliminiert${how}`, false);

          if (currentMode.id === "gungame") {
            gunGameStage += 1;
            if (gunGameStage >= 4) {
              endRound("GUN GAME GEWONNEN!");
            } else {
              weapons.switchTo(gunGameStage);
            }
          }
        }
      }
    }

    // Chicken Game: Rotlicht/Grünlicht — bei Rot friert alles ein, Bewegung/Schuss = sofortiges Aus
    if (currentMode.id === "chicken" && player.alive) {
      chickenTimer -= dt;
      if (chickenTimer <= 0) {
        chickenPhase = chickenPhase === "green" ? "red" : "green";
        chickenTimer = chickenPhase === "red" ? randomRange(2, 4) : randomRange(3, 5);
      }
      UI.setChickenBanner(true, chickenPhase);

      if (isChickenRedViolation()) {
        const moving = keys.forward || keys.back || keys.left || keys.right || keys.jump || keys.slide;
        if (moving || weapons.triggerHeld || weapons.aiming) {
          killPlayerInstant("Vom Rotlicht erwischt!");
        }
      }
    }
    const botsFrozen = currentMode.id === "chicken" && chickenPhase === "red";

    // Bots aktualisieren (beim Chicken Game während Rot eingefroren)
    if (!botsFrozen) {
      for (const bot of bots) {
        const botEvents = bot.update(dt, player, currentMapData.wallBoxes, currentMapData.wallMeshes, currentMapData.bounds);
        for (const ev of botEvents) {
          if (ev.type === "hitPlayer") {
            handlePlayerDamage(ev.amount, bot);
          }
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
    UI.setAiming(hud.aiming);
    UI.setCrosshairSpread(hud.spread);
    UI.setModeBanner(getModeBannerText());
    UI.setTimer(roundTimeLeft);
    UI.setScore(score.player, score.bots);
    UI.setLockHintVisible(!player.isLocked);
  }

  renderer.render(scene, camera);
}

// --- Start ---------------------------------------------------------------------------
UI.initUI();
// Touch-Primärgeräte (Handy/Tablet) unterstützen kein Pointer Lock/WASD — nur Hinweis, kein Blocker.
if (window.matchMedia("(pointer: coarse)").matches) {
  UI.setMobileNotice(true);
}
UI.showMainMenu(MAPS, MODES, startRound);
animate();
