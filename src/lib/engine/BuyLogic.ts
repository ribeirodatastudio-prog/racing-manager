import { PlayerInventory } from "@/types";
import { WEAPONS, EQUIPMENT_COSTS, TeamSide, WeaponType } from "./constants";
import { BuyStrategy } from "./types";

export class BuyLogic {

  public static processBuy(inventory: PlayerInventory, side: TeamSide, role: string, strategy?: BuyStrategy) {
    // Reset temporary round items not handled by MatchSimulator reset?
    // MatchSimulator resets grenades to [] at start of buy phase/round.
    // So inventory.grenades is empty coming in.

    // 1. Determine Buy Strategy
    if (!strategy) {
      const money = inventory.money;
      if (money >= 3800) strategy = "FULL";
      else if (money >= 2000 && Math.random() < 0.2) strategy = "FORCE"; // Reduced chance to force to prevent poverty loop
      else strategy = "ECO";
    }

    // 2. Buy Items based on strategy
    switch (strategy) {
      case "FULL":
        this.buyFull(inventory, side, role);
        break;
      case "FORCE":
        this.buyForce(inventory, side);
        break;
      case "HALF":
        this.buyHalf(inventory, side);
        break;
      case "BONUS":
        this.buyBonus(inventory, side);
        break;
      case "HERO":
        this.buyHero(inventory, side, role);
        break;
      case "ECO":
      default:
        this.buyEco(inventory, side);
        break;
    }
  }

  // --- Strategies ---

  private static buyFull(inventory: PlayerInventory, side: TeamSide, role: string) {
    // Priority: Rifle -> Kevlar -> Smoke -> Flash -> Molly -> HE (implied)

    // 1. Primary Weapon
    this.buyPrimary(inventory, side, role, "FULL");

    // 2. Armor (Full)
    this.buyArmor(inventory, true);

    // 3. Kit (CT) - High priority for Full buy? usually yes.
    if (side === TeamSide.CT) this.buyDefuseKit(inventory);

    // 4. Utilities
    this.buyGrenade(inventory, "smoke");
    this.buyGrenade(inventory, "flashbang");
    this.buyGrenade(inventory, "flashbang"); // Try second flash

    const molly = side === TeamSide.T ? "molotov" : "incendiary";
    this.buyGrenade(inventory, molly);

    this.buyGrenade(inventory, "he");
  }

  private static buyForce(inventory: PlayerInventory, side: TeamSide) {
    // Force: Armor -> Cheap Weapon -> Some Util
    this.buyArmor(inventory, true);

    if (!inventory.primaryWeapon) {
       // SMG / Galil / Famas
       if (side === TeamSide.T) {
          if (!this.purchase(inventory, "galil_ar")) {
             if (!this.purchase(inventory, "mac-10")) {
                 this.purchase(inventory, "tec-9");
             }
          }
       } else {
          if (!this.purchase(inventory, "famas")) {
             if (!this.purchase(inventory, "mp9")) {
                 this.purchase(inventory, "five-seven");
             }
          }
       }
    }

    // Defuse Kit (CT)
    if (side === TeamSide.CT && inventory.money >= 400 && Math.random() < 0.8) {
        this.buyDefuseKit(inventory);
    }

    // Grenades
    this.buyGrenade(inventory, "flashbang");
    this.buyGrenade(inventory, "smoke");
  }

  private static buyHalf(inventory: PlayerInventory, side: TeamSide) {
    const reserve = 2000;

    // Defuse Kit (CT) - Early check
    if (side === TeamSide.CT && inventory.money >= 400 + reserve) {
        this.buyDefuseKit(inventory);
    }

    // Armor (Vest) if > reserve
    if (inventory.money >= EQUIPMENT_COSTS.KEVLAR + reserve) {
        this.buyArmor(inventory, false);
    }

    // Pistol Upgrade
    if (!inventory.secondaryWeapon || inventory.secondaryWeapon === "glock-18" || inventory.secondaryWeapon === "usp-s") {
         if (inventory.money >= 500 + reserve) {
            if (side === TeamSide.T) this.purchase(inventory, "tec-9");
            else this.purchase(inventory, "five-seven");
         }
    }

    // One Flash
    if (inventory.money >= EQUIPMENT_COSTS.FLASHBANG + reserve) {
        this.buyGrenade(inventory, "flashbang");
    }
  }

  private static buyBonus(inventory: PlayerInventory, side: TeamSide) {
    // Light Armor
    this.buyArmor(inventory, false);

    // SMG
    if (!inventory.primaryWeapon) {
        if (side === TeamSide.T) this.purchase(inventory, "mac-10");
        else this.purchase(inventory, "mp9");
    }
  }

  private static buyHero(inventory: PlayerInventory, side: TeamSide, role: string) {
    if (role.includes("Star") || role === "AWPer") {
        this.buyFull(inventory, side, role);
    } else {
        this.buyEco(inventory, side);
    }
  }

  private static buyEco(inventory: PlayerInventory, side: TeamSide) {
    // P250 if possible
    if ((!inventory.secondaryWeapon || inventory.secondaryWeapon === "glock-18" || inventory.secondaryWeapon === "usp-s") && inventory.money >= 300) {
        this.purchase(inventory, "p250");
    }
    // Maybe a flash if rich for eco
    if (inventory.money > 2500) {
        this.buyGrenade(inventory, "flashbang");
    }
  }

  // --- Helpers ---

  private static buyPrimary(inventory: PlayerInventory, side: TeamSide, role: string, strategy: string) {
      if (inventory.primaryWeapon) return;

      if (role === "AWPer" && inventory.money >= WEAPONS["awp"].cost) {
          this.purchase(inventory, "awp");
          return;
      }

      // Rifles
      if (side === TeamSide.T) {
          if (!this.purchase(inventory, "ak-47")) {
              this.purchase(inventory, "galil_ar");
          }
      } else {
           if (!this.purchase(inventory, "m4a1-s")) { // Prefer -S
               this.purchase(inventory, "famas");
           }
      }
  }

  private static buyArmor(inventory: PlayerInventory, helmet: boolean) {
    if (inventory.hasHelmet) return; // Full
    if (inventory.hasKevlar && !helmet) return; // Has vest, satisfied

    const costVest = EQUIPMENT_COSTS.KEVLAR;
    const costHelmUpgrade = EQUIPMENT_COSTS.HELMET; // 350
    const costFull = EQUIPMENT_COSTS.FULL_ARMOR; // 1000

    if (inventory.hasKevlar && helmet) {
        if (inventory.money >= costHelmUpgrade) {
            inventory.money -= costHelmUpgrade;
            inventory.hasHelmet = true;
        }
    } else {
        if (helmet && inventory.money >= costFull) {
            inventory.money -= costFull;
            inventory.hasKevlar = true;
            inventory.hasHelmet = true;
        } else if (inventory.money >= costVest) {
            inventory.money -= costVest;
            inventory.hasKevlar = true;
        }
    }
  }

  private static buyDefuseKit(inventory: PlayerInventory) {
      if (inventory.hasDefuseKit) return;
      if (inventory.money >= EQUIPMENT_COSTS.KIT) {
          inventory.money -= EQUIPMENT_COSTS.KIT;
          inventory.hasDefuseKit = true;
      }
  }

  private static buyGrenade(inventory: PlayerInventory, type: string) {
      // 1. Check Limits
      if (inventory.grenades.length >= 4) return;

      const currentCount = inventory.grenades.filter(g => g === type).length;
      if (type === "flashbang") {
          if (currentCount >= 2) return;
      } else {
          if (currentCount >= 1) return;
      }

      // 2. Check Cost
      let cost = 0;
      switch(type) {
        case "smoke": cost = EQUIPMENT_COSTS.SMOKE; break;
        case "flashbang": cost = EQUIPMENT_COSTS.FLASHBANG; break;
        case "he": cost = EQUIPMENT_COSTS.HE; break;
        case "molotov": cost = EQUIPMENT_COSTS.MOLOTOV; break;
        case "incendiary": cost = EQUIPMENT_COSTS.INCENDIARY; break;
        default: return;
      }

      if (inventory.money >= cost) {
          inventory.money -= cost;
          inventory.grenades.push(type);
      }
  }

  private static purchase(inventory: PlayerInventory, weaponId: string): boolean {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return false;

    if (inventory.money < weapon.cost) return false;

    inventory.money -= weapon.cost;
    if (weapon.type === WeaponType.PISTOL) {
        inventory.secondaryWeapon = weaponId;
    } else {
        inventory.primaryWeapon = weaponId;
    }
    return true;
  }
}
