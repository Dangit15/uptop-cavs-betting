import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Game, GameDocument } from './schemas/game.schema';

@Injectable()
export class GamesService {
  private readonly oddsBaseUrl =
    'https://api.the-odds-api.com/v4/sports/basketball_nba';

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
  ) {}

  // Call the Odds API /odds endpoint and pick the NEXT Cavs game
  private async fetchNextCavsGameFromOddsApi(): Promise<any> {
    const url = `${this.oddsBaseUrl}/odds`;
    const params = {
      regions: 'us',
      markets: 'spreads',
      apiKey: process.env.ODDS_API_KEY,
    };

    const { data } = await firstValueFrom(
      this.httpService.get(url, { params }),
    );

    if (!Array.isArray(data)) {
      throw new InternalServerErrorException('Unexpected odds API response');
    }

    const now = new Date().getTime();

    // 1) Filter to only Cavs games
    const cavsGames = data
      .filter(
        (event: any) =>
          event.home_team === 'Cleveland Cavaliers' ||
          event.away_team === 'Cleveland Cavaliers',
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.commence_time).getTime() -
          new Date(b.commence_time).getTime(),
      );

    if (cavsGames.length === 0) {
      throw new InternalServerErrorException(
        'No Cavaliers games returned by Odds API',
      );
    }

    // 2) From those, pick the earliest FUTURE one (strictly upcoming)
    const upcoming = cavsGames.filter(
      (event: any) => new Date(event.commence_time).getTime() > now,
    );

    if (upcoming.length === 0) {
      // This is the “they’re playing now but no future game scheduled yet” case
      throw new InternalServerErrorException('No upcoming Cavaliers game found');
    }

    return upcoming[0];
  }

  // Convert Odds API JSON into our Game shape
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

    const cavsOutcome = (spreadsMarket.outcomes ?? []).find(
      (o: any) => o.name === 'Cleveland Cavaliers',
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
    };
  }

  // PUBLIC: called by POST /games/next
  async fetchAndUpsertNextCavsGame(): Promise<GameDocument> {
    const oddsGame = await this.fetchNextCavsGameFromOddsApi();
    const mapped = this.mapOddsApiToGame(oddsGame);

    return this.gameModel
      .findOneAndUpdate({ gameId: mapped.gameId }, mapped, {
        upsert: true,
        new: true,
      })
      .exec();
  }

  // PUBLIC: called by GET /games/next
  async getNextGame(): Promise<Partial<Game> | null> {
    const now = new Date();
    return this.gameModel
      .findOne({ status: 'upcoming', startTime: { $gt: now } })
      .sort({ startTime: 1 })
      .lean()
      .exec();
  }

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
