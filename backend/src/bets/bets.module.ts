import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BetsService } from './bets.service';
import { BetsController } from './bets.controller';
import { Bet, BetSchema } from './schemas/bet.schema';
import { Game, GameSchema } from '../games/schemas/game.schema';

@Module({
  imports: [
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
