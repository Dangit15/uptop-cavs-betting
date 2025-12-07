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
    enum: ['upcoming', 'live', 'completed', 'final'],
    default: 'upcoming',
  })
  status: string;

  @Prop()
  finalHomeScore?: number;

  @Prop()
  finalAwayScore?: number;

  @Prop()
  debugHomeScore?: number;

  @Prop()
  debugAwayScore?: number;
}

export const GameSchema = SchemaFactory.createForClass(Game);

// Fields: gameId is the odds provider's event id; homeTeam/awayTeam are the team names;
// startTime is when the game begins; spread is the Cavaliers point spread; bookmakerKey
// is the sportsbook source key; status tracks lifecycle (upcoming/live/completed);
// homeScore/awayScore hold in-game tallies; finalHomeScore/finalAwayScore capture the
// finished totals.
