import { Body, Controller, Get, Post } from '@nestjs/common';
import { BetsService } from './bets.service';

@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Post()
  async createBet(@Body() body: any) {
    console.log('CREATE BET BODY:', body);

    const userId = 'demo-user';
    return this.betsService.createBet(userId, body);
  }

  @Get()
  async getBets() {
    const userId = 'demo-user';
    return this.betsService.getBetsForUser(userId);
  }

  @Post('settle')
  async settleGame(@Body() body: any) {
    return this.betsService.settleGame(body);
  }
}
