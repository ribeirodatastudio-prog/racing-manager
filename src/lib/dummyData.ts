import { DashboardData } from './types';

export const dashboardData: DashboardData = {
  team: {
    name: "Velocity Racing",
    funds: 2500000,
    currentTier: "Formula 3",
    nextRace: "Silverstone GP",
    goal: "1st Place",
    drivers: [
      {
        id: "d1",
        name: "Alex Rivera",
        rating: 84,
        morale: 92,
      },
      {
        id: "d2",
        name: "Sarah Jenko",
        rating: 79,
        morale: 85,
      }
    ]
  },
  standings: [
    { rank: 1, teamName: "Red Arrow", points: 150, isUser: false },
    { rank: 2, teamName: "Velocity Racing", points: 142, isUser: true },
    { rank: 3, teamName: "Blue Speed", points: 135, isUser: false },
    { rank: 4, teamName: "Green Machine", points: 120, isUser: false },
    { rank: 5, teamName: "Yellow Flash", points: 110, isUser: false },
  ],
  market: [
    {
      id: "m1",
      name: "Max Verstappen (Clone)",
      rating: 99,
      morale: 100,
      salaryCost: 5000000
    },
    {
      id: "m2",
      name: "Rookie Norris",
      rating: 75,
      morale: 60,
      salaryCost: 150000
    },
    {
      id: "m3",
      name: "Veteran Vettel",
      rating: 88,
      morale: 80,
      salaryCost: 1200000
    }
  ]
};
