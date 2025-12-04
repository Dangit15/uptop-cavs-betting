import { Controller, Get, Post } from '@nestjs/common';
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
    return this.gamesService.getNextGame();
  }
}
