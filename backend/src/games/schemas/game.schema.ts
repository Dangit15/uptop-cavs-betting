import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

@Schema({ timestamps: true })
export class Game {
  @Prop({ unique: true })
  gameId: string; // Odds API event id

  @Prop()
  homeTeam: string;

  @Prop()
  awayTeam: string;

  @Prop()
  startTime: Date;

  @Prop()
  spread: number; // Cavs spread, ex) -10.5

  @Prop()
  homeScore?: number;

  @Prop()
  awayScore?: number;

  @Prop()
  bookmakerKey: string; // like 'fanduel'

  @Prop({
    enum: ['upcoming', 'live', 'completed'],
    default: 'upcoming',
  })
  status: string;

  @Prop()
  finalHomeScore?: number;

  @Prop()
  finalAwayScore?: number;
}

export const GameSchema = SchemaFactory.createForClass(Game);
