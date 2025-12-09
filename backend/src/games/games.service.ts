// fetchNextCavsGameFromOddsApi:
// - Calls Odds API /odds with FanDuel spreads, filters exact match on focusTeamName (env FOCUS_TEAM_NAME, default Cavs), future-only, picks soonest, and maps spread/bookmaker details.
// - Returns null (no throw) when no matching game or no usable spreads market; also returns null if Odds API request fails (logged).
// Notes:
// - Next Cavs game is chosen by fetching NBA odds, filtering events that include "cavaliers" and are in the future, then picking the soonest commence_time and mapping it into the Game schema.
// - This service calls The Odds API (/odds) for real data (no cache) and seedNextGameForDev now reuses that live data instead of a fake record.
// - Seed-related helper: seedNextGameForDev upserts a real upcoming game into Mongo when allowed.
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Game, GameDocument } from './schemas/game.schema';
import { staticCavsSchedule } from './static-schedule';

interface NextCavsGameFromApi {
  externalGameId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  spread: number;
  bookmakerKey: string;
}

@Injectable()
export class GamesService {
  private readonly oddsBaseUrl =
    'https://api.the-odds-api.com/v4/sports/basketball_nba';
  private readonly cavsTeamName = 'cavaliers';
  private readonly focusTeamName: string =
    process.env.FOCUS_TEAM_NAME || 'Cleveland Cavaliers';
  private readonly espnScheduleUrl =
    'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/cle/schedule';
  private readonly logger = new Logger(GamesService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
  ) {}

  private get apiKey(): string {
    const key = process.env.ODDS_API_KEY;
    if (!key) {
      throw new InternalServerErrorException(
        'Missing ODDS_API_KEY in configuration',
      );
    }
    return key;
  }

  // Core call to the Odds API NBA /odds endpoint
  private async fetchAllNbaOddsFromApi(): Promise<any[]> {
    const url = `${this.oddsBaseUrl}/odds`;

    try {
      const response$ = this.httpService.get(url, {
        params: {
          apiKey: this.apiKey,
          regions: 'us', // US books
          markets: 'spreads', // we care about spreads only
          oddsFormat: 'american',
          dateFormat: 'iso',
        },
      });

      const { data } = await firstValueFrom(response$);

      if (!Array.isArray(data)) {
        throw new InternalServerErrorException(
          'Unexpected Odds API response structure',
        );
      }

      return data;
    } catch (error: any) {
      console.error(
        'Error calling Odds API /odds:',
        error?.response?.data || error.message || error,
      );

      throw new InternalServerErrorException(
        'Failed to fetch odds from provider',
      );
    }
  }

  // Check if a given event involves the Cavs
  private isCavsGame(event: any): boolean {
    const home = (event.home_team || '').toLowerCase();
    const away = (event.away_team || '').toLowerCase();
    return (
      home.includes(this.cavsTeamName) || away.includes(this.cavsTeamName)
    );
  }

  // Treat only strictly future games as "upcoming" to skip in-progress and past
  private isUpcoming(event: any): boolean {
    const commence = new Date(event.commence_time);
    const now = new Date();
    return commence.getTime() > now.getTime();
  }

  // Among all odds events, pick the next upcoming Cavs game
  private pickNextUpcomingCavsGame(events: any[]): any | null {
    const candidates = events.filter(
      (e) => this.isCavsGame(e) && this.isUpcoming(e),
    );

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort(
      (a, b) =>
        new Date(a.commence_time).getTime() -
        new Date(b.commence_time).getTime(),
    );

    return candidates[0];
  }

  // Convert Odds API JSON into our Game schema shape
  private mapOddsApiToGame(oddsGame: any): Partial<Game> {
    const bookmakers = oddsGame.bookmakers ?? [];
    if (bookmakers.length === 0) {
      throw new InternalServerErrorException('No bookmakers in odds data');
    }

    // Prefer FanDuel if available, otherwise first sportsbook
    const fanduel =
      bookmakers.find((b: any) => b.key === 'fanduel') ?? bookmakers[0];

    const spreadsMarket = (fanduel.markets ?? []).find(
      (m: any) => m.key === 'spreads',
    );
    if (!spreadsMarket) {
      throw new InternalServerErrorException('No spreads market in odds data');
    }

    const outcomes = spreadsMarket.outcomes ?? [];
    const cavsOutcome = outcomes.find(
      (o: any) => (o.name || '').toLowerCase().includes('cavaliers'),
    );
    if (!cavsOutcome) {
      throw new InternalServerErrorException(
        'No Cavaliers outcome found in spreads',
      );
    }

    return {
      gameId: oddsGame.id,
      homeTeam: oddsGame.home_team,
      awayTeam: oddsGame.away_team,
      startTime: new Date(oddsGame.commence_time),
      spread: cavsOutcome.point,
      bookmakerKey: fanduel.key,
      status: 'upcoming',
      // homeScore, awayScore, finalHomeScore, finalAwayScore are left undefined for now
    };
  }

  // PUBLIC: called by POST /games/next
  // 1. Fetch odds from provider
  // 2. Identify next upcoming Cavs game (skipping past/live)
  // 3. Upsert it into Mongo based on gameId
  async fetchAndUpsertNextCavsGame(): Promise<GameDocument> {
    const events = await this.fetchAllNbaOddsFromApi();
    const nextCavsGame = this.pickNextUpcomingCavsGame(events);

    if (!nextCavsGame) {
      throw new InternalServerErrorException(
        'No upcoming Cavaliers game found',
      );
    }

    const mapped = this.mapOddsApiToGame(nextCavsGame);

    return this.gameModel
      .findOneAndUpdate({ gameId: mapped.gameId }, mapped, {
        upsert: true,
        new: true,
      })
      .exec();
  }

  private async fetchNextCavsGameFromOddsApi(): Promise<NextCavsGameFromApi | null> {
    const url = `${this.oddsBaseUrl}/odds`;

    let data: any[];
    try {
      const response$ = this.httpService.get(url, {
        params: {
          regions: 'us',
          markets: 'spreads',
          oddsFormat: 'american',
          bookmakers: 'fanduel',
          apiKey: this.apiKey,
        },
      });

      const response = await firstValueFrom(response$);
      data = response.data;

      if (!Array.isArray(data)) {
        console.error(
          'Error fetching next Cavs game from Odds API: unexpected response shape',
          { receivedType: typeof data },
        );
        return null;
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.message ?? 'Unknown error';
      console.error('Error fetching next Cavs game from Odds API:', {
        status,
        message,
        data: error?.response?.data,
      });
      return null;
    }

    const now = Date.now();
    const cavsEvents = data
      .filter(
        (event: any) =>
          event.home_team === this.focusTeamName ||
          event.away_team === this.focusTeamName,
      )
      .filter((event: any) => {
        const commence = new Date(event.commence_time).getTime();
        return !Number.isNaN(commence) && commence >= now;
      });

    if (cavsEvents.length === 0) {
      return null;
    }

    cavsEvents.sort(
      (a: any, b: any) =>
        new Date(a.commence_time).getTime() -
        new Date(b.commence_time).getTime(),
    );

    const nextEvent = cavsEvents[0];
    const fanduel = (nextEvent.bookmakers ?? []).find(
      (b: any) => b.key === 'fanduel',
    );
    if (!fanduel) {
      return null;
    }

    const spreadsMarket = (fanduel.markets ?? []).find(
      (m: any) => m.key === 'spreads',
    );
    if (!spreadsMarket) {
      return null;
    }

    const outcomes = spreadsMarket.outcomes ?? [];
    const cavsOutcome = outcomes.find(
      (o: any) => o.name === this.focusTeamName,
    );
    if (!cavsOutcome || typeof cavsOutcome.point !== 'number') {
      return null;
    }

    return {
      externalGameId: nextEvent.id,
      homeTeam: nextEvent.home_team,
      awayTeam: nextEvent.away_team,
      startTime: new Date(nextEvent.commence_time),
      spread: cavsOutcome.point,
      bookmakerKey: 'fanduel',
    };
  }

  // PUBLIC: called by GET /games/next
  // Returns the next upcoming game stored in Mongo (or null)
  async getNextGame(): Promise<Partial<Game> | null> {
    const now = new Date();
    return this.gameModel
      .findOne({ status: 'upcoming', startTime: { $gt: now } })
      .sort({ startTime: 1 })
      .lean()
      .exec();
  }

  // PUBLIC: schedule-only view that now uses ESPN feed (with static fallback)
  async getNextScheduleOnly(): Promise<{
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    status: string;
  } | null> {
    try {
      const espnGame = await this.getNextScheduledGameFromESPN();
      if (espnGame) {
        return espnGame; // ESPN returned a real Cavs matchup
      }
      this.logger.log(
        'ESPN schedule responded but had no Cavs game; returning null',
      );
      return null;
    } catch (error: any) {
      this.logger.error('Error fetching Cavs schedule from ESPN', {
        url: this.espnScheduleUrl,
        error: error?.message ?? error,
      });
      const fallback = this.pickFallbackSchedule();
      if (fallback) {
        this.logger.log(
          'Using static Cavs schedule fallback (ESPN error)',
          fallback,
        );
        return fallback;
      }
      return null;
    }
  }

  private pickFallbackSchedule(): {
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    status: 'upcoming';
  } | null {
    const nowTs = Date.now();
    const fallback = staticCavsSchedule
      .map((g) => ({
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        startTime: g.startTimeISO,
        status: 'upcoming' as const,
        startTs: new Date(g.startTimeISO).getTime(),
      }))
      .filter((g) => !Number.isNaN(g.startTs) && g.startTs > nowTs)
      .sort((a, b) => a.startTs - b.startTs);

    if (fallback.length === 0) {
      return null;
    }

    const nextFallback = fallback[0];
    console.log('Using static Cavs schedule fallback (ESPN)', nextFallback);
    return {
      homeTeam: nextFallback.homeTeam,
      awayTeam: nextFallback.awayTeam,
      startTime: nextFallback.startTime,
      status: 'upcoming',
    };
  }

  // NEW: ESPN-powered schedule lookup with static fallback
  async getNextScheduledGameFromESPN(): Promise<{
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    status: 'upcoming';
  } | null> {
    const response$ = this.httpService.get(this.espnScheduleUrl);
    const response = await firstValueFrom(response$);
    const data = response.data;
    const events = Array.isArray(data?.events) ? data.events : [];
    const now = new Date();

    const normalized = events
      .map((event: any) => {
        const eventDate = event?.date ? new Date(event.date) : null;
        if (!eventDate || Number.isNaN(eventDate.getTime())) {
          return null;
        }
        if (eventDate.getTime() < now.getTime()) {
          return null;
        }

        const competition = event?.competitions?.[0];
        const competitors = competition?.competitors ?? [];
        const homeComp =
          competitors.find((c: any) => c?.homeAway === 'home') ??
          competitors[0];
        const awayComp =
          competitors.find((c: any) => c?.homeAway === 'away') ??
          competitors[1];

        if (!homeComp || !awayComp) {
          return null;
        }

        const homeTeam =
          homeComp.team?.displayName ??
          homeComp.team?.name ??
          'Unknown Home';
        const awayTeam =
          awayComp.team?.displayName ??
          awayComp.team?.name ??
          'Unknown Away';

        const startTime = eventDate.toISOString();

        return {
          homeTeam,
          awayTeam,
          startTime,
          status: 'upcoming' as const,
        };
      })
      .filter(Boolean) as Array<{
        homeTeam: string;
        awayTeam: string;
        startTime: string;
        status: 'upcoming';
      }>;

    if (normalized.length === 0) {
      this.logger.log(
        `ESPN schedule: no future Cavs games found (events=${events.length})`,
      );
      return null;
    }

    normalized.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    const next = normalized[0];

    this.logger.log(
      `ESPN schedule: next Cavs game = ${next.homeTeam} vs ${next.awayTeam} at ${next.startTime}`,
    );

    return next;
  }

  // PUBLIC: dev helper to seed an upcoming game using live Odds API data
  async seedNextGameForDev(): Promise<GameDocument | null> {
    const nextGame = await this.fetchNextCavsGameFromOddsApi();

    if (!nextGame) {
      console.warn(
        'Dev seed: No upcoming Cavs game found from Odds API, skipping seed.',
      );
      return null;
    }

    const mapped: Partial<Game> = {
      gameId: nextGame.externalGameId,
      homeTeam: nextGame.homeTeam,
      awayTeam: nextGame.awayTeam,
      startTime: nextGame.startTime,
      spread: nextGame.spread,
      bookmakerKey: nextGame.bookmakerKey,
      status: 'upcoming',
    };

    return this.gameModel
      .findOneAndUpdate({ gameId: mapped.gameId }, mapped, {
        upsert: true,
        new: true,
      })
      .exec();
  }

  // PUBLIC: dev-only fake seed for demo purposes (no Odds API)
  async seedFakeDemoGameForDev(): Promise<GameDocument | null> {
    try {
      if (process.env.DEV_SEED_ENABLED !== 'true') {
        console.warn('Dev seed: DEV_SEED_ENABLED is not true, skipping fake seed.');
        return null;
      }

      const opponents = [
        'Chicago Bulls',
        'Washington Wizards',
        'Charlotte Hornets',
        'New York Knicks',
        'Miami Heat',
        'Boston Celtics',
      ];
      const opponent =
        opponents[Math.floor(Math.random() * opponents.length)] ?? 'Chicago Bulls';

      const daysAhead = Math.floor(Math.random() * 3) + 1; // 1 to 3 days
      const tipoffOptions = [
        { hours: 19, minutes: 0 },
        { hours: 19, minutes: 30 },
        { hours: 20, minutes: 0 },
      ];
      const tipoff = tipoffOptions[Math.floor(Math.random() * tipoffOptions.length)] ?? {
        hours: 19,
        minutes: 0,
      };

      const start = new Date();
      start.setDate(start.getDate() + daysAhead);
      start.setHours(tipoff.hours, tipoff.minutes, 0, 0); // zero seconds/millis for cleaner display

      const mapped: Partial<Game> = {
        gameId: 'demo-fake-game',
        homeTeam: 'Cleveland Cavaliers',
        awayTeam: opponent,
        startTime: start,
        spread: -5,
        bookmakerKey: 'demo',
        status: 'upcoming',
      };

      return this.gameModel
        .findOneAndUpdate({ gameId: mapped.gameId }, mapped, {
          upsert: true,
          new: true,
        })
        .exec();
    } catch (error) {
      console.error('Dev seed: Failed to seed fake demo game', error);
      return null;
    }
  }
}
