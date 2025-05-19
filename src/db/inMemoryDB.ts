export const db = {
  players: {} as Record<
    string,
    { name: string; password: string; wins: number; ws: any }
  >,
  rooms: [] as any[],
  games: {} as Record<string, any>,
  winners: [] as { name: string; wins: number }[],
};
