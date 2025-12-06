const API_BASE_URL = "http://localhost:3001";

export type NextGame = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  spread: number;
  bookmakerKey: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
};

export async function fetchNextGame(): Promise<NextGame | null> {
  // Hard-coded URL, no variables, no template string
  const url = "http://localhost:3001/games/next";

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch next game: ${res.status} ${text}`);
  }

  return res.json();
}

export type BetSide = "home" | "away";

export type CreateBetPayload = {
  gameId: string;
  userId: string;
  side: BetSide;
  stake: number;
};

export async function createBet(
  payload: CreateBetPayload,
  accessToken?: string
) {
  const url = `${API_BASE_URL}/bets`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create bet: ${res.status} ${text}`);
  }

  return res.json();
}

export type Bet = {
  _id: string;
  userId: string;
  gameId: {
    gameId: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    spread: number;
    status: string;
  };
  amount: number;
  side: BetSide;
  line: number;
  odds: number;
  status: string;
  createdAt: string;
};

export async function fetchMyBets(accessToken?: string): Promise<Bet[]> {
  const url = "http://localhost:3001/bets";

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, { cache: "no-store", headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch bets: ${res.status} ${text}`);
  }

  return res.json();
}
