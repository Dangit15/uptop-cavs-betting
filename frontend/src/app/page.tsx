"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  fetchNextGame,
  fetchMyBets,
  createBet,
  seedDevGame,
  settleGame,
  getMyPoints,
  resetDemoData,
  BetSide,
  NextGame,
  Bet,
} from "@/lib/api";
import SessionDebug from "@/components/SessionDebug";

type FetchState<T> = {
  loading: boolean;
  data: T | null;
  error: string | null;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const accessToken = session?.accessToken as string | undefined;
  console.log("BETTING PAGE session", session, "accessToken", accessToken);

  const [gameState, setGameState] = useState<FetchState<NextGame | null>>({
    loading: true,
    data: null,
    error: null,
  });

  const [betsState, setBetsState] = useState<FetchState<Bet[]>>({
    loading: true,
    data: [],
    error: null,
  });

  const [side, setSide] = useState<BetSide>("home");
  const [stake, setStake] = useState<number>(10);
  const [placing, setPlacing] = useState(false);
  const [betMessage, setBetMessage] = useState<string | null>(null);
  const [betError, setBetError] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<"pending" | "success" | "error" | null>(null);
  const isAdmin = session?.user?.email === "admin@example.com";
  const [userPoints, setUserPoints] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setGameState((prev) => ({ ...prev, loading: true }));
      try {
        const game = await fetchNextGame(accessToken);
        setGameState({ loading: false, data: game, error: null });
      } catch (err: any) {
        setGameState({
          loading: false,
          data: null,
          error: err?.message ?? "Failed to load game",
        });
      }

      if (accessToken) {
        try {
          const bets = await fetchMyBets(accessToken);
          const normalized = Array.isArray(bets) ? bets : [];
          setBetsState({ loading: false, data: normalized, error: null });
          try {
            const points = await getMyPoints(accessToken);
            console.log("Fetched points for user:", points);
            setUserPoints(points);
          } catch (err) {
            console.error("Failed to fetch points", err);
            setUserPoints(0);
          }
        } catch (err: any) {
          setBetsState({
            loading: false,
            data: [],
            error: err?.message ?? "Failed to load bets",
          });
        }
      } else {
        setBetsState({ loading: false, data: [], error: null });
        setUserPoints(0);
      }
    };

    load();
  }, [accessToken]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!gameState.data) return;
    if (!accessToken) {
      setBetMessage("You must be logged in to place a bet.");
      return;
    }

    setPlacing(true);
    setBetMessage(null);
    setBetError(null);

    try {
      await createBet(accessToken, {
        gameId: gameState.data.gameId,
        side,
        stake,
      });
      setBetMessage("Bet placed successfully.");
      // Re-fetch bets for this user so the UI updates
      const updatedBets = await fetchMyBets(accessToken);
      setBetsState({
        loading: false,
        data: Array.isArray(updatedBets) ? updatedBets : [],
        error: null,
      });
    } catch (err: any) {
      setBetError(err?.message ?? "Failed to place bet.");
    } finally {
      setPlacing(false);
    }
  };

  const refreshGameAndBets = async () => {
    try {
      const game = await fetchNextGame(accessToken);
      setGameState({ loading: false, data: game, error: null });
    } catch (err: any) {
      setGameState({
        loading: false,
        data: null,
        error: err?.message ?? "Failed to load game",
      });
    }

    if (accessToken) {
      try {
        const bets = await fetchMyBets(accessToken);
        const normalized = Array.isArray(bets) ? bets : [];
        setBetsState({ loading: false, data: normalized, error: null });
        const points = await getMyPoints(accessToken);
        setUserPoints(points);
      } catch (err: any) {
        setBetsState({
          loading: false,
          data: [],
          error: err?.message ?? "Failed to load bets",
        });
        setUserPoints(0);
      }
    }
  };

  const onSeedDevGame = async () => {
    if (!accessToken) return;
    setSeeding(true);
    setSeedError(null);
    try {
      await seedDevGame(accessToken);
      await refreshGameAndBets();
    } catch (err: any) {
      console.error(err);
      setSeedError(err?.message ?? "Failed to seed dev game.");
    } finally {
      setSeeding(false);
    }
  };

  const onSettleGame = async () => {
    if (!accessToken || !gameState.data) return;
    setSettling(true);
    setSettleError(null);
    try {
      const result = await settleGame(gameState.data.gameId, accessToken);
      setGameState({ loading: false, data: result.game, error: null });
      if (accessToken) {
        try {
          const bets = await fetchMyBets(accessToken);
          const normalized = Array.isArray(bets) ? bets : [];
          setBetsState({ loading: false, data: normalized, error: null });
          const points = await getMyPoints(accessToken);
          setUserPoints(points);
        } catch (err: any) {
          setBetsState({
            loading: false,
            data: [],
            error: err?.message ?? "Failed to load bets",
          });
          setUserPoints(0);
        }
      }
    } catch (err: any) {
      console.error(err);
      setSettleError(err?.message ?? "Failed to settle game.");
    } finally {
      setSettling(false);
    }
  };

  const onResetDemo = async () => {
    if (!accessToken) return;
    const confirmed = window.confirm(
      "This will delete ALL games, bets, and points for this demo. Are you sure?"
    );
    if (!confirmed) return;
    setResetStatus("pending");
    try {
      await resetDemoData(accessToken);
      await refreshGameAndBets();
      setResetStatus("success");
    } catch (err: any) {
      console.error(err);
      setResetStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-6">
        <header className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 shadow">
          <h1 className="text-xl font-semibold">Cavs Betting</h1>
          <div className="flex items-center gap-3 text-sm">
            {status === "authenticated" ? (
              <>
                <span className="text-slate-200">
                  Logged in as {session?.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-md bg-slate-200 text-slate-900 px-3 py-1 font-medium hover:bg-white transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-slate-200 text-slate-900 px-3 py-1 font-medium hover:bg-white transition"
              >
                Login
              </Link>
            )}
          </div>
        </header>

        <div className="w-full max-w-xl bg-slate-900 rounded-2xl shadow-xl p-6 space-y-6">
          <SessionDebug />
          <h2 className="text-2xl font-semibold">
            UpTop Cavaliers Play-to-Earn
          </h2>

          {gameState.loading && <p>Loading next game…</p>}

          {gameState.error && (
            <p className="text-red-400 text-sm">Error: {gameState.error}</p>
          )}

          {!gameState.loading && (
            <div className="space-y-4">
              <section className="border border-slate-700 rounded-xl p-4">
                <h3 className="text-lg font-medium mb-2">Next Cavs Game</h3>
                {gameState.data ? (
                  <>
                    <p className="text-sm text-slate-300">
                      {gameState.data.homeTeam} vs {gameState.data.awayTeam}
                    </p>
                    <p className="text-sm text-slate-300">
                      Start time:{" "}
                      {new Date(gameState.data.startTime).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-300">
                      Cavs spread: {gameState.data.spread}
                    </p>
                    <p className="text-sm text-slate-300">
                      Sportsbook: {gameState.data.bookmakerKey}
                    </p>
                    <p className="text-sm text-slate-300">
                      Status: {gameState.data.status}
                    </p>
                    {typeof gameState.data.debugHomeScore === "number" && (
                      <p className="text-sm text-slate-300 mt-2">
                        Home score (debug): {gameState.data.debugHomeScore}
                      </p>
                    )}
                    {typeof gameState.data.debugAwayScore === "number" && (
                      <p className="text-sm text-slate-300">
                        Away score (debug): {gameState.data.debugAwayScore}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">
                      No upcoming game scheduled yet. Seed a dev game to preview
                      the experience.
                    </p>
                    {isAdmin && status === "authenticated" && accessToken && (
                      <button
                        onClick={onSeedDevGame}
                        disabled={seeding}
                        className="rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 px-4 py-2 text-sm font-medium"
                      >
                        {seeding ? "Seeding…" : "Seed dev game"}
                      </button>
                    )}
                    {seedError && (
                      <p className="text-xs text-red-400">{seedError}</p>
                    )}
                  </div>
                )}
                {status === "authenticated" &&
                  session?.user?.email === "admin@example.com" && (
                    <div className="mt-3 space-y-2">
                      {gameState.data &&
                        gameState.data.status === "upcoming" && (
                          <button
                            onClick={onSettleGame}
                            disabled={settling}
                            className="rounded-md bg-red-500 hover:bg-red-400 disabled:bg-slate-700 px-4 py-2 text-sm font-medium"
                          >
                            {settling ? "Settling…" : "Settle Game"}
                          </button>
                        )}
                      <button
                        onClick={onResetDemo}
                        disabled={resetStatus === "pending"}
                        className="rounded-md bg-red-600 hover:bg-red-500 disabled:bg-slate-700 px-4 py-2 text-sm font-medium"
                      >
                        {resetStatus === "pending" ? "Resetting…" : "Reset demo data"}
                      </button>
                      {settleError && (
                        <p className="text-xs text-red-400">{settleError}</p>
                      )}
                      {resetStatus === "pending" && (
                        <p className="text-xs text-slate-300">Resetting demo data...</p>
                      )}
                      {resetStatus === "success" && (
                        <p className="text-xs text-green-400">
                          Demo data cleared. You can seed a fresh dev game.
                        </p>
                      )}
                      {resetStatus === "error" && (
                        <p className="text-xs text-red-400">
                          Failed to reset demo data. Please try again.
                        </p>
                      )}
                    </div>
                  )}
              </section>

              {gameState.data && (
                <section className="border border-slate-700 rounded-xl p-4">
                  <h3 className="text-lg font-medium mb-3">Place Your Bet</h3>
                  {status === "unauthenticated" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-300">
                        You must be logged in to place a bet.
                      </p>
                      <Link
                        href="/login?callbackUrl=/"
                        className="inline-flex justify-center rounded-md bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition"
                      >
                        Go to Login
                      </Link>
                    </div>
                  ) : gameState.data.status !== "upcoming" ? (
                    <p className="text-sm text-slate-300">
                      Betting is closed for this game. Check back for the next
                      matchup.
                    </p>
                  ) : (
                    <>
                      <form className="space-y-4" onSubmit={onSubmit}>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="side"
                              value="home"
                              checked={side === "home"}
                              onChange={() => setSide("home")}
                            />
                            Cavs side
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="side"
                              value="away"
                              checked={side === "away"}
                              onChange={() => setSide("away")}
                            />
                            Opponent side
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-sm w-20">Stake:</label>
                          <input
                            type="number"
                            min={1}
                            value={stake}
                            onChange={(e) =>
                              setStake(Number(e.target.value) || 0)
                            }
                            className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={placing || !gameState.data}
                          className="w-full rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 px-4 py-2 text-sm font-medium"
                        >
                          {placing ? "Placing bet…" : "Place bet"}
                        </button>
                      </form>

                      {betMessage && (
                        <p className="text-xs mt-3 text-slate-300">
                          {betMessage}
                        </p>
                      )}
                      {betError && (
                        <p className="text-xs mt-2 text-red-400">{betError}</p>
                      )}
                      {!accessToken && (
                        <p className="mt-2 text-xs text-slate-400">
                          You must be logged in to place a bet.
                        </p>
                      )}
                    </>
                  )}
                </section>
              )}

              {status === "authenticated" && (
                <section className="border border-slate-700 rounded-xl p-4">
                  <h3 className="text-lg font-medium mb-2">My Bets</h3>
                  <p className="text-sm text-slate-300 mb-2">
                    Total Points: {userPoints ?? 0}
                  </p>

                  {betsState.loading && <p>Loading bets…</p>}

                  {betsState.error && (
                    <p className="text-red-400 text-sm">Error: {betsState.error}</p>
                  )}

                  {!betsState.loading && !betsState.error && (
                    <div>
                      {betsState.data.length > 0 ? (
                        <ul className="space-y-3">
                          {betsState.data.map((bet) => (
                            <li
                              key={bet._id}
                              className="border border-slate-700 rounded-lg p-3 text-sm text-slate-200"
                            >
                              <p className="font-medium">
                                {bet.gameId.homeTeam} vs {bet.gameId.awayTeam}
                              </p>
                              <p>Side: {bet.side} • Amount: {bet.amount}</p>
                              <p>
                                Line: {bet.line} • Status:{" "}
                                {bet.status === "push"
                                  ? "Push (no points awarded)"
                                  : bet.status}
                              </p>
                              <p className="text-slate-400">
                                Placed: {new Date(bet.createdAt).toLocaleString()}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-300">
                          You have no bets yet.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
