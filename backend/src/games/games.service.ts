import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Game, GameDocument } from './schemas/game.schema';

@Injectable()
export class GamesService {
  private readonly oddsBaseUrl =
    'https://api.the-odds-api.com/v4/sports/basketball_nba';
  private readonly cavsTeamName = 'cavaliers';

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
  ) {}

  private get apiKey(): string {
    const key = process.env.ODDS_API_KEY;
    if (!key) {
      throw new InternalServerErrorException(
        'ODDS_API_KEY is not configured in the environment',
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

  // PUBLIC: dev helper to seed a fake upcoming game
  async seedNextGameForDev(): Promise<GameDocument> {
    const now = new Date();

    // If there is already an upcoming game in the future, just return it
    const existing = await this.gameModel
      .findOne({ status: 'upcoming', startTime: { $gt: now } })
      .sort({ startTime: 1 })
      .exec();

    if (existing) {
      return existing;
    }

    // Otherwise create a fake Cavs game for dev purposes only
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(19, 0, 0, 0); // tomorrow at 7:00 PM local time

    const fakeOddsGame = {
      id: 'dev-game-1',
      home_team: 'Cleveland Cavaliers',
      away_team: 'Los Angeles Lakers',
      commence_time: start.toISOString(),
      bookmakers: [
        {
          key: 'dev-book',
          markets: [
            {
              key: 'spreads',
              outcomes: [
                {
                  name: 'Cleveland Cavaliers',
                  point: -3.5,
                },
                {
                  name: 'Los Angeles Lakers',
                  point: 3.5,
                },
              ],
            },
          ],
        },
      ],
    };

    const mapped = this.mapOddsApiToGame(fakeOddsGame);

    return this.gameModel
      .findOneAndUpdate({ gameId: mapped.gameId }, mapped, {
        upsert: true,
        new: true,
      })
      .exec();
  }
}
