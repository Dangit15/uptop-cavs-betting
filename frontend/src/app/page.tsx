"use client";

import { useEffect, useState } from "react";
import { fetchNextGame, createBet, BetSide, NextGame } from "@/lib/api";

type FetchState<T> = {
  loading: boolean;
  data: T | null;
  error: string | null;
};

export default function HomePage() {
  const [gameState, setGameState] = useState<FetchState<NextGame | null>>({
    loading: true,
    data: null,
    error: null,
  });

  const [side, setSide] = useState<BetSide>("home");
  const [stake, setStake] = useState<number>(10);
  const [placing, setPlacing] = useState(false);
  const [betMessage, setBetMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const game = await fetchNextGame();
        setGameState({ loading: false, data: game, error: null });
      } catch (err: any) {
        setGameState({
          loading: false,
          data: null,
          error: err?.message ?? "Failed to load game",
        });
      }
    };

    load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameState.data) return;

    setPlacing(true);
    setBetMessage(null);

    try {
      await createBet({
        gameId: gameState.data.gameId,
        userId: "demo-user-1", // later: replace with real user id
        side,
        stake,
      });
      setBetMessage("Bet placed successfully.");
    } catch (err: any) {
      setBetMessage(err?.message ?? "Failed to place bet.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 rounded-2xl shadow-xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold">UpTop Cavaliers Play-to-Earn</h1>

        {gameState.loading && <p>Loading next game…</p>}

        {gameState.error && (
          <p className="text-red-400 text-sm">Error: {gameState.error}</p>
        )}

        {!gameState.loading && (
          <div className="space-y-4">
            <section className="border border-slate-700 rounded-xl p-4">
              <h2 className="text-lg font-medium mb-2">Next Cavs Game</h2>
              {gameState.data ? (
                <>
                  <p className="text-sm text-slate-300">
                    Game ID:{" "}
                    <span className="font-mono">{gameState.data.gameId}</span>
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
                  No upcoming game scheduled yet. Seed a dev game to preview the
                  experience.
                </p>
              )}
            </section>

            {gameState.data && (
              <section className="border border-slate-700 rounded-xl p-4">
                <h2 className="text-lg font-medium mb-3">Place Your Bet</h2>
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
                      onChange={(e) => setStake(Number(e.target.value) || 0)}
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
                  <p className="text-xs mt-3 text-slate-300">{betMessage}</p>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
