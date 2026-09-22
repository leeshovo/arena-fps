// ui.js — Sämtliche DOM-/HUD-Logik: Menüs, Health/Ammo, Crosshair, Kill-Feed,
// Treffer-/Schadens-Feedback, Death- und Rundenende-Screen.

let els = {};

export function initUI() {
  els = {
    mainMenu: document.getElementById("main-menu"),
    mobileNotice: document.getElementById("mobile-notice"),
    mapList: document.getElementById("map-list"),
    hud: document.getElementById("hud"),
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
    meleeCd: document.querySelector("#melee-cd .cd-fill"),
    utilityCd: document.querySelector("#utility-cd .cd-fill"),
    damageVignette: document.getElementById("damage-vignette"),
    lockHint: document.getElementById("lock-hint"),
    deathScreen: document.getElementById("death-screen"),
    killedBy: document.getElementById("killed-by"),
    respawnTimer: document.getElementById("respawn-timer"),
    roundEndScreen: document.getElementById("round-end-screen"),
    scoreboard: document.getElementById("scoreboard"),
    newRoundBtn: document.getElementById("new-round-btn"),
  };
}

export function showMainMenu(maps, onSelect) {
  els.mainMenu.classList.remove("hidden");
  els.mapList.innerHTML = "";
  for (const m of maps) {
    const card = document.createElement("div");
    card.className = "map-card";
    const accentHex = "#" + m.accent.toString(16).padStart(6, "0");
    card.innerHTML = `
      <div class="swatch" style="background:${accentHex}"></div>
      <div class="name">${m.name}</div>
      <div class="desc">${m.description}</div>
    `;
    card.addEventListener("click", () => onSelect(m));
    els.mapList.appendChild(card);
  }
}

export function hideMainMenu() {
  els.mainMenu.classList.add("hidden");
}

export function setMobileNotice(visible) {
  els.mobileNotice.classList.toggle("hidden", !visible);
}

export function showHud() {
  els.hud.classList.remove("hidden");
}
export function hideHud() {
  els.hud.classList.add("hidden");
}

export function setLockHintVisible(visible) {
  els.lockHint.classList.toggle("hidden", !visible);
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
}

export function setCooldowns(meleePct, utilityPct) {
  els.meleeCd.style.width = Math.round(meleePct * 100) + "%";
  els.utilityCd.style.width = Math.round(utilityPct * 100) + "%";
}

export function setCrosshairSpread(spread) {
  // spread ist ein Bogenmaß-Wert ~0..0.05 -> auf Pixel-Offset mappen
  const px = 6 + Math.min(1, spread / 0.05) * 16;
  els.crossTop.style.transform = `translateY(-${px - 7}px)`;
  els.crossBottom.style.transform = `translateY(${px - 7}px)`;
  els.crossLeft.style.transform = `translateX(-${px - 7}px)`;
  els.crossRight.style.transform = `translateX(${px - 7}px)`;
}

let hitmarkerTimeout = null;
export function showHitmarker() {
  els.hitmarker.classList.remove("show");
  void els.hitmarker.offsetWidth; // reflow, damit Animation neu startet
  els.hitmarker.classList.add("show");
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

export function setTimer(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  els.timer.textContent = `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function setScore(playerScore, botsScore) {
  els.scorePlayer.textContent = playerScore;
  els.scoreBots.textContent = botsScore;
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

export function showRoundEnd(playerScore, botsScore, botStats, onRestart) {
  els.scoreboard.innerHTML = `
    <div class="row header"><span>SPIELER</span><span>ELIMS</span></div>
    <div class="row you"><span>Du</span><span>${playerScore}</span></div>
    ${botStats.map((b) => `<div class="row"><span>${b.name}</span><span>${b.kills}</span></div>`).join("")}
    <div class="row header" style="margin-top:8px"><span>Gesamt Bots</span><span>${botsScore}</span></div>
  `;
  els.roundEndScreen.classList.remove("hidden");
  els.newRoundBtn.onclick = () => {
    els.roundEndScreen.classList.add("hidden");
    onRestart();
  };
}
export function hideRoundEnd() {
  els.roundEndScreen.classList.add("hidden");
}
