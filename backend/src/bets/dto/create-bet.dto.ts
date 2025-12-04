export class CreateBetDto {
  gameId: string;
  side: 'home' | 'away';
  amount: number;
}
