// progression.js — XP/Level, Währung (Fragmente), der Unlock-Katalog (Waffen + ihre Tier-
// Stufen) und das Rang-/Skill-Rating-System für gewertete Matches. Arbeitet auf save.js.
import { loadSave, persist } from "./save.js";
import { WEAPON_CATALOG } from "./weapons.js";

// --- Unlock-Katalog ---------------------------------------------------------------------
// Waffen: ab `level` automatisch gratis freigeschaltet, ODER jederzeit vorher für `cost`
// Fragmente kaufbar. Tier-Stufen (aus dem Waffenkatalog abgeleitet) funktionieren identisch,
// setzen aber voraus, dass die Basis-Waffe bereits freigeschaltet ist.
const WEAPON_UNLOCKS = [
  { id: "rifle_ar", type: "primary", name: "Sturmgewehr", level: 1, cost: 0 },
  { id: "rifle_paint", type: "primary", name: "Farbwaffe", level: 2, cost: 300 },
  { id: "rifle_burst", type: "primary", name: "Burst-Gewehr", level: 3, cost: 450 },
  { id: "rifle_shotgun", type: "primary", name: "Schrotflinte", level: 4, cost: 500 },
  { id: "rifle_dmr", type: "primary", name: "Scharfschützengewehr", level: 6, cost: 650 },
  { id: "rifle_energy", type: "primary", name: "Energiewaffe", level: 8, cost: 800 },
  { id: "pistol_std", type: "secondary", name: "Pistole", level: 1, cost: 0 },
  { id: "pistol_machine", type: "secondary", name: "Maschinenpistole", level: 3, cost: 350 },
  { id: "pistol_revolver", type: "secondary", name: "Wuchtrevolver", level: 4, cost: 400 },
  { id: "melee_knife", type: "melee", name: "Nahkampfmesser", level: 1, cost: 0 },
  { id: "melee_axe", type: "melee", name: "Kampfaxt", level: 2, cost: 300 },
  { id: "utility_grenade", type: "utility", name: "Wurfladung", level: 1, cost: 0 },
  { id: "utility_smoke", type: "utility", name: "Rauchgranate", level: 3, cost: 350 },
  { id: "utility_medkit", type: "utility", name: "Heilkapsel", level: 5, cost: 450 },
];

// Tier-Stufen (Index 1+) direkt aus dem Waffenkatalog ableiten, damit Name/Preis/Level nur
// an einer Stelle (weapons.js) gepflegt werden müssen.
const TIER_UNLOCKS = [];
for (const def of Object.values(WEAPON_CATALOG)) {
  def.tiers.forEach((t, idx) => {
    if (idx === 0) return;
    TIER_UNLOCKS.push({ id: t.id, type: "tier", name: t.name, level: t.level, cost: t.cost, weaponId: def.id, weaponName: def.name, tierIndex: idx });
  });
}

export const UNLOCK_CATALOG = [...WEAPON_UNLOCKS, ...TIER_UNLOCKS];

export function getCatalogItem(id) {
  return UNLOCK_CATALOG.find((i) => i.id === id) || null;
}

export function getCatalogByType(type) {
  return UNLOCK_CATALOG.filter((i) => i.type === type);
}

export function getTiersForWeapon(weaponId) {
  return TIER_UNLOCKS.filter((t) => t.weaponId === weaponId);
}

// --- XP-Kurve ---------------------------------------------------------------------------
export function xpToReachNextLevel(level) {
  return Math.round(200 + (level - 1) * 120);
}

export function getState() {
  const save = loadSave();
  return { level: save.level, xp: save.xp, currency: save.currency, xpToNext: xpToReachNextLevel(save.level) };
}

export function isUnlocked(id) {
  const save = loadSave();
  return save.unlockedItems.includes(id);
}

/** Alles, was durchs aktuelle Level bereits gratis verfügbar wäre, aber noch fehlt, freischalten. */
function autoUnlockByLevel(save) {
  const newlyUnlocked = [];
  for (const item of UNLOCK_CATALOG) {
    if (item.level <= save.level && !save.unlockedItems.includes(item.id)) {
      save.unlockedItems.push(item.id);
      newlyUnlocked.push(item);
    }
  }
  return newlyUnlocked;
}

/**
 * Vergibt XP/Fragmente (z.B. nach einer Runde) und wendet Level-Ups + automatische
 * Freischaltungen an. Gibt zurück, was sich geändert hat, für die Belohnungs-Anzeige.
 */
export function grantRewards(xpGain, currencyGain) {
  const save = loadSave();
  const startLevel = save.level;
  save.xp += Math.max(0, Math.round(xpGain));
  save.currency += Math.max(0, Math.round(currencyGain));

  let newlyUnlocked = [];
  while (save.xp >= xpToReachNextLevel(save.level)) {
    save.xp -= xpToReachNextLevel(save.level);
    save.level += 1;
    newlyUnlocked = newlyUnlocked.concat(autoUnlockByLevel(save));
  }
  // Auch ohne Level-Up einmal prüfen (z.B. nach einem Reset/Import).
  newlyUnlocked = newlyUnlocked.concat(autoUnlockByLevel(save));

  persist();
  return {
    xpGain,
    currencyGain,
    leveledUp: save.level > startLevel,
    fromLevel: startLevel,
    toLevel: save.level,
    newlyUnlocked,
  };
}

/** Kauft ein Item (Waffe oder Tier-Stufe) vorzeitig mit Fragmenten, unabhängig vom Level. */
export function purchaseItem(id) {
  const save = loadSave();
  const item = getCatalogItem(id);
  if (!item) return { ok: false, reason: "unknown" };
  if (save.unlockedItems.includes(id)) return { ok: false, reason: "already_unlocked" };
  if (item.type === "tier" && !save.unlockedItems.includes(item.weaponId)) return { ok: false, reason: "weapon_locked" };
  if (save.currency < item.cost) return { ok: false, reason: "not_enough_currency" };
  save.currency -= item.cost;
  save.unlockedItems.push(id);
  persist();
  return { ok: true, item };
}

export function recordMatchStat(key, amount = 1) {
  const save = loadSave();
  if (typeof save.stats[key] === "number") save.stats[key] += amount;
  persist();
}

export function getStats() {
  return { ...loadSave().stats };
}

// --- Rang / Skill-Rating -------------------------------------------------------------------
export const RANKS = [
  { id: "rekrut", name: "Rekrut", minSR: 0 },
  { id: "vollstrecker", name: "Vollstrecker", minSR: 300 },
  { id: "veteran", name: "Veteran", minSR: 700 },
  { id: "meisterschuetze", name: "Meisterschütze", minSR: 1200 },
  { id: "champion", name: "Champion", minSR: 1800 },
  { id: "ikone", name: "Ikone", minSR: 2500 },
];

export function getRankForSR(sr) {
  let current = RANKS[0];
  for (const r of RANKS) if (sr >= r.minSR) current = r;
  return current;
}

export function getRankState() {
  const save = loadSave();
  const rank = getRankForSR(save.rang.sr);
  const idx = RANKS.indexOf(rank);
  const next = RANKS[idx + 1] || null;
  return { sr: save.rang.sr, rank, next, winStreak: save.rang.winStreak };
}

/**
 * Wertet ein gewertetes Match aus: passt SR/Rang/Win-Streak an und schreibt einen
 * Bestenlisten-Eintrag. `difficultyId` beeinflusst den SR-Gewinn/-Verlust leicht.
 */
export function applyRankedResult(won, difficultyId, modeName) {
  const save = loadSave();
  const winDiffMult = { easy: 0.85, normal: 1, hard: 1.2 }[difficultyId] || 1;
  const lossDiffMult = { easy: 1.15, normal: 1, hard: 0.85 }[difficultyId] || 1;

  let delta;
  if (won) {
    save.rang.winStreak = Math.max(0, save.rang.winStreak) + 1;
    delta = Math.round((22 + Math.min(5, save.rang.winStreak - 1) * 2) * winDiffMult);
  } else {
    save.rang.winStreak = 0;
    delta = -Math.round(16 * lossDiffMult);
  }

  const fromSR = save.rang.sr;
  const fromRank = getRankForSR(fromSR);
  save.rang.sr = Math.max(0, save.rang.sr + delta);
  const toRank = getRankForSR(save.rang.sr);

  save.bestenliste.unshift({ date: Date.now(), won, delta, sr: save.rang.sr, rankName: toRank.name, modeName: modeName || "" });
  save.bestenliste = save.bestenliste.slice(0, 15);

  persist();
  return { delta, fromSR, toSR: save.rang.sr, fromRank, toRank, rankChanged: fromRank.id !== toRank.id, winStreak: save.rang.winStreak };
}

export function getLeaderboard() {
  return [...loadSave().bestenliste];
}
