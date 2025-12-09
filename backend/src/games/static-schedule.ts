// Fallback schedule used when the Odds API scores endpoint is unavailable or returns no Cavs games.
// Dates are approximate future tipoffs for demo purposes only.
export type StaticScheduleGame = {
  homeTeam: string;
  awayTeam: string;
  startTimeISO: string;
};

export const staticCavsSchedule: StaticScheduleGame[] = [
  {
    homeTeam: 'Cleveland Cavaliers',
    awayTeam: 'Boston Celtics',
    startTimeISO: '2030-01-01T00:30:00.000Z', // far-future anchor to ensure it stays upcoming
  },
  {
    homeTeam: 'Miami Heat',
    awayTeam: 'Cleveland Cavaliers',
    startTimeISO: '2029-12-15T23:00:00.000Z',
  },
  {
    homeTeam: 'Cleveland Cavaliers',
    awayTeam: 'Chicago Bulls',
    startTimeISO: '2029-11-20T23:30:00.000Z',
  },
];
