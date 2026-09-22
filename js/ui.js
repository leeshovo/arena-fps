// ui.js — Sämtliche DOM-/HUD-Logik: Hauptmenü (Progression/Challenges), Loadout-Screen,
// Modus-/Map-Auswahl, HUD (Health/Ammo/Crosshair/Kill-Feed/Treffer-Feedback), Death- und
// Rundenende-Screen (inkl. Belohnungs-Anzeige).
import * as Progression from "./progression.js";
import * as ChallengesModule from "./challenges.js";
import * as Loadout from "./loadout.js";

let els = {};

export function initUI() {
  els = {
    mainMenu: document.getElementById("main-menu"),
    mobileNotice: document.getElementById("mobile-notice"),
    openLoadoutBtn: document.getElementById("open-loadout-btn"),
    openPlayBtn: document.getElementById("open-play-btn"),
    playerLevel: document.getElementById("player-level"),
    xpFill: document.getElementById("xp-bar-fill"),
    xpText: document.getElementById("xp-text"),
    currencyAmount: document.getElementById("currency-amount"),
    challengesList: document.getElementById("challenges-list"),

    loadoutScreen: document.getElementById("loadout-screen"),
    loadoutSlots: document.getElementById("loadout-slots"),
    loadoutCurrencyAmount: document.getElementById("loadout-currency-amount"),
    loadoutBackBtn: document.getElementById("loadout-back-btn"),
    loadoutContinueBtn: document.getElementById("loadout-continue-btn"),

    modeSelectScreen: document.getElementById("mode-select-screen"),
    modeList: document.getElementById("mode-list"),
    difficultyList: document.getElementById("difficulty-list"),
    mapList: document.getElementById("map-list"),
    modeSelectBackBtn: document.getElementById("mode-select-back-btn"),

    hud: document.getElementById("hud"),
    modeBanner: document.getElementById("mode-banner"),
    chickenBanner: document.getElementById("chicken-banner"),
    chickenPhaseText: document.getElementById("chicken-phase-text"),
    leaveHint: document.getElementById("leave-hint"),
    crosshair: document.getElementById("crosshair"),
    crossTop: document.querySelector(".cross.top"),
    crossBottom: document.querySelector(".cross.bottom"),
    crossLeft: document.querySelector(".cross.left"),
    crossRight: document.querySelector(".cross.right"),
    hitmarker: document.getElementById("hitmarker"),
    timer: document.getElementById("timer"),
    scorePlayer: document.getElementById("score-player"),
    scoreBots: document.getElementById("score-bots"),
    killfeed: document.getElementById("killfeed"),
    healthFill: document.getElementById("health-bar-fill"),
    healthText: document.getElementById("health-text"),
    weaponName: document.getElementById("weapon-name"),
    ammoMag: document.getElementById("ammo-mag"),
    ammoReserve: document.getElementById("ammo-reserve"),
    reloadIndicator: document.getElementById("reload-indicator"),
    healIndicator: document.getElementById("heal-indicator"),
    weaponSlots: document.querySelectorAll("#weapon-slots .slot-icon"),
    meleeCd: document.querySelector("#melee-cd .cd-fill"),
    utilityCd: document.querySelector("#utility-cd .cd-fill"),
    damageVignette: document.getElementById("damage-vignette"),
    lockHint: document.getElementById("lock-hint"),
    deathScreen: document.getElementById("death-screen"),
    killedBy: document.getElementById("killed-by"),
    respawnTimer: document.getElementById("respawn-timer"),
    roundEndScreen: document.getElementById("round-end-screen"),
    roundEndTitle: document.getElementById("round-end-title"),
    scoreboard: document.getElementById("scoreboard"),
    rewardXp: document.getElementById("reward-xp"),
    rewardCurrency: document.getElementById("reward-currency"),
    rewardLevelup: document.getElementById("reward-levelup"),
    rewardNewLevel: document.getElementById("reward-new-level"),
    rewardUnlocks: document.getElementById("reward-unlocks"),
    rewardChallenges: document.getElementById("reward-challenges"),
    newRoundBtn: document.getElementById("new-round-btn"),
  };
}

/** Mischt zwei Hex-Farben (für Thumbnail-Verläufe der Kartenauswahl, rein optisch). */
function mixHex(hex, target, amount) {
  const c1 = parseInt(hex.slice(1), 16);
  const c2 = parseInt(target.slice(1), 16);
  const r = Math.round(((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * amount);
  const g = Math.round(((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * amount);
  const b = Math.round((c1 & 255) + ((c2 & 255) - (c1 & 255)) * amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ---------------------------------------------------------------------------
// Hauptmenü
// ---------------------------------------------------------------------------
export function refreshProgressionDisplay() {
  const state = Progression.getState();
  els.playerLevel.textContent = state.level;
  els.xpText.textContent = `${state.xp} / ${state.xpToNext} XP`;
  els.xpFill.style.width = `${Math.min(100, (state.xp / state.xpToNext) * 100)}%`;
  els.currencyAmount.textContent = state.currency;
  if (els.loadoutCurrencyAmount) els.loadoutCurrencyAmount.textContent = state.currency;

  els.challengesList.innerHTML = "";
  for (const c of ChallengesModule.getActiveChallenges()) {
    const row = document.createElement("div");
    row.className = "challenge-row";
    const pct = Math.min(100, (c.progress / c.target) * 100);
    row.innerHTML = `
      <div class="challenge-desc">${c.desc}</div>
      <div class="challenge-bar-bg"><div class="challenge-bar-fill" style="width:${pct}%"></div></div>
      <div class="challenge-progress">${c.progress}/${c.target}</div>
    `;
    els.challengesList.appendChild(row);
  }
}

export function showMainMenu(onOpenLoadout, onOpenPlay) {
  ChallengesModule.ensureActiveChallenges();
  refreshProgressionDisplay();
  els.openLoadoutBtn.onclick = onOpenLoadout;
  els.openPlayBtn.onclick = onOpenPlay;
  els.mainMenu.classList.remove("hidden");
}
export function hideMainMenu() {
  els.mainMenu.classList.add("hidden");
}

export function setMobileNotice(visible) {
  els.mobileNotice.classList.toggle("hidden", !visible);
}

// ---------------------------------------------------------------------------
// Loadout-Screen
// ---------------------------------------------------------------------------
const SLOT_LABELS = { primary: "Primärwaffe", secondary: "Sekundärwaffe", melee: "Nahkampf", utility: "Utility" };

function renderLoadoutSlots() {
  const container = els.loadoutSlots;
  container.innerHTML = "";
  const current = Loadout.getLoadout();
  const skinOptions = Loadout.getSkinOptions();

  for (const slotType of ["primary", "secondary", "melee", "utility"]) {
    const section = document.createElement("div");
    section.className = "loadout-section";
    const heading = document.createElement("div");
    heading.className = "loadout-slot-label";
    heading.textContent = SLOT_LABELS[slotType];
    section.appendChild(heading);

    const row = document.createElement("div");
    row.className = "loadout-options";
    for (const opt of Loadout.getOptionsForSlot(slotType)) {
      const card = document.createElement("div");
      const isEquipped = current[slotType] === opt.id;
      card.className = "loadout-option" + (isEquipped ? " equipped" : "") + (!opt.unlocked ? " locked" : "");
      card.innerHTML = `
        <div class="lo-name">${opt.name}</div>
        ${opt.unlocked ? "" : `<div class="lo-req">Lvl ${opt.level} oder <span class="coin-icon">◆</span>${opt.cost}</div>`}
      `;
      card.addEventListener("click", () => {
        if (opt.unlocked) {
          Loadout.equipItem(slotType, opt.id);
        } else {
          const result = Progression.purchaseItem(opt.id);
          if (result.ok) Loadout.equipItem(slotType, opt.id);
        }
        renderLoadoutSlots();
        refreshProgressionDisplay();
      });
      row.appendChild(card);
    }
    section.appendChild(row);

    const skinLabel = document.createElement("div");
    skinLabel.className = "loadout-skin-label";
    skinLabel.textContent = "Skin";
    section.appendChild(skinLabel);

    const skinRow = document.createElement("div");
    skinRow.className = "loadout-options skins";
    for (const skin of skinOptions) {
      const chip = document.createElement("div");
      const isEquippedSkin = current.skins[slotType] === skin.id;
      chip.className = "skin-chip" + (isEquippedSkin ? " equipped" : "") + (!skin.unlocked ? " locked" : "");
      chip.title = skin.unlocked ? skin.name : `${skin.name} — Lvl ${skin.level} oder ${skin.cost}◆`;
      chip.textContent = skin.name[0];
      chip.addEventListener("click", () => {
        if (skin.unlocked) {
          Loadout.equipSkin(slotType, skin.id);
        } else {
          const result = Progression.purchaseItem(skin.id);
          if (result.ok) Loadout.equipSkin(slotType, skin.id);
        }
        renderLoadoutSlots();
        refreshProgressionDisplay();
      });
      skinRow.appendChild(chip);
    }
    section.appendChild(skinRow);

    container.appendChild(section);
  }
}

export function showLoadoutScreen(onBack, onContinue) {
  Loadout.sanitizeLoadout();
  renderLoadoutSlots();
  refreshProgressionDisplay();
  els.loadoutBackBtn.onclick = onBack;
  els.loadoutContinueBtn.onclick = onContinue;
  els.loadoutScreen.classList.remove("hidden");
}
export function hideLoadoutScreen() {
  els.loadoutScreen.classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Modus-/Map-/Schwierigkeits-Auswahl
// ---------------------------------------------------------------------------
const DIFFICULTY_MAP_LABEL = { easy: "Leicht", medium: "Mittel", hard: "Schwer" };
let selectedModeId = null;
let selectedDifficultyId = null;

/** @param {object[]} maps @param {object[]} modes @param {object[]} difficulties
 *  @param {(map, mode, difficulty) => void} onSelect @param {() => void} onBack */
export function showModeSelectScreen(maps, modes, difficulties, onSelect, onBack) {
  if (!selectedModeId || !modes.some((mo) => mo.id === selectedModeId)) selectedModeId = modes[0].id;
  if (!selectedDifficultyId || !difficulties.some((d) => d.id === selectedDifficultyId)) selectedDifficultyId = difficulties[1]?.id || difficulties[0].id;

  els.modeList.innerHTML = "";
  for (const mode of modes) {
    const card = document.createElement("div");
    card.className = "mode-card" + (mode.id === selectedModeId ? " selected" : "");
    card.innerHTML = `<div class="mode-name">${mode.name}</div><div class="mode-desc">${mode.description}</div>`;
    card.addEventListener("click", () => {
      selectedModeId = mode.id;
      els.modeList.querySelectorAll(".mode-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
    });
    els.modeList.appendChild(card);
  }

  els.difficultyList.innerHTML = "";
  for (const diff of difficulties) {
    const card = document.createElement("div");
    card.className = "mode-card diff-card" + (diff.id === selectedDifficultyId ? " selected" : "");
    card.innerHTML = `<div class="mode-name">${diff.name}</div>`;
    card.addEventListener("click", () => {
      selectedDifficultyId = diff.id;
      els.difficultyList.querySelectorAll(".mode-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
    });
    els.difficultyList.appendChild(card);
  }

  els.mapList.innerHTML = "";
  for (const m of maps) {
    const card = document.createElement("div");
    card.className = "map-card";
    const accentHex = "#" + m.accent.toString(16).padStart(6, "0");
    const lightAccent = mixHex(accentHex, "#ffffff", 0.55);
    const darkAccent = mixHex(accentHex, "#0a0e14", 0.6);
    const diffLabel = DIFFICULTY_MAP_LABEL[m.difficulty] || "";
    card.innerHTML = `
      <div class="difficulty-badge ${m.difficulty}">${diffLabel}</div>
      <div class="map-thumb" style="background:linear-gradient(160deg, ${lightAccent}, ${darkAccent})">
        <span class="thumb-block tb1" style="background:${accentHex}"></span>
        <span class="thumb-block tb2" style="background:${darkAccent}"></span>
        <span class="thumb-block tb3" style="background:${lightAccent}"></span>
        <span class="thumb-fade"></span>
      </div>
      <div class="map-banner" style="background:repeating-linear-gradient(45deg, #0a0e14 0 11px, ${accentHex} 11px 22px)">
        <span class="map-name">${m.name}</span>
      </div>
      <div class="desc">${m.description}</div>
    `;
    card.addEventListener("click", () => {
      const mode = modes.find((mo) => mo.id === selectedModeId) || modes[0];
      const difficulty = difficulties.find((d) => d.id === selectedDifficultyId) || difficulties[0];
      onSelect(m, mode, difficulty);
    });
    els.mapList.appendChild(card);
  }

  els.modeSelectBackBtn.onclick = onBack;
  els.modeSelectScreen.classList.remove("hidden");
}
export function hideModeSelectScreen() {
  els.modeSelectScreen.classList.add("hidden");
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
export function showHud() {
  els.hud.classList.remove("hidden");
}
export function hideHud() {
  els.hud.classList.add("hidden");
}

export function setLockHintVisible(visible) {
  els.lockHint.classList.toggle("hidden", !visible);
}

export function setLeaveHintVisible(visible) {
  els.leaveHint.classList.toggle("hidden", !visible);
}

export function setHealth(hp, maxHp) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  els.healthFill.style.width = pct + "%";
  els.healthText.textContent = Math.max(0, Math.round(hp));
  let color = "#6bff8e";
  if (pct <= 60) color = "#ffd24f";
  if (pct <= 30) color = "#ff4a4a";
  els.healthFill.style.background = color;
}

export function setAmmo(state) {
  els.weaponName.textContent = state.weaponName;
  if (state.hasAmmo) {
    els.ammoMag.textContent = state.mag;
    els.ammoReserve.textContent = state.reserve;
    els.ammoMag.parentElement.style.visibility = "visible";
  } else {
    els.ammoMag.parentElement.style.visibility = "hidden";
  }
  els.reloadIndicator.classList.toggle("hidden", !state.reloading);
  els.healIndicator.classList.toggle("hidden", !state.healing);

  if (typeof state.slotIndex === "number") {
    els.weaponSlots.forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.slot) === state.slotIndex);
    });
  }
}

export function setCooldowns(meleePct, utilityPct) {
  els.meleeCd.style.width = Math.round(meleePct * 100) + "%";
  els.utilityCd.style.width = Math.round(utilityPct * 100) + "%";
}

export function setAiming(isAiming) {
  els.crosshair.classList.toggle("aiming", !!isAiming);
}

export function setCrosshairSpread(spread) {
  const px = 6 + Math.min(1, spread / 0.05) * 16;
  els.crossTop.style.transform = `translateY(-${px - 7}px)`;
  els.crossBottom.style.transform = `translateY(${px - 7}px)`;
  els.crossLeft.style.transform = `translateX(-${px - 7}px)`;
  els.crossRight.style.transform = `translateX(${px - 7}px)`;
}

let hitmarkerTimeout = null;
export function showHitmarker(isHeadshot = false) {
  els.hitmarker.classList.remove("show");
  void els.hitmarker.offsetWidth;
  els.hitmarker.classList.add("show");
  els.hitmarker.classList.toggle("headshot", isHeadshot);
  clearTimeout(hitmarkerTimeout);
  hitmarkerTimeout = setTimeout(() => els.hitmarker.classList.remove("show"), 200);
}

let damageTimeout = null;
export function flashDamage() {
  els.damageVignette.classList.remove("show");
  void els.damageVignette.offsetWidth;
  els.damageVignette.classList.add("show");
  clearTimeout(damageTimeout);
  damageTimeout = setTimeout(() => els.damageVignette.classList.remove("show"), 350);
}

export function addKillFeed(text, isBotKill = false) {
  const div = document.createElement("div");
  div.className = "kill-msg" + (isBotKill ? " bot-kill" : "");
  div.textContent = text;
  els.killfeed.prepend(div);
  setTimeout(() => {
    div.classList.add("fade-out");
    setTimeout(() => div.remove(), 450);
  }, 3200);
  while (els.killfeed.children.length > 6) {
    els.killfeed.removeChild(els.killfeed.lastChild);
  }
}

export function setTimer(seconds, noTimer = false) {
  if (noTimer) {
    els.timer.textContent = "∞";
    return;
  }
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  els.timer.textContent = `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function setScore(playerScore, botsScore) {
  els.scorePlayer.textContent = playerScore;
  els.scoreBots.textContent = botsScore;
}

export function setModeBanner(text) {
  if (!text) {
    els.modeBanner.classList.add("hidden");
    return;
  }
  els.modeBanner.textContent = text;
  els.modeBanner.classList.remove("hidden");
}

export function setChickenBanner(visible, phase, subText) {
  els.chickenBanner.classList.toggle("hidden", !visible);
  if (!visible) return;
  els.chickenBanner.classList.toggle("phase-red", phase === "red");
  els.chickenPhaseText.textContent = phase === "red" ? "ROT" : "GRÜN";
  if (subText) document.getElementById("chicken-sub").textContent = subText;
}

export function showDeathScreen(killerName) {
  els.killedBy.textContent = killerName ? `Eliminiert von ${killerName}` : "";
  els.deathScreen.classList.remove("hidden");
}
export function updateRespawnCountdown(seconds) {
  els.respawnTimer.textContent = `Respawn in ${Math.max(0, Math.ceil(seconds))}…`;
}
export function hideDeathScreen() {
  els.deathScreen.classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Rundenende inkl. Belohnungen
// ---------------------------------------------------------------------------
const CATALOG_TYPE_LABEL = { primary: "Primärwaffe", secondary: "Sekundärwaffe", melee: "Nahkampf", utility: "Utility", skin: "Skin" };

/**
 * @param {object} rewardResult Rückgabe von progression.grantRewards()
 * @param {object[]} completedChallenges Rückgabe von challenges.registerEvent() (gesammelt)
 */
export function showRoundEnd(playerScore, botsScore, botStats, onRestart, title = "RUNDE BEENDET", rewardResult = null, completedChallenges = []) {
  els.roundEndTitle.textContent = title;
  els.scoreboard.innerHTML = `
    <div class="row header"><span>SPIELER</span><span>ELIMS</span></div>
    <div class="row you"><span>Du</span><span>${playerScore}</span></div>
    ${botStats.map((b) => `<div class="row"><span>${b.name}</span><span>${b.kills}</span></div>`).join("")}
    <div class="row header" style="margin-top:8px"><span>Gesamt Bots</span><span>${botsScore}</span></div>
  `;

  if (rewardResult) {
    els.rewardXp.textContent = `+${rewardResult.xpGain} XP`;
    els.rewardCurrency.textContent = `+${rewardResult.currencyGain} ◆`;
    els.rewardLevelup.classList.toggle("hidden", !rewardResult.leveledUp);
    if (rewardResult.leveledUp) els.rewardNewLevel.textContent = rewardResult.toLevel;

    els.rewardUnlocks.innerHTML = "";
    for (const item of rewardResult.newlyUnlocked || []) {
      const chip = document.createElement("div");
      chip.className = "unlock-chip";
      chip.innerHTML = `<span class="unlock-type">${CATALOG_TYPE_LABEL[item.type] || item.type}</span> ${item.name} freigeschaltet!`;
      els.rewardUnlocks.appendChild(chip);
    }
  } else {
    els.rewardXp.textContent = "";
    els.rewardCurrency.textContent = "";
    els.rewardLevelup.classList.add("hidden");
    els.rewardUnlocks.innerHTML = "";
  }

  els.rewardChallenges.innerHTML = "";
  for (const c of completedChallenges) {
    const chip = document.createElement("div");
    chip.className = "unlock-chip challenge-complete";
    chip.textContent = `Challenge abgeschlossen: ${c.desc} (+${c.reward.xpGain} XP, +${c.reward.currencyGain} ◆)`;
    els.rewardChallenges.appendChild(chip);
  }

  els.roundEndScreen.classList.remove("hidden");
  els.newRoundBtn.onclick = () => {
    els.roundEndScreen.classList.add("hidden");
    onRestart();
  };
}
export function hideRoundEnd() {
  els.roundEndScreen.classList.add("hidden");
}
