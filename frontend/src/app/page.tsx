"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  fetchNextGame,
  fetchMyBets,
  createBet,
  seedDevGame,
  seedFakeGame,
  settleGame,
  getMyPoints,
  resetDemoData,
  BetSide,
  NextGame,
  Bet,
  getNextCavsSchedule,
  NextScheduleGame,
} from "@/lib/api";
import SessionDebug from "@/components/SessionDebug";

type FetchState<T> = {
  loading: boolean;
  data: T | null;
  error: string | null;
};

function formatCavsMatchup(game: { homeTeam: string; awayTeam: string }) {
  const home = game.homeTeam;
  const away = game.awayTeam;
  const cavsRegex = /cavaliers/i;
  const isCavsHome = cavsRegex.test(home);
  const isCavsAway = cavsRegex.test(away);

  if (!isCavsHome && !isCavsAway) {
    return { title: `${home} vs ${away}`, role: undefined };
  }

  if (isCavsHome) {
    return { title: `Cleveland Cavaliers vs ${away}`, role: 'Home' };
  }

  return { title: `Cleveland Cavaliers @ ${home}`, role: 'Away' };
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const accessToken = session?.accessToken as string | undefined;
  console.log("BETTING PAGE session", session, "accessToken", accessToken);

  const [gameState, setGameState] = useState<FetchState<NextGame | null>>({
    loading: true,
    data: null,
    error: null,
  });

  const [scheduleState, setScheduleState] = useState<
    FetchState<NextScheduleGame | null>
  >({
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
  const [seedStatus, setSeedStatus] = useState<{
    tone: "success" | "info" | "error";
    message: string;
  } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedingFake, setSeedingFake] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<"pending" | "success" | "error" | null>(null);
  const isAdmin = session?.user?.email === "admin@example.com";
  const devSeedEnabled = process.env.NEXT_PUBLIC_DEV_SEED_ENABLED === "true";
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [finalHomeScore, setFinalHomeScore] = useState<string>("");
  const [finalAwayScore, setFinalAwayScore] = useState<string>("");

  const formatNextGameError = (err: any) => {
    if (err?.message === "MISSING_ODDS_API_KEY") {
      return "Live odds are disabled because ODDS_API_KEY is not configured. Use the admin tools to seed a dev game instead.";
    }
    return err?.message ?? "Failed to load game";
  };

  const formatBookmaker = (bookmakerKey?: string) => {
    if (!bookmakerKey || bookmakerKey.length === 0) return "Unknown sportsbook";
    const lower = bookmakerKey.toLowerCase();
    if (lower === "dev-book") {
      return "UpTop Cavs Betting Challenge (dev book)";
    }
    const cleaned = lower.replace(/[-_]+/g, " ").trim();
    if (!cleaned) return "Unknown sportsbook";
    return cleaned
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  useEffect(() => {
    const load = async () => {
      setGameState((prev) => ({ ...prev, loading: true }));
      setScheduleState((prev) => ({ ...prev, loading: true }));
      try {
        const schedule = await getNextCavsSchedule();
        setScheduleState({ loading: false, data: schedule, error: null });
      } catch (err: any) {
        setScheduleState({
          loading: false,
          data: null,
          error: err?.message ?? "Failed to load schedule",
        });
      }
      try {
        const game = await fetchNextGame(accessToken);
        setGameState({ loading: false, data: game, error: null });
      } catch (err: any) {
        setGameState({
          loading: false,
          data: null,
          error: formatNextGameError(err),
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
      setScheduleState((prev) => ({ ...prev, loading: true }));
      const schedule = await getNextCavsSchedule();
      setScheduleState({ loading: false, data: schedule, error: null });
    } catch (err: any) {
      setScheduleState({
        loading: false,
        data: null,
        error: err?.message ?? "Failed to load schedule",
      });
    }
    try {
      const game = await fetchNextGame(accessToken);
      setGameState({ loading: false, data: game, error: null });
    } catch (err: any) {
      setGameState({
        loading: false,
        data: null,
        error: formatNextGameError(err),
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
    setSeedStatus(null);
    try {
      const result = await seedDevGame(accessToken);
      if (result.status === 200 || result.status === 201) {
        setSeedStatus({
          tone: "success",
          message: "Seeded next game from Odds API.",
        });
        await refreshGameAndBets();
        return;
      }

      const messageFromApi =
        typeof result.body?.message === "string" ? result.body.message : null;

      if (result.status === 404 && messageFromApi === "No upcoming Cavs game found from Odds API") {
        setSeedStatus({
          tone: "info",
          message: "No upcoming Cavaliers game is available from the Odds API right now.",
        });
        return;
      }

      setSeedStatus({
        tone: "error",
        message: "Failed to seed dev game. Please try again later.",
      });
    } catch (err) {
      console.error(err);
      setSeedStatus({
        tone: "error",
        message: "Failed to seed dev game. Please try again later.",
      });
    } finally {
      setSeeding(false);
    }
  };

  const onSeedFakeGame = async () => {
    if (!accessToken) return;
    setSeedingFake(true);
    setSeedStatus(null);
    try {
      const result = await seedFakeGame(accessToken);
      if (result.status === 201) {
        setSeedStatus({
          tone: "success",
          message: "Seeded fake demo game.",
        });
        await refreshGameAndBets();
        return;
      }
      setSeedStatus({
        tone: "error",
        message: "Failed to seed fake demo game.",
      });
    } catch (err) {
      console.error(err);
      setSeedStatus({
        tone: "error",
        message: "Failed to seed fake demo game.",
      });
    } finally {
      setSeedingFake(false);
    }
  };

  const onSettleGame = async () => {
    if (!accessToken || !gameState.data) return;
    const homeScoreNumber = Number(finalHomeScore);
    const awayScoreNumber = Number(finalAwayScore);
    if (!Number.isFinite(homeScoreNumber) || !Number.isFinite(awayScoreNumber)) {
      setSettleError("Please enter valid final scores.");
      return;
    }
    setSettling(true);
    setSettleError(null);
    try {
      const result = await settleGame(
        gameState.data.gameId,
        homeScoreNumber,
        awayScoreNumber,
        accessToken,
      );
      setGameState({ loading: false, data: result.game, error: null });
      setFinalHomeScore("");
      setFinalAwayScore("");
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
      "This will delete ALL games, bets, and points for this demo. Are you sure?",
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
    <main className="min-h-screen">
      <div className="min-h-[80vh] max-w-6xl mx-auto py-20 px-4 sm:px-6 lg:px-10 flex flex-col gap-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-gray-500">UpTop</p>
            <h1 className="text-3xl font-semibold text-black">UpTop Cavs Betting</h1>
            <p className="text-sm text-gray-600">
              Coding challenge prototype for UpTop / Rain
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {status === "authenticated" ? (
              <>
                <span className="text-gray-700">
                  Logged in as {session?.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-full bg-[#ff007a] text-white px-4 py-2 font-medium shadow-sm hover:opacity-90 transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-[#ff007a] text-white px-4 py-2 font-medium shadow-sm hover:opacity-90 transition"
              >
                Login
              </Link>
            )}
          </div>
        </header>

        <SessionDebug />

        <div className="grid gap-10 md:grid-cols-[2fr_1.4fr] mt-10">
          <section className="bg-white rounded-3xl shadow-md p-8 space-y-8">
            {(() => {
              const displayGame: (NextGame | NextScheduleGame) | null =
                gameState.data ?? scheduleState.data;
              const cavsDisplay = displayGame
                ? formatCavsMatchup({
                    homeTeam: displayGame.homeTeam,
                    awayTeam: displayGame.awayTeam,
                  })
                : null;
              const hasOdds = Boolean(gameState.data);
              const isCardLoading =
                gameState.loading && scheduleState.loading && !displayGame;
              const cardError =
                gameState.error && !displayGame
                  ? gameState.error
                  : scheduleState.error && !displayGame
                  ? scheduleState.error
                  : null;

              return (
                <>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Next Cavs Game
                    </p>
                    <h2 className="text-xl font-semibold text-black">
                      {cavsDisplay
                        ? cavsDisplay.title
                        : displayGame
                          ? `${displayGame.homeTeam} vs ${displayGame.awayTeam}`
                          : "No active game available"}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {displayGame
                        ? `Starts ${new Date(displayGame.startTime).toLocaleString()}`
                        : "We’ll show the next Cavaliers matchup here as soon as odds are available."}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Last synced: when you opened this page
                    </p>
                  </div>

                  {isCardLoading && (
                    <p className="text-sm text-gray-600">Loading next game…</p>
                  )}

                  {cardError && (
                    <p className="text-sm text-red-500">Error: {cardError}</p>
                  )}

                  {!isCardLoading && !cardError && (
                    <>
                      {displayGame ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                              Status:{" "}
                              <span className="font-semibold text-black">
                                {displayGame.status}
                              </span>
                            </p>
                            {cavsDisplay?.role && (
                              <p className="text-sm text-gray-600">
                                Cavs side:{" "}
                                <span className="font-semibold text-black">
                                  {cavsDisplay.role}
                                </span>
                              </p>
                            )}
                            {hasOdds ? (
                              <p className="text-sm text-gray-600">
                                Cavs spread:{" "}
                                <span className="font-semibold text-black">
                                  {gameState.data?.spread}
                                </span>
                              </p>
                            ) : null}
                            {!hasOdds ? (
                              <p className="text-sm text-gray-600">
                                Odds will appear here as soon as a market is posted.
                              </p>
                            ) : null}
                            {hasOdds &&
                              gameState.data?.status === "final" &&
                              typeof (gameState.data as any).finalHomeScore ===
                                "number" &&
                              typeof (gameState.data as any).finalAwayScore ===
                                "number" && (
                                <div className="mt-2 text-sm text-gray-700">
                                  <div className="font-semibold">Final score</div>
                                  <div className="flex justify-between">
                                    <span>{gameState.data.homeTeam}</span>
                                    <span>{(gameState.data as any).finalHomeScore}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{gameState.data.awayTeam}</span>
                                    <span>{(gameState.data as any).finalAwayScore}</span>
                                  </div>
                                </div>
                              )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                              Start time:{" "}
                              <span className="font-semibold text-black">
                                {new Date(displayGame.startTime).toLocaleString()}
                              </span>
                            </p>
                            {hasOdds ? (
                              <p className="text-sm text-gray-600">
                                Sportsbook:{" "}
                                <span className="font-semibold text-black">
                                  {formatBookmaker(gameState.data?.bookmakerKey)}
                                </span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 text-sm text-gray-600">
                          <p>No active game available.</p>
                          {isAdmin && devSeedEnabled && status === "authenticated" && accessToken && (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={onSeedDevGame}
                                disabled={seeding}
                                className="rounded-full bg-[#ff007a] text-white px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90 transition disabled:opacity-60"
                              >
                                {seeding ? "Seeding…" : "Seed dev game"}
                              </button>
                              <button
                                onClick={onSeedFakeGame}
                                disabled={seedingFake}
                                className="rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90 transition disabled:opacity-60"
                              >
                                {seedingFake ? "Seeding…" : "Seed demo game (fake data)"}
                              </button>
                            </div>
                          )}
                          {seedStatus && (
                            <p
                              className={`text-xs ${
                                seedStatus.tone === "error"
                                  ? "text-red-500"
                                  : seedStatus.tone === "info"
                                    ? "text-gray-500"
                                    : "text-green-600"
                              }`}
                            >
                              {seedStatus.message}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}

            {gameState.data && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-lg font-semibold text-black mb-3">Place Your Bet</h3>
                {status === "unauthenticated" ? (
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>You must be logged in to place a bet.</p>
                    <Link
                      href="/login?callbackUrl=/"
                      className="inline-flex justify-center rounded-full bg-[#ff007a] hover:opacity-90 px-4 py-2 text-sm font-medium text-white transition shadow-sm"
                    >
                      Go to Login
                    </Link>
                  </div>
                ) : gameState.data.status !== "upcoming" ? (
                  <p className="text-sm text-gray-600">
                    Betting is closed for this game. Check back for the next matchup.
                  </p>
                ) : (
                  <>
                    <form className="space-y-4" onSubmit={onSubmit}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="side"
                            value="home"
                            checked={side === "home"}
                            onChange={() => setSide("home")}
                          />
                          Cavs side
                        </label>

                        <label className="flex items-center gap-2 text-sm text-gray-700">
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

                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-700 w-20">Stake</label>
                        <input
                          type="number"
                          min={1}
                          value={stake}
                          onChange={(e) => setStake(Number(e.target.value) || 0)}
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-black shadow-inner focus:outline-none focus:ring-2 focus:ring-[#ff007a]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={placing || !gameState.data}
                        className="w-full rounded-full bg-[#ff007a] hover:opacity-90 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition shadow-sm"
                      >
                        {placing ? "Placing bet…" : "Place bet"}
                      </button>
                    </form>

                    {betMessage && (
                      <p className="text-xs mt-3 text-gray-700">{betMessage}</p>
                    )}
                    {betError && (
                      <p className="text-xs mt-2 text-red-500">{betError}</p>
                    )}
                    {!accessToken && (
                      <p className="mt-2 text-xs text-gray-600">
                        You must be logged in to place a bet.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {status === "authenticated" && session?.user?.email === "admin@example.com" && (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                {gameState.data && gameState.data.status === "upcoming" && (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex-1 text-sm text-gray-700">
                        <span className="block mb-1 font-medium text-gray-800">
                          Final Cavs score
                        </span>
                        <input
                          type="number"
                          value={finalHomeScore}
                          onChange={(e) => setFinalHomeScore(e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#ff007a]"
                          placeholder="e.g. 110"
                        />
                      </label>
                      <label className="flex-1 text-sm text-gray-700">
                        <span className="block mb-1 font-medium text-gray-800">
                          Final Opponent score
                        </span>
                        <input
                          type="number"
                          value={finalAwayScore}
                          onChange={(e) => setFinalAwayScore(e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#ff007a]"
                          placeholder="e.g. 102"
                        />
                      </label>
                    </div>
                    <button
                      onClick={onSettleGame}
                      disabled={
                        settling ||
                        !gameState.data ||
                        finalHomeScore.trim() === "" ||
                        finalAwayScore.trim() === "" ||
                        !Number.isFinite(Number(finalHomeScore)) ||
                        !Number.isFinite(Number(finalAwayScore))
                      }
                      className="w-full sm:w-auto rounded-full border border-gray-300 text-gray-800 px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 transition disabled:opacity-60"
                    >
                      {settling ? "Settling…" : "Settle Game"}
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onResetDemo}
                    disabled={resetStatus === "pending"}
                    className="flex-1 rounded-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-2 text-sm font-medium shadow-sm transition disabled:opacity-60"
                  >
                    {resetStatus === "pending" ? "Resetting…" : "Reset demo data"}
                  </button>
                  <button
                    onClick={onSeedFakeGame}
                    disabled={seedingFake}
                    className="flex-1 rounded-full bg-[#ff007a] hover:bg-[#e6006e] text-white px-6 py-2 text-sm font-medium shadow-sm transition disabled:opacity-60"
                  >
                    {seedingFake ? "Seeding fake game…" : "Seed fake Cavs game"}
                  </button>
                </div>

                {settleError && (
                  <p className="text-xs text-red-500">{settleError}</p>
                )}
                {resetStatus === "pending" && (
                  <p className="text-xs text-gray-600">Resetting demo data...</p>
                )}
                {resetStatus === "success" && (
                  <p className="text-xs text-gray-700">
                    Demo data cleared. You can seed a fresh dev game.
                  </p>
                )}
                {resetStatus === "error" && (
                  <p className="text-xs text-red-500">
                    Failed to reset demo data. Please try again.
                  </p>
                )}
              </div>
            )}
          </section>

          <div className="space-y-8">
            <section className="bg-white rounded-3xl shadow-md p-8 space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-black">Your Bets</h3>
                {status === "authenticated" && (
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Live
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Updated when you placed or settled your last bet.
              </p>

              {status !== "authenticated" ? (
                <p className="text-sm text-gray-600">Log in to view your bets.</p>
              ) : (
                <>
                  {betsState.loading && <p className="text-sm text-gray-600">Loading bets…</p>}

                  {betsState.error && (
                    <p className="text-sm text-red-500">Error: {betsState.error}</p>
                  )}

                  {!betsState.loading && !betsState.error && (
                    <div className="space-y-3">
                      {betsState.data.length > 0 ? (
                        <ul className="space-y-3 divide-y divide-gray-100">
                          {betsState.data.map((bet) => (
                            <li
                              key={bet._id}
                              className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm space-y-2"
                            >
                              <p className="font-semibold text-black">
                                {bet.gameId.homeTeam} vs {bet.gameId.awayTeam}
                              </p>
                              <div className="text-sm text-gray-700 space-y-1.5">
                                <p>
                                  <span className="font-medium text-gray-800">Line:</span>{" "}
                                  {bet.line}
                                </p>
                                <p>
                                  <span className="font-medium text-gray-800">Status:</span>{" "}
                                  <span
                                    className={
                                      bet.status === "won"
                                        ? "text-emerald-600 font-semibold"
                                        : bet.status === "lost"
                                        ? "text-rose-600 font-semibold"
                                        : bet.status === "push"
                                        ? "text-slate-600 font-semibold"
                                        : "text-gray-800"
                                    }
                                  >
                                    {bet.status === "push"
                                      ? "Push (no points awarded)"
                                      : bet.status}
                                  </span>
                                </p>
                                <p>
                                  <span className="font-medium text-gray-800">Stake:</span>{" "}
                                  {bet.amount}
                                </p>
                                <p>
                                  <span className="font-medium text-gray-800">Placed:</span>{" "}
                                  {new Date(bet.createdAt).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium text-gray-700">Sportsbook:</span>{" "}
                                  {formatBookmaker(bet.gameId.bookmakerKey)}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-600">You have no bets yet.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            {status === "authenticated" && (
              <section className="bg-white rounded-3xl shadow-md p-8 space-y-2">
                <h3 className="text-lg font-semibold text-black">Your Points</h3>
                <p className="text-3xl font-semibold text-black">
                  {userPoints ?? 0}
                  <span className="text-sm text-gray-500 font-medium ml-2">points</span>
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
