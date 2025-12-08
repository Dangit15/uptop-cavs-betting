const API_BASE_URL = "http://localhost:3001";

export type NextGame = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  spread: number;
  bookmakerKey: string;
  status: string;
  debugHomeScore?: number;
  debugAwayScore?: number;
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
  side: BetSide;
  stake: number;
};

export async function seedDevGame(accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/games/dev/seed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to seed dev game: ${res.status} ${text}`);
  }

  return res.json();
}

export async function settleGame(gameId: string, accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/bets/settle`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gameId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to settle game: ${res.status} ${text}`);
  }

  return res.json();
}

export async function resetDemoData(accessToken: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/reset`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    let message = "Failed to reset demo data";
    try {
      const body = await res.json();
      if (typeof body?.message === "string") {
        message = body.message;
      } else if (Array.isArray(body?.message) && body.message.length > 0) {
        message = body.message[0];
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
}

export async function getMyPoints(accessToken: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/points/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      return 0;
    }

    const data = await res.json();
    return typeof data.totalPoints === "number" ? data.totalPoints : 0;
  } catch {
    return 0;
  }
}

export async function createBet(
  accessToken: string,
  bet: CreateBetPayload,
) {
  const res = await fetch(`${API_BASE_URL}/bets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bet),
  });

  if (!res.ok) {
    let message = `Failed to place bet`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") {
        message = body.message;
      } else if (Array.isArray(body?.message) && body.message.length > 0) {
        message = body.message[0];
      }
    } catch {
      // ignore parse errors and use default message
    }
    throw new Error(message);
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
  status: "pending" | "won" | "lost" | "push" | "refunded";
  createdAt: string;
};

export async function fetchMyBets(accessToken: string): Promise<Bet[]> {
  const res = await fetch(`${API_BASE_URL}/bets/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch bets: ${res.status}`);
  }

  return res.json();
}
