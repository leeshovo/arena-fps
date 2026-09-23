// save.js — Zentrales Save-System: eine JSON-Struktur in localStorage, die Progression,
// Loadout, Rang und Aufträge gemeinsam nutzen. Andere Module lesen/schreiben über diese Datei.

const SAVE_KEY = "kineticbreach_save_v1";

function defaultSave() {
  return {
    version: 2,
    xp: 0,
    level: 1,
    currency: 150, // kleiner Startbonus, damit im Loadout sofort etwas zu holen ist
    unlockedItems: ["rifle_ar", "pistol_std", "melee_knife", "utility_grenade"],
    loadout: {
      primary: "rifle_ar",
      secondary: "pistol_std",
      melee: "melee_knife",
      utility: "utility_grenade",
      tiers: { primary: 0, secondary: 0, melee: 0, utility: 0 },
    },
    aufträge: { active: [], completedCount: 0 },
    rang: { sr: 0, winStreak: 0 },
    bestenliste: [], // lokales Leaderboard: die letzten Ranglisten-Matches
    stats: {
      matchesPlayed: 0,
      eliminations: 0,
      roundWins: 0,
      meleeKills: 0,
      headshots: 0,
      backstabs: 0,
      utilityKills: 0,
      assists: 0,
      shotsFired: 0,
      shotsHit: 0,
    },
  };
}

/** Merged geladene Daten robust mit den Defaults (schützt vor fehlenden Feldern nach Updates). */
function mergeWithDefaults(loaded) {
  const base = defaultSave();
  if (!loaded || typeof loaded !== "object") return base;
  return {
    ...base,
    ...loaded,
    loadout: { ...base.loadout, ...(loaded.loadout || {}), tiers: { ...base.loadout.tiers, ...((loaded.loadout || {}).tiers || {}) } },
    aufträge: { ...base.aufträge, ...(loaded.aufträge || {}) },
    rang: { ...base.rang, ...(loaded.rang || {}) },
    bestenliste: Array.isArray(loaded.bestenliste) ? loaded.bestenliste : base.bestenliste,
    stats: { ...base.stats, ...(loaded.stats || {}) },
    unlockedItems: Array.isArray(loaded.unlockedItems) ? loaded.unlockedItems : base.unlockedItems,
  };
}

let cache = null;

export function loadSave() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    cache = mergeWithDefaults(raw ? JSON.parse(raw) : null);
  } catch (e) {
    console.warn("Save konnte nicht geladen werden, starte mit Standardwerten.", e);
    cache = defaultSave();
  }
  return cache;
}

export function persist() {
  if (!cache) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Save konnte nicht gespeichert werden (localStorage evtl. voll/blockiert).", e);
  }
}

export function resetSave() {
  cache = defaultSave();
  persist();
  return cache;
}
