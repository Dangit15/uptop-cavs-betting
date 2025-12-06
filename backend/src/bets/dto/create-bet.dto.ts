export class CreateBetDto {
  gameId: string;
  userId: string;
  side: 'home' | 'away';
  stake: number;
}

// DTO: payload for placing a bet includes gameId, userId, side, and stake amount.
