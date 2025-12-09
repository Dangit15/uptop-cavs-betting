// Notes:
// - Next Cavs game is surfaced via GET /games/next which returns the soonest upcoming Mongo record (populated by the Odds API flow in POST /games/next).
// - POST /games/next triggers a live Odds API fetch/upsert; no seeded data unless dev seeding is explicitly called.
// - Seed endpoint: POST /games/dev/seed (guarded + toggleable via isDevSeedEnabled) calls GamesService.seedNextGameForDev to upsert the next Cavs game using live Odds API data.
import { Controller, Get, NotFoundException, Post, UseGuards, ForbiddenException, BadRequestException, HttpCode, HttpStatus, Body, Param } from '@nestjs/common';
import { GamesService } from './games.service';
import { AdminGuard } from '../auth/admin.guard';
import { isDevSeedEnabled } from '../config/dev-seed.config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BetsService } from '../bets/bets.service';

@Controller('games')
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly betsService: BetsService,
  ) {}

  // Hit this to pull from Odds API and upsert into Mongo
  @UseGuards(AdminGuard)
  @Post('next')
  async refreshNextGame() {
    return this.gamesService.fetchAndUpsertNextCavsGame(); // expected to fetch current Cavs odds data and upsert the next game document
  }

  @UseGuards(AdminGuard)
  @Post('dev/seed')
  // Returns 404 with JSON when Odds API has no upcoming Cavs game
  async seedDevGame() {
    if (!isDevSeedEnabled()) {
      throw new ForbiddenException('Dev seeding is disabled in this environment.');
    }
    const seeded = await this.gamesService.seedNextGameForDev(); // now pulls real Odds API data for the next Cavs game
    if (!seeded) {
      // If no Cavs game is available from Odds API, respond with 404 so frontend can show "No active game"
      throw new NotFoundException({ message: 'No upcoming Cavs game found from Odds API' });
    }
    return seeded;
  }

  // Dev-only fake data seed endpoint for demo purposes (no Odds API call)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('dev/seed-fake')
  @HttpCode(HttpStatus.CREATED)
  async seedFakeDevGame() {
    const seeded = await this.gamesService.seedFakeDemoGameForDev();
    if (!seeded) {
      throw new BadRequestException({ message: 'Unable to seed fake demo game.' });
    }
    return seeded;
  }

  // Hit this to read the stored next game from Mongo
  @Get('next')
  async getNextGame() {
    const game = await this.gamesService.getNextGame(); // expected to fetch the saved next game (or null) from persistence
    if (!game) {
      throw new NotFoundException({ message: 'No upcoming game found' });
    }
    return game;
  }

  @Get('next-schedule')
  async getNextScheduleOnly() {
    const game = await this.gamesService.getNextScheduleOnly();
    if (!game) {
      throw new NotFoundException({ message: 'No upcoming game found' });
    }
    return game;
  }

  // Alias for spec compatibility: admin settlement via games/:gameId/settle (forwards to bets settlement)
  @UseGuards(AdminGuard)
  @Post(':gameId/settle')
  async settleGameAlias(
    @Param('gameId') gameId: string,
    @Body() body: { finalHomeScore: number; finalAwayScore: number },
  ) {
    return this.betsService.settleGame({
      gameId,
      finalHomeScore: body.finalHomeScore,
      finalAwayScore: body.finalAwayScore,
    });
  }
}

// Endpoints: POST /games/next calls fetchAndUpsertNextCavsGame; POST /games/dev/seed calls
// seedNextGameForDev; GET /games/next calls getNextGame and returns 404 JSON when missing.
