import { Player, TechnicalSkills, MentalSkills, PhysicalSkills } from "@/types";

const FIRST_NAMES = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Donald", "Mark", "Paul", "Steven", "Andrew", "Kenneth", "Joshua", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon", "Benjamin"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"];
const NICKNAMES = ["Ace", "Beast", "Cypher", "Dash", "Echo", "Falcon", "Ghost", "Hawk", "Ice", "Joker", "King", "Lion", "Maverick", "Neo", "Omen", "Phantom", "Quantum", "Raven", "Shadow", "Titan", "Viper", "Wolf", "Xeno", "Yeti", "Zeus", "Niko", "S1mple", "Zywoo", "Device", "Twistzz", "Ropz", "Rain", "Karrigan", "Apex", "Sh1ro", "Ax1le", "H1n", "Grim", "Floppy", "Elige"];
const NATIONALITIES = ["USA", "Canada", "UK", "France", "Germany", "Sweden", "Denmark", "Norway", "Finland", "Poland", "Russia", "Ukraine", "Brazil", "Argentina", "Australia", "China"];
const ROLES = ["Rifler", "AWPer", "Entry Fragger", "Support", "IGL", "Lurker"];

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const generateSkills = (): { technical: TechnicalSkills; mental: MentalSkills; physical: PhysicalSkills } => {
  return {
    technical: {
      shooting: getRandomInt(60, 199),
      crosshairPlacement: getRandomInt(60, 199),
      sprayControl: getRandomInt(60, 199),
      utilityUsage: getRandomInt(60, 199),
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
      aggression: getRandomInt(30, 200), // Wider range for aggression
    },
    physical: {
      reactionTime: getRandomInt(60, 199),
      dexterity: getRandomInt(60, 199),
      consistency: getRandomInt(60, 199),
      injuryResistance: getRandomInt(60, 199),
    },
  };
};

export const generateRandomPlayer = (id: string, suffix?: string): Player => {
  const firstName = getRandomItem(FIRST_NAMES);
  const lastName = getRandomItem(LAST_NAMES);
  const nickname = getRandomItem(NICKNAMES);
  const name = `${firstName} '${nickname}' ${lastName}${suffix ? ` (${suffix})` : ''}`;

  return {
    id,
    name,
    age: getRandomInt(16, 35),
    nationality: getRandomItem(NATIONALITIES),
    role: getRandomItem(ROLES),
    skills: generateSkills(),
  };
};

export const generateTeam = (count: number, startId: number, suffix?: string): Player[] => {
  const team: Player[] = [];
  for (let i = 0; i < count; i++) {
    team.push(generateRandomPlayer(`p${startId + i}`, suffix));
  }
  return team;
};
