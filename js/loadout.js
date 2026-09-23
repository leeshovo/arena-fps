// loadout.js — Das aktuell gewählte Loadout (Primär/Sekundär/Nahkampf/Utility + jeweils eine
// Tier-Stufe der gewählten Waffe) sowie Abfragen, was davon bereits freigeschaltet ist. Reine
// Auswahl-/Persistenz-Logik; die tatsächlichen Waffenwerte/-modelle liefert weapons.js.
import { loadSave, persist } from "./save.js";
import { isUnlocked, getCatalogByType, getTiersForWeapon } from "./progression.js";
import { getWeaponDef } from "./weapons.js";

const SLOT_TYPES = ["primary", "secondary", "melee", "utility"];

export function getLoadout() {
  const save = loadSave();
  return { ...save.loadout, tiers: { ...save.loadout.tiers } };
}

/** Alle Katalogeinträge eines Slot-Typs, mit vermerktem Freischalt-Status. */
export function getOptionsForSlot(slotType) {
  return getCatalogByType(slotType).map((item) => ({ ...item, unlocked: isUnlocked(item.id) }));
}

/** Alle Tier-Stufen der aktuell in diesem Slot ausgerüsteten Waffe (Index 0 = immer frei). */
export function getTierOptionsForWeapon(weaponId) {
  const def = getWeaponDef(weaponId);
  if (!def) return [];
  const extra = getTiersForWeapon(weaponId);
  return def.tiers.map((t, idx) => {
    if (idx === 0) return { index: 0, name: t.name, accent: t.accent, overlay: !!t.overlay, unlocked: true };
    const catalogEntry = extra.find((e) => e.tierIndex === idx);
    return {
      index: idx, name: t.name, accent: t.accent, overlay: !!t.overlay,
      unlocked: catalogEntry ? isUnlocked(catalogEntry.id) : false,
      level: catalogEntry?.level, cost: catalogEntry?.cost, id: catalogEntry?.id,
    };
  });
}

/** Setzt die Waffe für einen Slot, wenn sie freigeschaltet ist. Tier springt dabei auf 0 zurück. */
export function equipItem(slotType, itemId) {
  if (!SLOT_TYPES.includes(slotType)) return false;
  if (!isUnlocked(itemId)) return false;
  const save = loadSave();
  save.loadout[slotType] = itemId;
  save.loadout.tiers[slotType] = 0;
  persist();
  return true;
}

/** Setzt die Tier-Stufe der aktuell in diesem Slot ausgerüsteten Waffe. */
export function equipTier(slotType, tierIndex) {
  if (!SLOT_TYPES.includes(slotType)) return false;
  const save = loadSave();
  const options = getTierOptionsForWeapon(save.loadout[slotType]);
  const target = options.find((o) => o.index === tierIndex);
  if (!target || !target.unlocked) return false;
  save.loadout.tiers[slotType] = tierIndex;
  persist();
  return true;
}

/** Fängt den Fall ab, dass ein zuvor gewähltes Item/Tier nie freigeschaltet war (z.B. nach Reset). */
export function sanitizeLoadout() {
  const save = loadSave();
  for (const slot of SLOT_TYPES) {
    if (!isUnlocked(save.loadout[slot])) {
      const fallback = getCatalogByType(slot).find((i) => isUnlocked(i.id));
      if (fallback) save.loadout[slot] = fallback.id;
    }
    const tierOptions = getTierOptionsForWeapon(save.loadout[slot]);
    const current = tierOptions.find((o) => o.index === save.loadout.tiers[slot]);
    if (!current || !current.unlocked) save.loadout.tiers[slot] = 0;
  }
  persist();
}
