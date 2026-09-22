// loadout.js — Das aktuell gewählte Loadout (Primär/Sekundär/Nahkampf/Utility + Skins je
// Slot) sowie Abfragen, was davon bereits freigeschaltet ist. Reine Auswahl-/Persistenz-
// Logik; die tatsächlichen Waffenwerte/-modelle liefert weapons.js über die gleichen IDs.
import { loadSave, persist } from "./save.js";
import { isUnlocked, getCatalogByType } from "./progression.js";

const SLOT_TYPES = ["primary", "secondary", "melee", "utility"];

export function getLoadout() {
  return { ...loadSave().loadout, skins: { ...loadSave().loadout.skins } };
}

/** Alle Katalogeinträge eines Slot-Typs, mit vermerktem Freischalt-Status. */
export function getOptionsForSlot(slotType) {
  return getCatalogByType(slotType).map((item) => ({ ...item, unlocked: isUnlocked(item.id) }));
}

export function getSkinOptions() {
  return getCatalogByType("skin").map((item) => ({ ...item, unlocked: isUnlocked(item.id) }));
}

/** Setzt die Waffe für einen Slot, wenn sie freigeschaltet ist. */
export function equipItem(slotType, itemId) {
  if (!SLOT_TYPES.includes(slotType)) return false;
  if (!isUnlocked(itemId)) return false;
  const save = loadSave();
  save.loadout[slotType] = itemId;
  persist();
  return true;
}

export function equipSkin(slotType, skinId) {
  if (!SLOT_TYPES.includes(slotType)) return false;
  if (!isUnlocked(skinId)) return false;
  const save = loadSave();
  save.loadout.skins[slotType] = skinId;
  persist();
  return true;
}

/** Fängt den Fall ab, dass ein zuvor gewähltes Item nie freigeschaltet war (z.B. nach Reset). */
export function sanitizeLoadout() {
  const save = loadSave();
  for (const slot of SLOT_TYPES) {
    if (!isUnlocked(save.loadout[slot])) {
      const fallback = getCatalogByType(slot).find((i) => isUnlocked(i.id));
      if (fallback) save.loadout[slot] = fallback.id;
    }
    if (!isUnlocked(save.loadout.skins[slot])) {
      save.loadout.skins[slot] = "skin_default";
    }
  }
  persist();
}
