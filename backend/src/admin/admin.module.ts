import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { Game, GameSchema } from '../games/schemas/game.schema';
import { Bet, BetSchema } from '../bets/schemas/bet.schema';
import { Points, PointsSchema } from '../points/schemas/points.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Game.name, schema: GameSchema },
      { name: Bet.name, schema: BetSchema },
      { name: Points.name, schema: PointsSchema },
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
