import {
  Controller,
  InternalServerErrorException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { Game, GameDocument } from '../games/schemas/game.schema';
import { Bet, BetDocument } from '../bets/schemas/bet.schema';
import { Points, PointsDocument } from '../points/schemas/points.schema';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
    @InjectModel(Bet.name) private readonly betModel: Model<BetDocument>,
    @InjectModel(Points.name) private readonly pointsModel: Model<PointsDocument>,
  ) {}

  @Post('reset')
  async resetDemoData() {
    try {
      await this.gameModel.deleteMany({});
      await this.betModel.deleteMany({});
      await this.pointsModel.deleteMany({});
      return { success: true };
    } catch (error) {
      console.error('Failed to reset demo data', error);
      throw new InternalServerErrorException('Failed to reset demo data');
    }
  }
}
