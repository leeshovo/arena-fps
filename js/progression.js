// progression.js — XP/Level, Währung und der Unlock-Katalog (welches Item ab welchem Level
// bzw. für welchen Preis freigeschaltet wird). Arbeitet auf der Save-Struktur aus save.js.
import { loadSave, persist } from "./save.js";

// --- Unlock-Katalog ---------------------------------------------------------------------
// Jeder Eintrag: ab `level` automatisch gratis freigeschaltet, ODER jederzeit vorher für
// `cost` Währung kaufbar (unabhängig vom aktuellen Level).
export const UNLOCK_CATALOG = [
  { id: "rifle_ar", type: "primary", name: "Sturmgewehr", level: 1, cost: 0 },
  { id: "pistol_std", type: "secondary", name: "Pistole", level: 1, cost: 0 },
  { id: "melee_knife", type: "melee", name: "Nahkampfmesser", level: 1, cost: 0 },
  { id: "utility_grenade", type: "utility", name: "Wurfladung", level: 1, cost: 0 },
  { id: "skin_default", type: "skin", name: "Standard", level: 1, cost: 0 },

  { id: "rifle_smg", type: "primary", name: "SMG", level: 2, cost: 350 },
  { id: "pistol_revolver", type: "secondary", name: "Wuchtrevolver", level: 3, cost: 450 },
  { id: "melee_axe", type: "melee", name: "Kampfaxt", level: 3, cost: 400 },
  { id: "skin_glacier", type: "skin", name: "Gletscher", level: 3, cost: 250 },
  { id: "rifle_burst", type: "primary", name: "Burst-Gewehr", level: 4, cost: 550 },
  { id: "utility_smoke", type: "utility", name: "Rauchgranate", level: 4, cost: 450 },
  { id: "rifle_shotgun", type: "primary", name: "Schrotflinte", level: 5, cost: 600 },
  { id: "pistol_machine", type: "secondary", name: "Maschinenpistole", level: 5, cost: 500 },
  { id: "skin_inferno", type: "skin", name: "Inferno", level: 6, cost: 350 },
  { id: "utility_medkit", type: "utility", name: "Med-Kit", level: 6, cost: 550 },
  { id: "rifle_dmr", type: "primary", name: "Marksman Rifle", level: 7, cost: 700 },
  { id: "skin_neon_violet", type: "skin", name: "Neon-Violett", level: 8, cost: 400 },
  { id: "rifle_lmg", type: "primary", name: "LMG", level: 9, cost: 850 },
  { id: "skin_gold", type: "skin", name: "Gold", level: 10, cost: 900 },
];

export function getCatalogItem(id) {
  return UNLOCK_CATALOG.find((i) => i.id === id) || null;
}

export function getCatalogByType(type) {
  return UNLOCK_CATALOG.filter((i) => i.type === type);
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
 * Vergibt XP/Währung (z.B. nach einer Runde) und wendet Level-Ups + automatische
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

/** Kauft ein Item vorzeitig mit Währung, unabhängig vom aktuellen Level. */
export function purchaseItem(id) {
  const save = loadSave();
  const item = getCatalogItem(id);
  if (!item) return { ok: false, reason: "unknown" };
  if (save.unlockedItems.includes(id)) return { ok: false, reason: "already_unlocked" };
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
