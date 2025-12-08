import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { BetsService } from './bets.service';
import { BetsController } from './bets.controller';
import { Bet, BetSchema } from './schemas/bet.schema';
import { Game, GameSchema } from '../games/schemas/game.schema';
import { AuthModule } from '../auth/auth.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    AuthModule,
    PointsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
    }),
    MongooseModule.forFeature([
      { name: Bet.name, schema: BetSchema },
      { name: Game.name, schema: GameSchema },
    ]),
  ],
  controllers: [BetsController],
  providers: [BetsService],
  exports: [BetsService],
})
export class BetsModule {}

// Module: wires up Bet and Game Mongoose models and registers the BetsController and BetsService.
