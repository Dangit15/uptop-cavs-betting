import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { BetsService } from './bets.service';
import { CreateBetDto } from './dto/create-bet.dto';
import { SettleGameDto } from './dto/settle-game.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateBetDto) {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.betsService.create(userId, dto);
  }

  // Protected: requires Authorization: Bearer <token> when testing via Postman
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMyBets(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.betsService.getBetsForUser(userId);
  }

  // Alias: GET /bets returns same as /bets/me
  @UseGuards(JwtAuthGuard)
  @Get()
  async findMyBetsAlias(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.betsService.getBetsForUser(userId);
  }

  @UseGuards(AdminGuard)
  @Post('settle')
  async settleGame(@Body() body: SettleGameDto) {
    return this.betsService.settleGame(body);
  }
}

// Controller: POST /bets and GET /bets/me require JWT auth, POST /bets/settle is admin-only.
