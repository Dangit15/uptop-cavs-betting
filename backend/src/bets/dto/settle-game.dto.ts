import { IsNumber, IsString } from 'class-validator';

export class SettleGameDto {
  @IsString()
  gameId: string;

  @IsNumber()
  finalHomeScore: number;

  @IsNumber()
  finalAwayScore: number;
}
