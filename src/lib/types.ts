export interface Driver {
  id: string;
  name: string;
  rating: number; // 0-100
  morale: number; // 0-100
}

export interface MarketDriver extends Driver {
  salaryCost: number;
}

export interface Standing {
  rank: number;
  teamName: string;
  points: number;
  isUser: boolean;
}

export interface TeamData {
  name: string;
  funds: number;
  currentTier: string;
  nextRace: string;
  goal: string;
  drivers: Driver[];
}

export interface DashboardData {
  team: TeamData;
  standings: Standing[];
  market: MarketDriver[];
}
