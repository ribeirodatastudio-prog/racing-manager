import weaponsData from "../../data/weapons.json";
import { Weapon } from "../../types/Weapon";

export class WeaponManager {
  private static weapons: Map<string, Weapon> = new Map();

  static {
    (weaponsData as Weapon[]).forEach(w => {
      this.weapons.set(w.name, w);
    });
  }

  public static getWeapon(name: string): Weapon | undefined {
    return this.weapons.get(name);
  }

  public static getAllWeapons(): Weapon[] {
    return Array.from(this.weapons.values());
  }
}
