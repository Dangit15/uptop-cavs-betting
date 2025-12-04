import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bet, BetDocument } from './schemas/bet.schema';
import { Game, GameDocument } from '../games/schemas/game.schema';
import { CreateBetDto } from './dto/create-bet.dto';

@Injectable()
export class BetsService {
  constructor(
    @InjectModel(Bet.name) private readonly betModel: Model<BetDocument>,
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
  ) {}

  async createBet(userId: string, dto: any): Promise<Bet> {
    const game = await this.gameModel.findById(dto.gameId);

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== 'upcoming') {
      throw new BadRequestException('Cannot place a bet on a non-upcoming game');
    }

    const bet = new this.betModel({
      userId,
      gameId: new Types.ObjectId(dto.gameId),
      amount: dto.amount,
      side: dto.side,
      line: game.spread ?? 0,
      odds: -110, // hard-coded for now
      status: 'pending',
    });

    return bet.save();
  }

  async getBetsForUser(userId: string): Promise<Bet[]> {
    return this.betModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .populate('gameId')
      .exec();
  }

  async settleGame(dto: any): Promise<{ game: GameDocument; settled: number }> {
    const game = await this.gameModel.findById(dto.gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Update game scores
    game.homeScore = dto.homeScore;
    game.awayScore = dto.awayScore;
    game.status = 'completed';
    await game.save();

    // Spread
    const spread = game.spread ?? 0;
    const margin = dto.homeScore - dto.awayScore; // positive = home wins by X

    const bets = await this.betModel.find({
      gameId: game._id,
      status: 'pending',
    });

    let settled = 0;

    for (const bet of bets) {
      let won = false;

      if (bet.side === 'home') {
        won = margin + spread > 0;
      } else {
        won = -margin + spread > 0;
      }

      bet.status = won ? 'won' : 'lost';
      bet.settledAt = new Date();
      await bet.save();
      settled++;
    }

    return { game, settled };
  }
}
