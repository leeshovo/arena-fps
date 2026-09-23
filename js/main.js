// main.js — Einstiegspunkt: Rendering-Setup, Input-Handling, Game-Loop, Best-of-5-Rundensteuerung,
// Menü-Navigation (Hauptmenü -> Loadout -> Modus/Map -> Match -> Rundenende/Matchende -> Hauptmenü).
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

const BASE_FOV = 78;
const INTERMISSION_TIME = 3.2; // Sekunden zwischen zwei Runden (dient auch als Countdown)

// --- Spielmodi -----------------------------------------------------------------------
// Duell/Team-Gefecht/5v5-Variante sind strukturell identisch (Team BLAU inkl. Spieler
// gegen Team ROT, Best-of-5-Eliminationsrunden) — nur allyCount/enemyCount unterscheiden sie.
const MODES = [
  { id: "duel", name: "Duell", description: "1v1 im Best-of-5. Erster auf 5 Rundensiege gewinnt.", roundBased: true, rankable: true, allyCount: 0, enemyCount: 1, bestOf: 5 },
  { id: "team", name: "Team-Gefecht", description: "3v3 im Best-of-5: Du + 2 Verbündete gegen ein Bot-Team.", roundBased: true, rankable: true, allyCount: 2, enemyCount: 3, bestOf: 5 },
  { id: "fivev5", name: "5v5-Variante", description: "5v5 im Best-of-5 — volle Teamstärke auf beiden Seiten.", roundBased: true, rankable: true, allyCount: 4, enemyCount: 5, bestOf: 5 },
  { id: "training", name: "Training", description: "Kein Zeitlimit, keine Wertung — in Ruhe üben. Mit M jederzeit verlassen.", roundBased: false, rankable: false, botCount: 4 },
];

const DIFFICULTIES = Object.entries(DIFFICULTY_PRESETS).map(([id, p]) => ({ id, name: p.name }));

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
let botStats = new Map(); // id -> { name, team, kills, deaths }
let playerStats = { kills: 0, deaths: 0 };
let matchAccuracy = { shotsFired: 0, shotsHit: 0 };
let roundScore = { blue: 0, red: 0 };
let matchChallengeCompletions = [];
let wasGrounded = true;
let sprintDustTimer = 0;

// Modus-/Match-Status
let currentMode = MODES[0];
let currentDifficultyId = "normal";
let currentDifficultyObj = { id: "normal", name: "Normal" };
let currentMapDef = null;
let isRanked = false;
let matchActive = false; // true zwischen Matchstart und Matchende (über alle Runden hinweg)
let roundActive = false; // true nur während einer laufenden Eliminationsrunde
let roundNumber = 0;
let intermissionTimer = 0;
let deathRespawnTimer = 0; // nur im Training genutzt

function fireChallengeEvent(metric, amount = 1) {
  const completed = ChallengesModule.registerEvent(metric, amount);
  if (completed.length) {
    matchChallengeCompletions.push(...completed);
    Audio.playReward();
  }
}

// --- Input ---------------------------------------------------------------------------
const keys = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, slide: false, dash: false, scoreboard: false };

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
  KeyQ: "dash",
  Tab: "scoreboard",
};

window.addEventListener("keydown", (e) => {
  if (KEY_MAP[e.code]) {
    keys[KEY_MAP[e.code]] = true;
    if (e.code === "Space" || e.code === "Tab") e.preventDefault();
  }
  if (e.code === "KeyM" && matchActive) {
    leaveMatch();
    return;
  }
  if (!roundActive || !player.alive) return;
  if (e.code === "Digit1") trySwitchWeapon(() => weapons.switchTo(SLOT.PRIMARY));
  else if (e.code === "Digit2") trySwitchWeapon(() => weapons.switchTo(SLOT.SECONDARY));
  else if (e.code === "Digit3") trySwitchWeapon(() => weapons.switchTo(SLOT.MELEE));
  else if (e.code === "Digit4") trySwitchWeapon(() => weapons.switchTo(SLOT.UTILITY));
  else if (e.code === "KeyR") weapons.reload();
  else if (e.code === "KeyF") weapons.meleeAttack(bots);
  else if (e.code === "KeyG") weapons.throwUtility();
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
  if (!roundActive || !player.alive) return;
  if (e.button === 0) weapons.startFire();
  else if (e.button === 2) weapons.setAiming(true);
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

function trySwitchWeapon(switchFn) {
  if (!switchFn()) return;
  Audio.playUiClick();
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
  UI.showModeSelectScreen(MAPS, MODES, DIFFICULTIES, startMatch, goToMainMenu);
}

// --- Matchsteuerung (Best-of-5) ----------------------------------------------------------
function startMatch(mapDef, modeDef, difficultyObj, ranked) {
  Audio.resumeAudio();
  if (currentMapData) {
    disposeMap(scene, currentMapData);
    disposeBots(scene, bots);
    bots = [];
  }

  currentMode = modeDef;
  currentMapDef = mapDef;
  currentDifficultyId = difficultyObj.id;
  currentDifficultyObj = difficultyObj;
  isRanked = !!ranked && !!modeDef.rankable;
  matchChallengeCompletions = [];
  roundScore = { blue: 0, red: 0 };
  roundNumber = 0;
  playerStats = { kills: 0, deaths: 0 };
  matchAccuracy = { shotsFired: 0, shotsHit: 0 };
  botStats = new Map();

  currentMapData = buildMap(scene, mapDef);

  const loadout = LoadoutModule.getLoadout();
  if (!weapons) {
    weapons = new WeaponSystem(camera, scene, loadout);
  } else {
    weapons.resetForRound(loadout);
  }
  weapons.setWallMeshes(currentMapData.wallMeshes);

  player.team = TEAM.BLUE;
  player.maxHp = PLAYER_DEFAULT_MAX_HP;

  if (modeDef.roundBased) {
    const allies = modeDef.allyCount > 0 ? createBots(scene, modeDef.allyCount, currentMapData, TEAM.BLUE, currentDifficultyId, 0) : [];
    const enemies = createBots(scene, modeDef.enemyCount, currentMapData, TEAM.RED, currentDifficultyId, modeDef.allyCount);
    bots = [...allies, ...enemies];
  } else {
    bots = createBots(scene, modeDef.botCount || 4, currentMapData, TEAM.RED, currentDifficultyId, 0);
  }
  for (const b of bots) botStats.set(b.id, { name: b.name, team: b.team, kills: 0, deaths: 0 });

  matchActive = true;
  UI.hideMainMenu();
  UI.hideLoadoutScreen();
  UI.hideModeSelectScreen();
  UI.hideRoundEnd();
  UI.hideDeathScreen();
  UI.showHud();
  UI.setLeaveHintVisible(true);

  if (modeDef.roundBased) {
    beginRoundIntermission("READY");
  } else {
    beginTrainingRound();
  }
  player.requestLock();
}

function respawnAllForRound() {
  const spawn = currentMapData.spawnPoints[Math.floor(Math.random() * currentMapData.spawnPoints.length)];
  player.spawn(spawn);
  scene.add(player.hitMesh);
  for (const b of bots) b.respawnAt(true);
  weapons.resetForRound();
  effects.clear();
  wasGrounded = true;
}

/** Startet die Intermission vor einer neuen Runde (dient gleichzeitig als Countdown). */
function beginRoundIntermission(title) {
  roundActive = false;
  roundNumber += 1;
  intermissionTimer = INTERMISSION_TIME;
  respawnAllForRound();
  UI.showRoundBanner(title, roundNumber, roundScore, currentMode.bestOf);
}

function beginTrainingRound() {
  respawnAllForRound();
  roundActive = true;
  deathRespawnTimer = 0;
}

function getModeBannerText() {
  if (currentMode.id === "training") return "TRAINING — kein Zeitlimit";
  return `${currentMode.name.toUpperCase()} — RUNDE ${roundNumber} · ${roundScore.blue}:${roundScore.red}`;
}

/** Prüft, ob ein Team in der laufenden Runde vollständig eliminiert ist. */
function checkRoundElimination() {
  if (!roundActive || !currentMode.roundBased) return;
  const blueAlive = player.alive || bots.some((b) => b.team === TEAM.BLUE && !b.dead);
  const redAlive = bots.some((b) => b.team === TEAM.RED && !b.dead);
  if (!redAlive) endRound(true);
  else if (!blueAlive) endRound(false);
}

/** Rundenende (nur roundBased-Modi): erhöht den Rundenstand, prüft Matchende oder startet die nächste Intermission. */
function endRound(blueWon) {
  roundActive = false;
  if (weapons) {
    weapons.stopFire();
    weapons.setAiming(false);
  }
  if (blueWon) roundScore.blue += 1;
  else roundScore.red += 1;
  if (blueWon) fireChallengeEvent("roundWins");

  const neededWins = Math.ceil(currentMode.bestOf / 2);
  if (roundScore.blue >= neededWins || roundScore.red >= neededWins) {
    endMatch(roundScore.blue > roundScore.red);
  } else {
    beginRoundIntermission(blueWon ? "RUNDE GEWONNEN" : "RUNDE VERLOREN");
  }
}

/** Match-Ende (nur roundBased-Modi): Belohnungen, Rang-Update, vollständiger Ergebnis-Screen. */
function endMatch(won) {
  matchActive = false;
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  UI.setLeaveHintVisible(false);

  // Hinweis: der entscheidende Rundensieg selbst wurde bereits in endRound() als
  // "roundWins" gezählt — hier nur noch das grundsätzliche "Match gespielt".
  fireChallengeEvent("matchesPlayed");

  const baseXp = 60 + roundScore.blue * 25;
  const baseCurrency = 20 + roundScore.blue * 8;
  const bonus = won ? { xp: 90, currency: 40 } : { xp: 0, currency: 0 };
  const rewardResult = Progression.grantRewards(baseXp + bonus.xp, baseCurrency + bonus.currency);
  if (rewardResult.leveledUp || rewardResult.newlyUnlocked.length) Audio.playReward();

  let rankResult = null;
  if (isRanked) rankResult = Progression.applyRankedResult(won, currentDifficultyId, currentMode.name);

  UI.showRoundEnd({
    title: won ? "MATCH GEWONNEN!" : "MATCH VERLOREN",
    isMatchEnd: true,
    roundScore,
    playerStats,
    botStats: [...botStats.values()],
    accuracy: matchAccuracy,
    rewardResult,
    rankResult,
    completedChallenges: matchChallengeCompletions,
    onRestart: () => {
      disposeMap(scene, currentMapData);
      disposeBots(scene, bots);
      currentMapData = null;
      bots = [];
      goToMainMenu();
    },
  });
}

/** Verlässt ein laufendes Match jederzeit über M (zählt nicht als gewertetes Ergebnis). */
function leaveMatch() {
  matchActive = false;
  roundActive = false;
  if (weapons) {
    weapons.stopFire();
    weapons.setAiming(false);
  }
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  disposeMap(scene, currentMapData);
  disposeBots(scene, bots);
  currentMapData = null;
  bots = [];
  goToMainMenu();
}

function handlePlayerDamage(amount, attackerBot) {
  UI.flashDamage();
  postfx.pulseAberration(0.012);
  const result = player.takeDamage(amount);
  if (result.died) {
    Audio.playDeath();
    weapons.stopFire();
    weapons.setAiming(false);
    playerStats.deaths += 1;

    const label = attackerBot ? attackerBot.name : "einer Explosion";
    if (attackerBot) {
      const st = botStats.get(attackerBot.id);
      if (st) st.kills += 1;
      UI.addKillFeed(`${attackerBot.name} hat dich eliminiert`, true);
    } else {
      UI.addKillFeed(`Du wurdest eliminiert`, true);
    }

    if (currentMode.roundBased) {
      UI.showDeathScreen(label, true);
      checkRoundElimination();
    } else {
      deathRespawnTimer = 3;
      UI.showDeathScreen(label, false);
    }
  }
}

// --- Game Loop ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  if (matchActive) {
    if (roundActive) {
      if (player.alive) {
        const recoilPitch = weapons.getRecoilPitch();
        const recoilYaw = weapons.getRecoilYaw();
        const speedMult = weapons.getMoveSpeedMultiplier();
        const wasJumping = keys.jump && player.grounded;
        player.update(dt, keys, currentMapData.wallBoxes, currentMapData.bounds, recoilPitch, speedMult, recoilYaw);
        if (wasJumping && !player.grounded) Audio.playJump();
        if (player.dashJustStarted) {
          Audio.playDash();
          effects.burstDust(player.position, 7, 0.3, 1.4);
          postfx.pulseAberration(0.004);
        }

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
        if (ev.type === "shotFired") {
          matchAccuracy.shotsFired += 1;
          continue;
        }
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
          matchAccuracy.shotsHit += 1;
          UI.showHitmarker(ev.isHead);
          if (ev.isHead) Audio.playHeadshot();
          else Audio.playHitmarker();
          if (ev.isExplosion) postfx.shakeCamera(0.02, 0.2);
          if (ev.isMelee) postfx.shakeCamera(0.012, 0.12);

          if (ev.killed) {
            playerStats.kills += 1;
            const st = botStats.get(ev.bot.id);
            if (st) st.deaths += 1;
            const how = ev.isBackstab ? " (Backstab)" : ev.isExplosion ? " (Wurfladung)" : ev.isHead ? " (Kopfschuss)" : "";
            UI.addKillFeed(`Du hast ${ev.bot.name} eliminiert${how}`, false);

            fireChallengeEvent("eliminations");
            if (ev.isHead) fireChallengeEvent("headshots");
            if (ev.isBackstab) fireChallengeEvent("backstabs");
            if (ev.isExplosion) fireChallengeEvent("utilityKills");
            if (ev.isMelee) fireChallengeEvent("meleeKills");

            checkRoundElimination();
          }
        }
      }

      // Bots aktualisieren (Team-Kämpfe inkl. Bot-vs-Bot, Rauch blockiert Sicht).
      // In Runden-Modi ohne Mid-Round-Respawn: tote Bots bleiben bis zur nächsten Runde tot.
      const smokeVolumes = weapons.getSmokeVolumes();
      const allowRespawn = !currentMode.roundBased;
      for (const bot of bots) {
        const botEvents = bot.update(dt, player, bots, currentMapData.wallBoxes, currentMapData.wallMeshes, currentMapData.bounds, smokeVolumes, allowRespawn);
        for (const ev of botEvents) {
          if (ev.type === "hitPlayer") {
            handlePlayerDamage(ev.amount, bot);
          } else if (ev.type === "hitBot" && ev.killed) {
            const killerIsBlue = bot.team === TEAM.BLUE;
            const killerSt = botStats.get(bot.id);
            const victimSt = botStats.get(ev.target.id);
            if (killerSt) killerSt.kills += 1;
            if (victimSt) victimSt.deaths += 1;
            UI.addKillFeed(`${bot.name} hat ${ev.target.name} eliminiert`, !killerIsBlue);
            if (killerIsBlue && ev.assistTag === "player") fireChallengeEvent("assists");
            checkRoundElimination();
          }
        }
      }

      // Spieler-Respawn nur im Training (Runden-Modi: Spieler bleibt bis Rundenende tot)
      if (!currentMode.roundBased && !player.alive) {
        deathRespawnTimer -= dt;
        UI.updateRespawnCountdown(deathRespawnTimer);
        if (deathRespawnTimer <= 0) {
          const spawn = currentMapData.spawnPoints[Math.floor(Math.random() * currentMapData.spawnPoints.length)];
          player.spawn(spawn);
          Audio.playRespawn();
          UI.hideDeathScreen();
        }
      }

      // HUD synchronisieren
      const hud = weapons.getHUDState();
      UI.setHealth(player.hp, player.maxHp);
      UI.setAmmo(hud);
      UI.setCooldowns(hud.meleeCooldownPct, hud.utilityCooldownPct);
      UI.setDashCooldown(player.getDashCooldownPct());
      UI.setAiming(hud.aiming);
      UI.setCrosshairSpread(hud.spread);
      UI.setModeBanner(getModeBannerText());
      UI.setRoundPips(currentMode.roundBased ? roundScore : null, currentMode.bestOf);
      UI.setLockHintVisible(!player.isLocked);
      UI.setScoreboardVisible(!!keys.scoreboard, player, playerStats, botStats);
    } else if (currentMode.roundBased) {
      // Intermission zwischen zwei Runden (dient als Countdown)
      intermissionTimer -= dt;
      UI.updateRoundBannerCountdown(Math.max(0, intermissionTimer));
      if (intermissionTimer <= 0) {
        roundActive = true;
        UI.hideRoundBanner();
      }
      effects.update(dt);
      updateMapDecor(currentMapData, dt);
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
