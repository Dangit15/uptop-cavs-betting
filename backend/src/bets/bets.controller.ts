import { Body, Controller, Get, Post, Headers } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BetsService } from './bets.service';
import { CreateBetDto } from './dto/create-bet.dto';

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

  @Post()
  async createBet(
    @Body() body: CreateBetDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.getUserIdFromAuthHeader(authHeader);
    const payload = { ...body, userId };
    return this.betsService.createBet(payload);
  }

  @Get()
  async getBets(@Headers('authorization') authHeader?: string) {
    const userId = this.getUserIdFromAuthHeader(authHeader);
    return this.betsService.getBetsForUser(userId);
  }

  @Post('settle')
  async settleGame(@Body() body: any) {
    return this.betsService.settleGame(body);
  }
}

// Controller: POST /bets and GET /bets derive userId from JWT (falling back to demo-user-1), POST /bets/settle delegates to service.
