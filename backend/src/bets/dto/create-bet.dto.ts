export class CreateBetDto {
  gameId: string;
  side: 'home' | 'away';
  stake: number;
}

// DTO: payload for placing a bet includes target game, chosen side, and stake amount.
