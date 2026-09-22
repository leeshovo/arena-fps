// challenges.js — 3-4 gleichzeitig aktive Challenges mit Fortschrittsanzeige. Abgeschlossene
// Challenges geben eine Belohnung (über progression.js) und werden durch eine neue ersetzt.
import { loadSave, persist } from "./save.js";
import { grantRewards } from "./progression.js";

const ACTIVE_COUNT = 4;

export const CHALLENGE_POOL = [
  { id: "elims_10", metric: "eliminations", target: 10, desc: "Erziele 10 Eliminationen", reward: { xp: 150, currency: 80 } },
  { id: "elims_25", metric: "eliminations", target: 25, desc: "Erziele 25 Eliminationen", reward: { xp: 320, currency: 160 } },
  { id: "wins_3", metric: "roundWins", target: 3, desc: "Gewinne 3 Runden", reward: { xp: 220, currency: 110 } },
  { id: "wins_8", metric: "roundWins", target: 8, desc: "Gewinne 8 Runden", reward: { xp: 450, currency: 220 } },
  { id: "melee_5", metric: "meleeKills", target: 5, desc: "5 Nahkampf-Eliminationen", reward: { xp: 160, currency: 90 } },
  { id: "headshots_10", metric: "headshots", target: 10, desc: "10 Kopfschuss-Treffer", reward: { xp: 190, currency: 100 } },
  { id: "backstabs_3", metric: "backstabs", target: 3, desc: "3 Backstab-Eliminationen", reward: { xp: 210, currency: 120 } },
  { id: "utility_5", metric: "utilityKills", target: 5, desc: "5 Eliminationen mit Utility", reward: { xp: 180, currency: 100 } },
  { id: "assists_5", metric: "assists", target: 5, desc: "5 Assists", reward: { xp: 160, currency: 90 } },
  { id: "matches_5", metric: "matchesPlayed", target: 5, desc: "Spiele 5 Runden", reward: { xp: 120, currency: 70 } },
  { id: "matches_15", metric: "matchesPlayed", target: 15, desc: "Spiele 15 Runden", reward: { xp: 300, currency: 150 } },
];

function pickNewChallenge(excludeIds) {
  const pool = CHALLENGE_POOL.filter((c) => !excludeIds.includes(c.id));
  const source = pool.length > 0 ? pool : CHALLENGE_POOL;
  return source[Math.floor(Math.random() * source.length)];
}

/** Stellt sicher, dass immer ACTIVE_COUNT Challenges aktiv sind (z.B. beim ersten Start). */
export function ensureActiveChallenges() {
  const save = loadSave();
  let changed = false;
  while (save.challenges.active.length < ACTIVE_COUNT) {
    const existingIds = save.challenges.active.map((c) => c.id);
    const template = pickNewChallenge(existingIds);
    save.challenges.active.push({ id: template.id, progress: 0 });
    changed = true;
  }
  if (changed) persist();
  return getActiveChallenges();
}

export function getActiveChallenges() {
  const save = loadSave();
  return save.challenges.active.map((inst) => {
    const template = CHALLENGE_POOL.find((c) => c.id === inst.id);
    return { ...template, progress: inst.progress };
  });
}

/**
 * Meldet ein Gameplay-Event (z.B. "eliminations"). Erhöht den Fortschritt aller aktiven
 * Challenges mit passender Metrik, vergibt bei Abschluss die Belohnung und ersetzt die
 * Challenge durch eine neue. Gibt die frisch abgeschlossenen Challenges zurück (für die
 * Rundenende-Anzeige).
 */
export function registerEvent(metric, amount = 1) {
  const save = loadSave();
  const completed = [];

  for (let i = 0; i < save.challenges.active.length; i++) {
    const inst = save.challenges.active[i];
    const template = CHALLENGE_POOL.find((c) => c.id === inst.id);
    if (!template || template.metric !== metric) continue;

    inst.progress = Math.min(template.target, inst.progress + amount);
    if (inst.progress >= template.target) {
      const rewardResult = grantRewards(template.reward.xp, template.reward.currency);
      completed.push({ ...template, reward: rewardResult });
      save.challenges.completedCount += 1;

      const activeIds = save.challenges.active.map((c) => c.id);
      const next = pickNewChallenge(activeIds);
      save.challenges.active[i] = { id: next.id, progress: 0 };
    }
  }

  persist();
  return completed;
}
