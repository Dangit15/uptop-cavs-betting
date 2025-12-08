import { Body, Controller, Get, Post, Headers, UseGuards, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BetsService } from './bets.service';
import { CreateBetDto } from './dto/create-bet.dto';
import { SettleGameDto } from './dto/settle-game.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@UseGuards(JwtAuthGuard)
@Controller('bets')
export class BetsController {
  constructor(
    private readonly betsService: BetsService,
    private readonly jwtService: JwtService,
  ) {}

  private getUserIdFromAuthHeader(authHeader?: string): string {
    let userId = 'demo-user-1';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'dev-secret',
        });
        if (payload && typeof payload.sub === 'string') {
          userId = payload.sub;
        }
      } catch (e) {
        // fallback to demo-user-1 on invalid token
      }
    }
    return userId;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateBetDto) {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.betsService.create(userId, dto);
  }

  @Get('me')
  async findMyBets(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.betsService.getBetsForUser(userId);
  }

  @UseGuards(AdminGuard)
  @Post('settle')
  async settleGame(@Body() body: SettleGameDto) {
    return this.betsService.settleGame(body);
  }
}

// Controller: POST /bets and GET /bets derive userId from JWT (falling back to demo-user-1), POST /bets/settle delegates to service.
