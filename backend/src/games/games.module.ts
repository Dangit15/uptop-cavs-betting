import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Game, GameSchema } from './schemas/game.schema';
import { AuthModule } from '../auth/auth.module';
import { BetsModule } from '../bets/bets.module';
import { OddsRefreshService } from './odds-refresh.service';

@Module({
  imports: [
    HttpModule,
    AuthModule,
    BetsModule,
    MongooseModule.forFeature([{ name: Game.name, schema: GameSchema }]),
  ],
  controllers: [GamesController],
  providers: [GamesService, OddsRefreshService],
  exports: [GamesService],
})
export class GamesModule {}
