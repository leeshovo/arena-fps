// main.js — Einstiegspunkt: Rendering-Setup, Input-Handling, Game-Loop, Rundensteuerung,
// Menü-Navigation (Hauptmenü -> Loadout -> Modus/Map -> Match -> Rundenende -> Hauptmenü).
import * as THREE from "three";
import { MAPS, buildMap, disposeMap, updateMapDecor } from "./maps.js";
import { Player, MAX_HP as PLAYER_DEFAULT_MAX_HP } from "./player.js";
import { WeaponSystem, SLOT } from "./weapons.js";
import { createBots, disposeBots, TEAM, DIFFICULTY_PRESETS } from "./bots.js";
import * as UI from "./ui.js";
import * as Progression from "./progression.js";
import * as ChallengesModule from "./challenges.js";
import * as LoadoutModule from "./loadout.js";
import { Effects } from "./effects.js";
import * as Audio from "./audio.js";
import { createPostFX } from "./postfx.js";

const ROUND_DURATION = 90;
const BASE_FOV = 78;

// --- Spielmodi -----------------------------------------------------------------------
const MODES = [
  { id: "duel", name: "Duell", description: "1v1 gegen einen Bot. Erster auf 5 Eliminationen gewinnt.", botCount: 1, winScore: 5 },
  { id: "tdm", name: "Team-Deathmatch", description: "3v3: Du + 2 Bot-Verbündete gegen ein feindliches Bot-Team.", teams: true, allyCount: 2, enemyCount: 3, winScore: 30 },
  { id: "training", name: "Training", description: "Kein Zeitlimit — in Ruhe üben. Mit M jederzeit verlassen.", botCount: 4, noTimer: true },
  { id: "ffa", name: "Free-for-All", description: "Klassisches Free-for-All gegen 4 Bots, 90 Sekunden.", botCount: 4 },
  { id: "gungame", name: "Gun Game", description: "Jede Elimination schaltet die nächste Waffe frei. Alle 4 durch = Sieg.", botCount: 4, lockWeaponProgression: true },
  { id: "juggernaut", name: "Juggernaut", description: "400 HP, aber langsamer. Überlebe die Bot-Übermacht.", botCount: 4, playerMaxHp: 400, playerSpeedMult: 0.85 },
  { id: "swift", name: "Swift Standoff", description: "1 HP für alle. Ein Treffer = eliminiert.", botCount: 4, playerMaxHp: 1, botMaxHp: 1 },
  { id: "chicken", name: "Chicken Game", description: "Rotlicht/Grünlicht: bei Rot nicht bewegen oder schießen!", botCount: 4 },
];

const DIFFICULTIES = Object.entries(DIFFICULTY_PRESETS).map(([id, p]) => ({ id, name: p.name }));

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.05, 200);
// Kamera muss Teil des Szenengraphs sein, damit an sie gehängte Objekte
// (Waffen-Viewmodels, Mündungsblitz) beim Rendern überhaupt durchlaufen werden.
scene.add(camera);

// Helle, weiche, nahezu schattenlose Studio-Ausleuchtung + weiche Kontakt-Schatten
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb9c2cc, 1.25);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.75);
sunLight.position.set(18, 30, 12);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1536, 1536);
sunLight.shadow.camera.left = -35;
sunLight.shadow.camera.right = 35;
sunLight.shadow.camera.top = 35;
sunLight.shadow.camera.bottom = -35;
sunLight.shadow.camera.near = 5;
sunLight.shadow.camera.far = 70;
sunLight.shadow.bias = -0.0015;
sunLight.shadow.radius = 3;
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-16, 14, -12);
scene.add(fillLight);
const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.32);
fillLight2.position.set(0, 10, -20);
scene.add(fillLight2);

const postfx = createPostFX(renderer, scene, camera, window.innerWidth, window.innerHeight);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx.setSize(window.innerWidth, window.innerHeight);
});

// --- Gameplay-Objekte --------------------------------------------------------------------
const player = new Player(camera, canvas);
const effects = new Effects(scene);
let weapons = null;

let currentMapData = null;
let bots = [];
let botKillCounts = new Map();
let score = { player: 0, bots: 0 };
let roundTimeLeft = ROUND_DURATION;
let roundActive = false;
let deathRespawnTimer = 0;
let matchChallengeCompletions = [];
let wasGrounded = true;
let sprintDustTimer = 0;

// Modus-Status
let currentMode = MODES[0];
let currentDifficultyId = "normal";
let gunGameStage = 0; // 0=Gewehr,1=Pistole,2=Messer,3=Utility -> entspricht SLOT-Werten
let chickenPhase = "green";
let chickenTimer = 0;

function fireChallengeEvent(metric, amount = 1) {
  const completed = ChallengesModule.registerEvent(metric, amount);
  if (completed.length) {
    matchChallengeCompletions.push(...completed);
    Audio.playReward();
  }
}

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
  if (e.code === "KeyM" && roundActive) {
    endRound();
    return;
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
  Audio.resumeAudio();
  if (!player.isLocked) {
    player.requestLock();
    return;
  }
  if (!player.alive) return;
  if (isChickenRedViolation()) return killPlayerInstant("Vom Rotlicht erwischt!");
  if (e.button === 0) weapons.startFire();
  else if (e.button === 2) {
    if (weapons.currentIndex === SLOT.PRIMARY) weapons.setAiming(true);
    else weapons.rightClickPress(bots);
  }
});
window.addEventListener("mouseup", (e) => {
  if (!weapons) return; // Klicks in Menüs (vor Rundenstart) sollen hier keinen Fehler werfen
  if (e.button === 0) weapons.stopFire();
  else if (e.button === 2) weapons.setAiming(false);
});
window.addEventListener("blur", () => {
  if (weapons) {
    weapons.stopFire();
    weapons.setAiming(false);
  }
});
document.addEventListener("pointerlockchange", () => {
  if (!player.isLocked && weapons) {
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
 * auf eine leichte Waffe, gibt es einen Extra-Sprung — pro Waffe nur einmal pro Sprung.
 */
function trySwitchWeapon(switchFn) {
  if (currentMode.lockWeaponProgression) return;
  if (!switchFn()) return;
  Audio.playUiClick();
  const def = weapons.currentDef();
  if (def.grantsAirJump && !player.grounded && player.alive && player.canUseSwapJump(def.id)) {
    player.grantExtraJump();
    player.consumeSwapJump(def.id);
  }
}

// --- Menü-Navigation -------------------------------------------------------------------
function goToMainMenu() {
  UI.hideLoadoutScreen();
  UI.hideModeSelectScreen();
  UI.hideRoundEnd();
  UI.hideHud();
  UI.showMainMenu(goToLoadout, goToModeSelect);
}

function goToLoadout() {
  Audio.resumeAudio();
  UI.hideMainMenu();
  UI.showLoadoutScreen(goToMainMenu, goToModeSelect);
}

function goToModeSelect() {
  Audio.resumeAudio();
  UI.hideMainMenu();
  UI.hideLoadoutScreen();
  UI.showModeSelectScreen(MAPS, MODES, DIFFICULTIES, startRound, goToMainMenu);
}

// --- Rundensteuerung -------------------------------------------------------------------
function startRound(mapDef, modeDef, difficultyObj) {
  Audio.resumeAudio();
  if (currentMapData) {
    disposeMap(scene, currentMapData);
    disposeBots(scene, bots);
  }

  currentMode = modeDef;
  currentDifficultyId = difficultyObj.id;
  gunGameStage = 0;
  chickenPhase = "green";
  chickenTimer = randomRange(3, 5);
  matchChallengeCompletions = [];

  currentMapData = buildMap(scene, mapDef);

  const loadout = LoadoutModule.getLoadout();
  if (!weapons) {
    weapons = new WeaponSystem(camera, scene, loadout);
  } else {
    weapons.resetForRound(loadout);
  }
  weapons.setWallMeshes(currentMapData.wallMeshes);

  player.team = TEAM.BLUE;
  if (modeDef.teams) {
    const allies = createBots(scene, modeDef.allyCount, currentMapData, TEAM.BLUE, currentDifficultyId, 0);
    const enemies = createBots(scene, modeDef.enemyCount, currentMapData, TEAM.RED, currentDifficultyId, modeDef.allyCount);
    bots = [...allies, ...enemies];
  } else {
    bots = createBots(scene, modeDef.botCount || 4, currentMapData, TEAM.RED, currentDifficultyId, 0);
  }
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
  effects.clear();

  score = { player: 0, bots: 0 };
  roundTimeLeft = ROUND_DURATION;
  roundActive = true;
  deathRespawnTimer = 0;
  wasGrounded = true;

  UI.hideMainMenu();
  UI.hideLoadoutScreen();
  UI.hideModeSelectScreen();
  UI.hideRoundEnd();
  UI.hideDeathScreen();
  UI.showHud();
  UI.setLeaveHintVisible(true);
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
    case "duel":
      return `DUELL — Erster auf ${currentMode.winScore}`;
    case "tdm":
      return "TEAM-DEATHMATCH";
    case "training":
      return "TRAINING — kein Zeitlimit";
    default:
      return null;
  }
}

function checkWinCondition() {
  if (!currentMode.winScore || !roundActive) return;
  if (score.player >= currentMode.winScore) endRound("SIEG!");
  else if (score.bots >= currentMode.winScore) endRound("NIEDERLAGE");
}

function endRound(title) {
  roundActive = false;
  if (weapons) {
    weapons.stopFire();
    weapons.setAiming(false);
  }
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  UI.setLeaveHintVisible(false);

  fireChallengeEvent("matchesPlayed");
  const won = score.player > score.bots;
  if (won) fireChallengeEvent("roundWins");

  const baseXp = 40 + score.player * 15;
  const baseCurrency = 15 + score.player * 5;
  const bonus = won ? { xp: 60, currency: 25 } : { xp: 0, currency: 0 };
  const rewardResult = Progression.grantRewards(baseXp + bonus.xp, baseCurrency + bonus.currency);
  if (rewardResult.leveledUp || rewardResult.newlyUnlocked.length) Audio.playReward();

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
      goToMainMenu();
    },
    title,
    rewardResult,
    matchChallengeCompletions
  );
}

/** Sofortiges Aus ohne Schadenswert (Chicken-Game-Regelverstoß). */
function killPlayerInstant(reason) {
  if (!player.alive) return;
  UI.flashDamage();
  postfx.pulseAberration(0.01);
  Audio.playDeath();
  player.hp = 0;
  player.alive = false;
  weapons.stopFire();
  weapons.setAiming(false);
  deathRespawnTimer = 3;
  UI.showDeathScreen(reason);
  score.bots += 1;
  UI.addKillFeed(reason, true);
  checkWinCondition();
}

function handlePlayerDamage(amount, attackerBot) {
  UI.flashDamage();
  postfx.pulseAberration(0.012);
  const result = player.takeDamage(amount);
  if (result.died) {
    Audio.playDeath();
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
    checkWinCondition();
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
      const wasJumping = keys.jump && player.grounded;
      player.update(dt, keys, currentMapData.wallBoxes, currentMapData.bounds, recoilPitch, speedMult);
      if (wasJumping && !player.grounded) Audio.playJump();

      // Lande-/Sprintstaub (rein optisches Feedback)
      if (!wasGrounded && player.grounded) {
        effects.burstDust(player.position, 9, 0.4, 1.8);
        Audio.playLand();
      }
      wasGrounded = player.grounded;
      if (player.isSprinting && player.grounded) {
        sprintDustTimer -= dt;
        if (sprintDustTimer <= 0) {
          effects.footDust(new THREE.Vector3(player.position.x, player.position.y + 0.05, player.position.z));
          sprintDustTimer = 0.14;
        }
      }
    }

    const moveState = { isMoving: player.isMoving, isSprinting: player.isSprinting, grounded: player.grounded };
    weapons.update(dt, moveState, { bots, player });
    effects.update(dt);
    updateMapDecor(currentMapData, dt);

    // ADS-Zoom sanft auf die Kamera anwenden
    const aimT = weapons.getAimProgress();
    const targetFov = THREE.MathUtils.lerp(BASE_FOV, weapons.getAdsFov(), aimT);
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

    for (const ev of weapons.drainEvents()) {
      if (ev.type === "explosionDamagePlayer") {
        if (ev.knockback) player.applyImpulse(ev.knockback);
        postfx.shakeCamera(0.03, 0.3);
        if (ev.damage > 0) handlePlayerDamage(ev.damage, null);
        continue;
      }
      if (ev.type === "healPlayer") {
        player.hp = Math.min(player.maxHp, player.hp + ev.amount);
        Audio.playReward();
        continue;
      }
      if (ev.hit) {
        UI.showHitmarker(ev.isHead);
        if (ev.isHead) Audio.playHeadshot();
        else Audio.playHitmarker();
        if (ev.isExplosion) postfx.shakeCamera(0.02, 0.2);
        if (ev.isMelee) postfx.shakeCamera(0.012, 0.12);

        if (ev.killed) {
          score.player += 1;
          const how = ev.isBackstab ? " (Backstab)" : ev.isExplosion ? " (Wurfladung)" : ev.isHead ? " (Kopfschuss)" : "";
          UI.addKillFeed(`Du hast ${ev.bot.name} eliminiert${how}`, false);

          fireChallengeEvent("eliminations");
          if (ev.isHead) fireChallengeEvent("headshots");
          if (ev.isBackstab) fireChallengeEvent("backstabs");
          if (ev.isExplosion) fireChallengeEvent("utilityKills");
          if (ev.isMelee) fireChallengeEvent("meleeKills");

          if (currentMode.id === "gungame") {
            gunGameStage += 1;
            if (gunGameStage >= 4) {
              endRound("GUN GAME GEWONNEN!");
            } else {
              weapons.switchTo(gunGameStage);
            }
          }
          checkWinCondition();
        }
      }
    }

    // Chicken Game: Rotlicht/Grünlicht
    if (currentMode.id === "chicken" && player.alive) {
      chickenTimer -= dt;
      if (chickenTimer <= 0) {
        chickenPhase = chickenPhase === "green" ? "red" : "green";
        chickenTimer = chickenPhase === "red" ? randomRange(2, 4) : randomRange(3, 5);
      }
      UI.setChickenBanner(true, chickenPhase);
      if (chickenPhase === "red") {
        const moving = keys.forward || keys.back || keys.left || keys.right || keys.jump || keys.slide;
        if (moving || weapons.triggerHeld || weapons.aiming) killPlayerInstant("Vom Rotlicht erwischt!");
      }
    }
    const botsFrozen = currentMode.id === "chicken" && chickenPhase === "red";

    // Bots aktualisieren (Team-Kämpfe inkl. Bot-vs-Bot, Rauch blockiert Sicht)
    if (!botsFrozen && roundActive) {
      const smokeVolumes = weapons.getSmokeVolumes();
      for (const bot of bots) {
        const botEvents = bot.update(dt, player, bots, currentMapData.wallBoxes, currentMapData.wallMeshes, currentMapData.bounds, smokeVolumes);
        for (const ev of botEvents) {
          if (ev.type === "hitPlayer") {
            handlePlayerDamage(ev.amount, bot);
          } else if (ev.type === "hitBot" && ev.killed) {
            const killerIsBlue = bot.team === TEAM.BLUE;
            if (killerIsBlue) score.player += 1;
            else score.bots += 1;
            botKillCounts.set(bot.id, (botKillCounts.get(bot.id) || 0) + 1);
            UI.addKillFeed(`${bot.name} hat ${ev.target.name} eliminiert`, !killerIsBlue);
            if (killerIsBlue && ev.assistTag === "player") fireChallengeEvent("assists");
            checkWinCondition();
          }
        }
      }
    }

    // Spieler-Respawn
    if (!player.alive && roundActive) {
      deathRespawnTimer -= dt;
      UI.updateRespawnCountdown(deathRespawnTimer);
      if (deathRespawnTimer <= 0) {
        const spawn = currentMapData.spawnPoints[Math.floor(Math.random() * currentMapData.spawnPoints.length)];
        player.spawn(spawn);
        Audio.playRespawn();
        UI.hideDeathScreen();
      }
    }

    // Rundentimer
    if (roundActive && !currentMode.noTimer) {
      roundTimeLeft -= dt;
      if (roundTimeLeft <= 0) {
        roundTimeLeft = 0;
        endRound();
      }
    }

    if (roundActive) {
      // HUD synchronisieren
      const hud = weapons.getHUDState();
      UI.setHealth(player.hp, player.maxHp);
      UI.setAmmo(hud);
      UI.setCooldowns(hud.meleeCooldownPct, hud.utilityCooldownPct);
      UI.setAiming(hud.aiming);
      UI.setCrosshairSpread(hud.spread);
      UI.setModeBanner(getModeBannerText());
      UI.setTimer(roundTimeLeft, currentMode.noTimer);
      UI.setScore(score.player, score.bots);
      UI.setLockHintVisible(!player.isLocked);
    }
  }

  // Post-FX: Chromatic-Aberration-Abklingen + Screen-Shake auf die Kamera anwenden
  const shake = postfx.update(dt);
  camera.position.x += shake.x;
  camera.position.y += shake.y;
  camera.rotation.z += shake.rot;
  postfx.render();
}

// --- Start ---------------------------------------------------------------------------
UI.initUI();
if (window.matchMedia("(pointer: coarse)").matches) {
  UI.setMobileNotice(true);
}
goToMainMenu();
animate();
