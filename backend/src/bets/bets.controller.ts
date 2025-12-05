import { Body, Controller, Get, Post } from '@nestjs/common';
import { BetsService } from './bets.service';
import { CreateBetDto } from './dto/create-bet.dto';

@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Post()
  async createBet(@Body() body: CreateBetDto) {
    console.log('CREATE BET BODY:', body);
    return this.betsService.createBet(body);
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
