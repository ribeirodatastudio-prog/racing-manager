import { Player } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Helper to get random integer
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ROLES = ["Entry Fragger", "Support", "IGL", "Lurker", "Star AWPer"];
const COUNTRIES = ["Sweden", "France", "USA", "Russia", "Brazil", "Denmark", "Ukraine", "Germany", "Poland", "Canada"];
const FIRST_NAMES = ["Olof", "Kenny", "Jordan", "Oleksandr", "Gabriel", "Nicolai", "Peter", "Nikola", "Marcelo", "Ladislav"];
const LAST_NAMES = ["Meister", "S", "Gilbert", "Kostyliev", "Toledo", "Reedtz", "Rasmussen", "Kovac", "David", "Kovacs"];

export function generatePlayer(id: string = uuidv4()): Player {
  const role = ROLES[Math.floor(Math.random() * ROLES.length)];
  const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;

  const utilityVal = getRandomInt(60, 199);

  return {
    id,
    name,
    age: getRandomInt(18, 28),
    nationality: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
    role,
    skills: {
      technical: {
        shooting: getRandomInt(60, 199),
        crosshairPlacement: getRandomInt(60, 199),
        sprayControl: getRandomInt(60, 199),
        utilityUsage: utilityVal,
        utility: utilityVal, // Alias
        firstBulletPrecision: getRandomInt(60, 199),
        movement: getRandomInt(60, 199),
        clutching: getRandomInt(60, 199),
      },
      mental: {
        positioning: getRandomInt(60, 199),
        adaptability: getRandomInt(60, 199),
        composure: getRandomInt(60, 199),
        communication: getRandomInt(60, 199),
        gameSense: getRandomInt(60, 199),
        aggression: getRandomInt(60, 199),
      },
      physical: {
        reactionTime: getRandomInt(60, 199),
        dexterity: getRandomInt(60, 199),
        consistency: getRandomInt(60, 199),
        injuryResistance: getRandomInt(60, 199),
      },
    },
  };
}

export function generateTeam(count: number, startId: number): Player[] {
  const team: Player[] = [];
  for (let i = 0; i < count; i++) {
    team.push(generatePlayer(`player-${startId + i}`));
  }
  return team;
}
