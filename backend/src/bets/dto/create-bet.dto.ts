export class CreateBetDto {
  gameId: string;
  userId: string;
  side: 'home' | 'away';
  stake: number;
}
