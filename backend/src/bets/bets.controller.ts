import { Body, Controller, Get, Post, Headers, UseGuards, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BetsService } from './bets.service';
import { CreateBetDto } from './dto/create-bet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

  @Post()
  async create(@Req() req: any, @Body() dto: CreateBetDto) {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.betsService.create(userId, dto);
  }

  @Get('me')
  async findMyBets(@Req() req: any) {
    console.log('DEBUG /bets/me req.user =', req.user);
    return { user: req.user };
  }

  @Post('settle')
  async settleGame(@Body() body: any) {
    return this.betsService.settleGame(body);
  }
}

// Controller: POST /bets and GET /bets derive userId from JWT (falling back to demo-user-1), POST /bets/settle delegates to service.
