// src/types/interface.ts

export interface Player {
  name: string;
  password: string;
  id: string; // unique id for the player (maybe uuid)
  ws?: WebSocket; // socket connection (optional for player)
}

export interface RoomUser {
  name: string;
  index: string; // player id in room/game session
}

export interface Room {
  roomId: string;
  roomUsers: RoomUser[];
  gameId?: string;
}

export type ShipType = 'small' | 'medium' | 'large' | 'huge';

export interface Position {
  x: number;
  y: number;
}

export interface Ship {
  position: Position;
  direction: boolean; // true - horizontal, false - vertical
  length: number;
  type: ShipType;
  hits: number; // to track hits on the ship
}

export interface Game {
  idGame: string;
  players: { [playerId: string]: PlayerGameData };
  currentPlayerIndex: string; // playerId who moves now
  finished: boolean;
}

export interface PlayerGameData {
  ships: Ship[];
  attacksReceived: Position[];
  indexPlayer: string;
}

export type AttackStatus = 'miss' | 'shot' | 'killed';
