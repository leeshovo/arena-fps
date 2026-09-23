// ui.js — Sämtliche DOM-/HUD-Logik: Hauptmenü (Progression/Rang/Bestenliste/Aufträge),
// Loadout-Screen (Waffen + Tier-Stufen), Modus-/Map-/Rang-Auswahl, HUD (Health/Ammo/Crosshair/
// Dash-Cooldown/Rundenanzeige/Scoreboard/Kill-Feed), Death-, Rundenbanner- und Match-Ende-Screen.
import * as Progression from "./progression.js";
import * as ChallengesModule from "./challenges.js";
import * as Loadout from "./loadout.js";
import { TEAM } from "./bots.js";

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
    rankBadge: document.getElementById("rank-badge"),
    rankName: document.getElementById("rank-name"),
    rankSr: document.getElementById("rank-sr"),
    leaderboardList: document.getElementById("leaderboard-list"),

    loadoutScreen: document.getElementById("loadout-screen"),
    loadoutSlots: document.getElementById("loadout-slots"),
    loadoutCurrencyAmount: document.getElementById("loadout-currency-amount"),
    loadoutBackBtn: document.getElementById("loadout-back-btn"),
    loadoutContinueBtn: document.getElementById("loadout-continue-btn"),

    modeSelectScreen: document.getElementById("mode-select-screen"),
    modeList: document.getElementById("mode-list"),
    difficultyList: document.getElementById("difficulty-list"),
    rankedToggle: document.getElementById("ranked-toggle"),
    rankedToggleWrap: document.getElementById("ranked-toggle-wrap"),
    mapList: document.getElementById("map-list"),
    modeSelectBackBtn: document.getElementById("mode-select-back-btn"),

    hud: document.getElementById("hud"),
    modeBanner: document.getElementById("mode-banner"),
    roundPips: document.getElementById("round-pips"),
    leaveHint: document.getElementById("leave-hint"),
    crosshair: document.getElementById("crosshair"),
    crossTop: document.querySelector(".cross.top"),
    crossBottom: document.querySelector(".cross.bottom"),
    crossLeft: document.querySelector(".cross.left"),
    crossRight: document.querySelector(".cross.right"),
    hitmarker: document.getElementById("hitmarker"),
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
    dashCd: document.querySelector("#dash-cd .cd-fill"),
    damageVignette: document.getElementById("damage-vignette"),
    lockHint: document.getElementById("lock-hint"),
    deathScreen: document.getElementById("death-screen"),
    deathTitle: document.getElementById("death-title"),
    killedBy: document.getElementById("killed-by"),
    respawnTimer: document.getElementById("respawn-timer"),
    roundBanner: document.getElementById("round-banner"),
    roundBannerTitle: document.getElementById("round-banner-title"),
    roundBannerScore: document.getElementById("round-banner-score"),
    roundBannerCountdown: document.getElementById("round-banner-countdown"),
    scoreboardOverlay: document.getElementById("scoreboard-overlay"),
    scoreboardBlue: document.getElementById("scoreboard-blue"),
    scoreboardRed: document.getElementById("scoreboard-red"),
    roundEndScreen: document.getElementById("round-end-screen"),
    roundEndTitle: document.getElementById("round-end-title"),
    scoreboard: document.getElementById("scoreboard"),
    rewardXp: document.getElementById("reward-xp"),
    rewardCurrency: document.getElementById("reward-currency"),
    rewardLevelup: document.getElementById("reward-levelup"),
    rewardNewLevel: document.getElementById("reward-new-level"),
    rewardRank: document.getElementById("reward-rank"),
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
function hexOf(num) {
  return "#" + num.toString(16).padStart(6, "0");
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

  const rankState = Progression.getRankState();
  els.rankName.textContent = rankState.rank.name;
  els.rankSr.textContent = rankState.next
    ? `${rankState.sr} SR · noch ${rankState.next.minSR - rankState.sr} bis ${rankState.next.name}`
    : `${rankState.sr} SR · höchster Rang`;

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

  els.leaderboardList.innerHTML = "";
  const board = Progression.getLeaderboard();
  if (board.length === 0) {
    els.leaderboardList.innerHTML = `<div class="lb-empty">Noch keine gewerteten Matches gespielt.</div>`;
  } else {
    for (const entry of board.slice(0, 6)) {
      const row = document.createElement("div");
      row.className = "lb-row" + (entry.won ? " win" : " loss");
      const sign = entry.delta >= 0 ? "+" : "";
      row.innerHTML = `
        <span class="lb-result">${entry.won ? "SIEG" : "NIEDERLAGE"}</span>
        <span class="lb-mode">${entry.modeName}</span>
        <span class="lb-delta">${sign}${entry.delta} SR</span>
        <span class="lb-total">${entry.sr}</span>
      `;
      els.leaderboardList.appendChild(row);
    }
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

    const tierLabel = document.createElement("div");
    tierLabel.className = "loadout-skin-label";
    tierLabel.textContent = "Tier-Stufe";
    section.appendChild(tierLabel);

    const tierRow = document.createElement("div");
    tierRow.className = "loadout-options skins";
    for (const tier of Loadout.getTierOptionsForWeapon(current[slotType])) {
      const chip = document.createElement("div");
      const isEquippedTier = current.tiers[slotType] === tier.index;
      chip.className = "skin-chip" + (isEquippedTier ? " equipped" : "") + (!tier.unlocked ? " locked" : "");
      chip.style.borderColor = isEquippedTier ? "var(--good)" : hexOf(tier.accent);
      chip.style.background = `radial-gradient(circle, ${hexOf(tier.accent)}55, rgba(255,255,255,0.05))`;
      chip.title = tier.unlocked ? tier.name : `${tier.name} — Lvl ${tier.level} oder ${tier.cost}◆`;
      chip.textContent = tier.name[0];
      chip.addEventListener("click", () => {
        if (tier.unlocked) {
          Loadout.equipTier(slotType, tier.index);
        } else {
          const result = Progression.purchaseItem(tier.id);
          if (result.ok) Loadout.equipTier(slotType, tier.index);
        }
        renderLoadoutSlots();
        refreshProgressionDisplay();
      });
      tierRow.appendChild(chip);
    }
    section.appendChild(tierRow);
    const tierNameHint = document.createElement("div");
    tierNameHint.className = "loadout-tier-hint";
    const equippedTier = Loadout.getTierOptionsForWeapon(current[slotType]).find((t) => t.index === current.tiers[slotType]);
    tierNameHint.textContent = equippedTier ? equippedTier.name : "";
    section.appendChild(tierNameHint);

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
// Modus-/Map-/Schwierigkeits-/Rang-Auswahl
// ---------------------------------------------------------------------------
const DIFFICULTY_MAP_LABEL = { easy: "Leicht", medium: "Mittel", hard: "Schwer" };
let selectedModeId = null;
let selectedDifficultyId = null;

/** @param {object[]} maps @param {object[]} modes @param {object[]} difficulties
 *  @param {(map, mode, difficulty, ranked) => void} onSelect @param {() => void} onBack */
export function showModeSelectScreen(maps, modes, difficulties, onSelect, onBack) {
  if (!selectedModeId || !modes.some((mo) => mo.id === selectedModeId)) selectedModeId = modes[0].id;
  if (!selectedDifficultyId || !difficulties.some((d) => d.id === selectedDifficultyId)) selectedDifficultyId = difficulties[1]?.id || difficulties[0].id;

  const renderModes = () => {
    els.modeList.innerHTML = "";
    for (const mode of modes) {
      const card = document.createElement("div");
      card.className = "mode-card" + (mode.id === selectedModeId ? " selected" : "");
      card.innerHTML = `<div class="mode-name">${mode.name}</div><div class="mode-desc">${mode.description}</div>`;
      card.addEventListener("click", () => {
        selectedModeId = mode.id;
        renderModes();
        updateRankedToggleVisibility();
      });
      els.modeList.appendChild(card);
    }
  };
  renderModes();

  function updateRankedToggleVisibility() {
    const mode = modes.find((mo) => mo.id === selectedModeId);
    els.rankedToggleWrap.classList.toggle("hidden", !mode.rankable);
  }
  updateRankedToggleVisibility();

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
    const accentHex = hexOf(m.accent);
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
      const ranked = mode.rankable && els.rankedToggle.checked;
      onSelect(m, mode, difficulty, ranked);
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

export function setDashCooldown(readyPct) {
  if (els.dashCd) els.dashCd.style.width = Math.round(readyPct * 100) + "%";
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

export function setModeBanner(text) {
  if (!text) {
    els.modeBanner.classList.add("hidden");
    return;
  }
  els.modeBanner.textContent = text;
  els.modeBanner.classList.remove("hidden");
}

/** Fünf Pips pro Seite für den Best-of-5-Rundenstand. null = ausblenden (z.B. Training). */
export function setRoundPips(roundScore, bestOf) {
  if (!roundScore) {
    els.roundPips.classList.add("hidden");
    return;
  }
  els.roundPips.classList.remove("hidden");
  const needed = Math.ceil(bestOf / 2);
  const pip = (filled, cls) => `<span class="pip ${cls}${filled ? " filled" : ""}"></span>`;
  let html = "";
  for (let i = 0; i < needed; i++) html += pip(i < roundScore.blue, "blue");
  html += `<span class="pip-gap"></span>`;
  for (let i = 0; i < needed; i++) html += pip(i < roundScore.red, "red");
  els.roundPips.innerHTML = html;
}

export function showDeathScreen(killerName, roundBased) {
  els.deathTitle.textContent = "ELIMINIERT";
  els.killedBy.textContent = killerName ? `Eliminiert von ${killerName}` : "";
  els.respawnTimer.classList.toggle("hidden", !!roundBased);
  if (roundBased) {
    els.killedBy.textContent += " — warte auf Rundenende…";
  }
  els.deathScreen.classList.remove("hidden");
}
export function updateRespawnCountdown(seconds) {
  els.respawnTimer.textContent = `Respawn in ${Math.max(0, Math.ceil(seconds))}…`;
}
export function hideDeathScreen() {
  els.deathScreen.classList.add("hidden");
}

/** Rundenbanner: zeigt Rundentitel + Stand + Countdown zwischen zwei Runden (dient als Vorbereitungsphase). */
export function showRoundBanner(title, roundNumber, roundScore, bestOf) {
  els.roundBannerTitle.textContent = title === "READY" ? `RUNDE ${roundNumber}` : `${title} — RUNDE ${roundNumber}`;
  els.roundBannerScore.textContent = `Stand ${roundScore.blue} : ${roundScore.red}`;
  els.roundBanner.classList.remove("hidden");
}
export function updateRoundBannerCountdown(seconds) {
  els.roundBannerCountdown.textContent = Math.ceil(seconds) > 0 ? `Nächste Runde in ${Math.ceil(seconds)}…` : "Los!";
}
export function hideRoundBanner() {
  els.roundBanner.classList.add("hidden");
}

/** Scoreboard-Overlay (Tab gedrückt halten): Team-Übersicht mit K/D. */
export function setScoreboardVisible(visible, player, playerStats, botStatsMap) {
  els.scoreboardOverlay.classList.toggle("hidden", !visible);
  if (!visible) return;
  const rows = (list, isBlue) =>
    list
      .map(
        (r) => `<div class="sb-row${r.you ? " you" : ""}"><span>${r.name}</span><span>${r.kills}</span><span>${r.deaths}</span></div>`
      )
      .join("");

  const blue = [{ name: "Du", kills: playerStats.kills, deaths: playerStats.deaths, you: true }];
  const red = [];
  for (const s of botStatsMap.values()) {
    (s.team === TEAM.BLUE ? blue : red).push({ name: s.name, kills: s.kills, deaths: s.deaths });
  }
  els.scoreboardBlue.innerHTML = `<div class="sb-row header"><span>BLAU</span><span>K</span><span>D</span></div>${rows(blue)}`;
  els.scoreboardRed.innerHTML = `<div class="sb-row header"><span>ROT</span><span>K</span><span>D</span></div>${rows(red)}`;
}

// ---------------------------------------------------------------------------
// Rundenende / Match-Ende inkl. Belohnungen & Rang
// ---------------------------------------------------------------------------
const CATALOG_TYPE_LABEL = { primary: "Primärwaffe", secondary: "Sekundärwaffe", melee: "Nahkampf", utility: "Utility", tier: "Tier-Stufe" };

/**
 * @param {object} opts { title, roundScore, playerStats, botStats, accuracy, rewardResult,
 *   rankResult, completedChallenges, onRestart }
 */
export function showRoundEnd(opts) {
  const { title, roundScore, playerStats, botStats, accuracy, rewardResult, rankResult, completedChallenges = [], onRestart } = opts;
  els.roundEndTitle.textContent = title;

  const acc = accuracy.shotsFired > 0 ? Math.round((accuracy.shotsHit / accuracy.shotsFired) * 100) : 0;
  els.scoreboard.innerHTML = `
    <div class="row header"><span>ERGEBNIS</span><span>${roundScore.blue} : ${roundScore.red}</span></div>
    <div class="row you"><span>Du — K/D</span><span>${playerStats.kills}/${playerStats.deaths}</span></div>
    <div class="row"><span>Genauigkeit</span><span>${acc}% (${accuracy.shotsHit}/${accuracy.shotsFired})</span></div>
    ${botStats.map((b) => `<div class="row"><span>${b.name} (${b.team === "blue" ? "Verbündet" : "Gegner"})</span><span>${b.kills}/${b.deaths}</span></div>`).join("")}
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

  if (rankResult) {
    const sign = rankResult.delta >= 0 ? "+" : "";
    let text = `${sign}${rankResult.delta} SR (${rankResult.toSR} SR gesamt)`;
    if (rankResult.rankChanged) {
      text += rankResult.toRank.minSR > rankResult.fromRank.minSR ? ` — Aufstieg zu ${rankResult.toRank.name}!` : ` — Abstieg zu ${rankResult.toRank.name}`;
    }
    els.rewardRank.textContent = text;
    els.rewardRank.classList.remove("hidden");
  } else {
    els.rewardRank.classList.add("hidden");
  }

  els.rewardChallenges.innerHTML = "";
  for (const c of completedChallenges) {
    const chip = document.createElement("div");
    chip.className = "unlock-chip challenge-complete";
    chip.textContent = `Auftrag abgeschlossen: ${c.desc} (+${c.reward.xpGain} XP, +${c.reward.currencyGain} ◆)`;
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
