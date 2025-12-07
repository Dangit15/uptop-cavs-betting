import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bet, BetDocument } from './schemas/bet.schema';
import { Game, GameDocument } from '../games/schemas/game.schema';
import { CreateBetDto } from './dto/create-bet.dto';

@Injectable()
export class BetsService {
  constructor(
    @InjectModel(Bet.name) private readonly betModel: Model<BetDocument>,
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
  ) {}

  async create(userId: string, dto: CreateBetDto): Promise<Bet> {
    const sideValid = dto.side === 'home' || dto.side === 'away';
    const stake = Number(dto.stake);
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    if (!dto.gameId) {
      throw new BadRequestException('gameId is required');
    }
    if (!sideValid) {
      throw new BadRequestException('side must be "home" or "away"');
    }
    if (!Number.isFinite(stake) || stake <= 0) {
      throw new BadRequestException('stake must be a positive number');
    }

    const game = await this.gameModel.findOne({ gameId: dto.gameId });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== 'upcoming') {
      throw new BadRequestException('Cannot place a bet on a non-upcoming game');
    }

    return this.betModel.create({
      userId,
      gameId: game._id,
      amount: stake,
      side: dto.side,
      line: game.spread ?? 0,
      odds: -110, // hard-coded for now
      status: 'pending',
    });
  }

  async getBetsForUser(userId: string): Promise<Bet[]> {
    return this.betModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .populate('gameId')
      .exec();
  }

  async settleGame(gameId: string): Promise<{ game: GameDocument; updatedBets: BetDocument[] }> {
    const game = await this.gameModel.findOne({ gameId });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== 'upcoming') {
      throw new BadRequestException('Only upcoming games can be settled');
    }

    const homeScoreRaw = game.debugHomeScore;
    const awayScoreRaw = game.debugAwayScore;

    const finalHomeScore: number = homeScoreRaw ?? 110;
    const finalAwayScore: number = awayScoreRaw ?? 102;

    const spread = game.spread ?? 0;

    const bets = await this.betModel.find({
      gameId: game._id,
      status: 'pending',
    });

    const updatedBets: BetDocument[] = [];

    for (const bet of bets) {
      const won =
        bet.side === 'home'
          ? finalHomeScore + spread > finalAwayScore
          : finalAwayScore - spread > finalHomeScore;

      bet.status = won ? 'won' : 'lost';
      bet.settledAt = new Date();
      await bet.save();
      updatedBets.push(bet);
    }

    game.status = 'final';
    game.finalHomeScore = finalHomeScore;
    game.finalAwayScore = finalAwayScore;
    await game.save();

    return { game, updatedBets };
  }
}

// Service: validates bet payloads, ensures the game exists and is upcoming, creates bets (linking to game ObjectId, storing line/odds/status),
// fetches bets for a user with game populated, and settles all pending bets for a game by updating game scores/status and marking bet outcomes.
