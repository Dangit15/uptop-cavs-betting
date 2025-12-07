import { Controller, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  // Hit this to pull from Odds API and upsert into Mongo
  @UseGuards(AdminGuard)
  @Post('next')
  async refreshNextGame() {
    return this.gamesService.fetchAndUpsertNextCavsGame(); // expected to fetch current Cavs odds data and upsert the next game document
  }

  @UseGuards(AdminGuard)
  @Post('dev/seed')
  async seedDevGame() {
    return this.gamesService.seedNextGameForDev(); // expected to populate a dev-only next game record for testing
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
}

// Endpoints: POST /games/next calls fetchAndUpsertNextCavsGame; POST /games/dev/seed calls
// seedNextGameForDev; GET /games/next calls getNextGame and returns 404 JSON when missing.
