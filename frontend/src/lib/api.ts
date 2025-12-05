const API_BASE_URL = "http://localhost:3001";

export type NextGame = {
  gameId: string;
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

export async function createBet(payload: CreateBetPayload) {
  const url = `${API_BASE_URL}/bets`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create bet: ${res.status} ${text}`);
  }

  return res.json();
}
