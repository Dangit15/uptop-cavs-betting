"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  fetchNextGame,
  fetchMyBets,
  createBet,
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
  const accessToken = (session as any)?.accessToken;
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

  useEffect(() => {
    if (!accessToken) return;

    const load = async () => {
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

      try {
        const bets = await fetchMyBets(accessToken);
        setBetsState({ loading: false, data: bets, error: null });
      } catch (err: any) {
        setBetsState({
          loading: false,
          data: [],
          error: err?.message ?? "Failed to load bets",
        });
      }
    };

    load();
  }, [accessToken]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!gameState.data) return;
    if (!session || !session.user?.id) {
      setBetMessage("You must be logged in to place a bet.");
      return;
    }
    if (!accessToken) {
      setBetMessage("Missing access token. Please log in again.");
      return;
    }

    const userId = session.user.id;

    setPlacing(true);
    setBetMessage(null);

    try {
      await createBet(
        {
          gameId: gameState.data.gameId,
          userId,
          side,
          stake,
        },
        accessToken
      );
      setBetMessage("Bet placed successfully.");
      // Re-fetch bets for this user so the UI updates
      const updatedBets = await fetchMyBets(accessToken);
      setBetsState({
        loading: false,
        data: updatedBets,
        error: null,
      });
    } catch (err: any) {
      setBetMessage(err?.message ?? "Failed to place bet.");
    } finally {
      setPlacing(false);
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
                    {typeof gameState.data.homeScore === "number" && (
                      <p className="text-sm text-slate-300 mt-2">
                        Home score (debug): {gameState.data.homeScore}
                      </p>
                    )}
                    {typeof gameState.data.awayScore === "number" && (
                      <p className="text-sm text-slate-300">
                        Away score (debug): {gameState.data.awayScore}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-300">
                    No upcoming game scheduled yet. Seed a dev game to preview
                    the experience.
                  </p>
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
                    </>
                  )}
                </section>
              )}

              <section className="border border-slate-700 rounded-xl p-4">
                <h3 className="text-lg font-medium mb-2">My Bets</h3>

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
                            <p>Line: {bet.line} • Status: {bet.status}</p>
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
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
