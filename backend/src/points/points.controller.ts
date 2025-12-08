import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('me')
  async getMyPoints(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    const totalPoints = await this.pointsService.getPointsForUser(userId);
    console.log('DEBUG /points/me userId=', userId, 'totalPoints=', totalPoints);
    return { totalPoints };
  }
}
