import { Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  // Hit this to pull from Odds API and upsert into Mongo
  @Post('next')
  async refreshNextGame() {
    return this.gamesService.fetchAndUpsertNextCavsGame();
  }

  @Post('dev/seed')
  async seedDevGame() {
    return this.gamesService.seedNextGameForDev();
  }

  // Hit this to read the stored next game from Mongo
  @Get('next')
  async getNextGame() {
    const game = await this.gamesService.getNextGame();
    if (!game) {
      throw new NotFoundException({ message: 'No upcoming game found' });
    }
    return game;
  }
}
