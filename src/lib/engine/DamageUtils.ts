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
  let damage = weapon.damage;
  let armorReduced = false;

  // 1. Hit Group Multiplier
  switch (hitGroup) {
    case "HEAD":
      damage *= weapon.hsMultiplier;
      break;
    case "STOMACH":
      damage *= 1.25;
      break;
    case "LEGS":
      damage *= 0.75;
      break;
    case "CHEST":
    default:
      damage *= 1.0;
      break;
  }

  // 2. Armor Reduction
  if (hitGroup === "HEAD") {
    if (target.hasHelmet) {
      damage *= weapon.armorPen;
      armorReduced = true;
    }
  } else if (hitGroup === "CHEST" || hitGroup === "STOMACH") {
    if (target.hasVest) {
      damage *= weapon.armorPen;
      armorReduced = true;
    }
  }
  // Legs are not armored

  return { damage: Math.floor(damage), armorReduced };
}
