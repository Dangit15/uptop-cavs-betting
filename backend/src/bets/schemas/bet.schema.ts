import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Game } from '../../games/schemas/game.schema';

export type BetDocument = Bet & Document;

export type BetSide = 'home' | 'away';
export type BetStatus = 'pending' | 'won' | 'lost' | 'refunded';

@Schema({ timestamps: true })
export class Bet {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: Game.name, required: true })
  gameId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ enum: ['home', 'away'], required: true })
  side: BetSide;

  // spread at time of bet (from game.spread)
  @Prop()
  line: number;

  // American odds, e.g. -110
  @Prop()
  odds: number;

  @Prop({
    enum: ['pending', 'won', 'lost', 'refunded'],
    default: 'pending',
  })
  status: BetStatus;

  @Prop()
  settledAt?: Date;
}

export const BetSchema = SchemaFactory.createForClass(Bet);

// Schema: Bet documents link a userId to a gameId (ObjectId ref), storing amount, side,
// the line/odds snapshot when placed, a pending/won/lost/refunded status, and optional settledAt timestamp.
