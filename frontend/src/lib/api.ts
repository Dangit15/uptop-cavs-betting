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

export async function fetchNextGame(
  accessToken?: string
): Promise<NextGame | null> {
  // Hard-coded URL, no variables, no template string
  const url = "http://localhost:3001/games/next";

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
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

export async function createBet(payload: any, accessToken: string) {
  const url = `${API_BASE_URL}/bets`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

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

export async function fetchMyBets(accessToken: string) {
  console.log('fetchMyBets called with accessToken', accessToken);

  const res = await fetch(`${API_BASE_URL}/bets/me`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch bets: ${res.status}`);
  }

  return res.json();
}
