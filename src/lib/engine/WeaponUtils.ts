import { WeaponType } from "./constants";

export class WeaponUtils {
  /**
   * Returns the tier of the weapon (1-4).
   * 1: Pistol
   * 2: Shotgun / SMG / Machine Gun
   * 3: Rifle
   * 4: Sniper
   */
  public static getWeaponTier(type: WeaponType): number {
    switch (type) {
      case WeaponType.PISTOL:
        return 1;
      case WeaponType.SHOTGUN:
      case WeaponType.SMG:
      case WeaponType.MACHINE_GUN:
        return 2;
      case WeaponType.RIFLE:
        return 3;
      case WeaponType.SNIPER:
        return 4;
      default:
        return 0; // Knife or other
    }
  }

  /**
   * Returns true if weapon A is better than weapon B.
   */
  public static isBetterWeapon(tierA: number, tierB: number): boolean {
      return tierA > tierB;
  }
}
