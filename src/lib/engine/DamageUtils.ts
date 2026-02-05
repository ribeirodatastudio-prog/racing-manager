import { Bot } from "./Bot";
import { Weapon } from "@/types/Weapon";

export type HitGroup = "HEAD" | "CHEST" | "STOMACH" | "LEGS";

export function determineHitGroup(attacker: Bot): HitGroup {
  const placement = attacker.player.skills.technical.crosshairPlacement;
  // Chance for headshot: 5% base + up to 75% bonus (Max 80% at 200 skill)
  const headChance = 0.05 + (placement / 200) * 0.75;

  const roll = Math.random();

  if (roll < headChance) return "HEAD";

  // Remaining distribution (Chest is most likely for body shots)
  const roll2 = Math.random();

  if (roll2 < 0.6) return "CHEST";
  if (roll2 < 0.85) return "STOMACH";
  return "LEGS";
}

export function calculateDamage(
  weapon: Weapon,
  hitGroup: HitGroup,
  target: Bot
): { damage: number; armorReduced: boolean } {
  const baseDamage = weapon.damage;
  let finalDamage = baseDamage;
  let armorReduced = false;

  // Track HS Mult for logging
  let usedHsMult = weapon.hsMultiplier;

  // 1. Hit Group Multiplier
  switch (hitGroup) {
    case "HEAD":
      // Handle "N/A" (0.0) -> Fallback to 4.0
      if (usedHsMult === 0) {
        usedHsMult = 4.0;
      }
      finalDamage *= usedHsMult;
      break;
    case "STOMACH":
      finalDamage *= 1.25;
      break;
    case "LEGS":
      finalDamage *= 0.75;
      break;
    case "CHEST":
    default:
      finalDamage *= 1.0;
      break;
  }

  // 2. Armor Reduction
  if (hitGroup === "HEAD") {
    if (target.hasHelmet) {
      finalDamage *= weapon.armorPen;
      armorReduced = true;
    }
  } else if (hitGroup === "CHEST" || hitGroup === "STOMACH") {
    if (target.hasVest) {
      finalDamage *= weapon.armorPen;
      armorReduced = true;
    }
  }
  // Legs are not armored

  // Log Debugging
  console.log(`[Debug] Weapon: ${weapon.name} | Base: ${baseDamage} | HS Mult: ${usedHsMult} | Armor Pen: ${weapon.armorPen} | Result: ${finalDamage.toFixed(2)}`);

  // Ensure Minimum Damage of 1 and Round Down
  const resultDamage = Math.max(1, Math.floor(finalDamage));

  return { damage: resultDamage, armorReduced };
}
