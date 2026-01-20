import { SEGMENT_TYPES, type SegmentType } from './data';
import { randomInt, randomFloat, clamp } from './mathUtils';

export interface Track {
  id: string;
  name: string;
  segments: SegmentType[];
  laps: number;
  difficulty: number; // 0.5 to 1.5
  sector1: number; // Index where sector 1 ends (exclusive)
  sector2: number; // Index where sector 2 ends (exclusive)
}

const TRACK_NAMES = [
  "Monza Park", "Silverstone Circuit", "Spa Francorchamps", "Suzuka International",
  "Interlagos", "Circuit of the Americas", "Marina Bay", "Monte Carlo",
  "Red Bull Ring", "Zandvoort", "Hungaroring", "Imola", "Catalunya"
];

export const generateTrack = (): Track => {
  let straightsCount = 0;
  let turnsCount = 0;

  // 1. Define the Counts (The Ingredients)
  // Validation: If (Straights + Turns) is outside the allowed track length (13-28), re-roll the counts until valid.
  while (true) {
    straightsCount = randomInt(2, 8);
    turnsCount = randomInt(10, 20);
    const total = straightsCount + turnsCount;
    if (total >= 13 && total <= 28) {
      break;
    }
  }

  // 2. Fill the Bag (The Deck)
  const straights: SegmentType[] = [];
  const straightTypes = [
    SEGMENT_TYPES.SHORT_STRAIGHT,
    SEGMENT_TYPES.MEDIUM_STRAIGHT,
    SEGMENT_TYPES.LONG_STRAIGHT
  ];

  for (let i = 0; i < straightsCount; i++) {
    const type = straightTypes[randomInt(0, straightTypes.length - 1)];
    straights.push(type);
  }

  // Constraint: Ensure at least ONE of these is explicitly a LongStraight
  if (!straights.includes(SEGMENT_TYPES.LONG_STRAIGHT)) {
    const idx = randomInt(0, straights.length - 1);
    straights[idx] = SEGMENT_TYPES.LONG_STRAIGHT;
  }

  const turns: SegmentType[] = [];
  const turnTypes = [
    SEGMENT_TYPES.LOW_SPEED_CORNER,
    SEGMENT_TYPES.MEDIUM_SPEED_CORNER,
    SEGMENT_TYPES.HIGH_SPEED_CORNER
  ];

  for (let i = 0; i < turnsCount; i++) {
    const type = turnTypes[randomInt(0, turnTypes.length - 1)];
    turns.push(type);
  }

  // Combine lists
  const segmentList = [...straights, ...turns];

  // 3. Shuffle & Finalize
  // Fisher-Yates shuffle
  for (let i = segmentList.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [segmentList[i], segmentList[j]] = [segmentList[j], segmentList[i]];
  }

  // Start/Finish Logic: Find the LongStraight in the shuffled list and swap it to Index 0
  const longStraightIdx = segmentList.indexOf(SEGMENT_TYPES.LONG_STRAIGHT);
  if (longStraightIdx !== -1 && longStraightIdx !== 0) {
    [segmentList[0], segmentList[longStraightIdx]] = [segmentList[longStraightIdx], segmentList[0]];
  }

  const segments = segmentList;
  const numSegments = segments.length;

  // Calculate Laps: Clamp(Round(1000 / Segments), 50, 80)
  const calculatedLaps = Math.round(1000 / numSegments);
  const laps = clamp(calculatedLaps, 50, 80);

  // Difficulty: 0.5 to 1.5
  const difficulty = 200 * randomFloat(0.5, 1.5);

  const name = TRACK_NAMES[randomInt(0, TRACK_NAMES.length - 1)];

  const sector1 = Math.floor(segments.length / 3);
  const sector2 = Math.floor((segments.length * 2) / 3);

  return {
    id: `track-${Date.now()}`,
    name,
    segments,
    laps,
    difficulty,
    sector1,
    sector2
  };
};
