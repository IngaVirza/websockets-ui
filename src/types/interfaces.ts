import { WebSocket } from 'ws';

export interface Player {
  name: string;
  password: string;
  wins: number;
}

export interface Room {
  roomId: string;
  players: PlayerSession[];
}

export interface Ship {
  position: { x: number; y: number };
  direction: boolean;
  length: number;
  type: string;
  hits: number;
}

export interface PlayerSession {
  socket: WebSocket;
  player: Player;
  index: string;
  ships: Ship[];
  gameId?: string;
}

export interface Game {
  id: string;
  players: PlayerSession[];
  currentPlayerIndex: string;
  boards: Map<string, Ship[]>;
}

// WebSocket Message Envelope
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  id: number;
}

// Incoming Messages
export interface RegRequest {
  name: string;
  password: string;
}

export interface AddUserToRoomRequest {
  indexRoom: string;
}

export interface AddShipsRequest {
  gameId: string;
  ships: Ship[];
  indexPlayer: string;
}

// Outgoing Messages
export interface RegResponse {
  name: string;
  index: string;
  error: boolean;
  errorText: string;
}

export interface RoomListItem {
  roomId: string;
  roomUsers: { name: string; index: string }[];
}

export interface WinnerListItem {
  name: string;
  wins: number;
}

export interface CreateGameResponse {
  idGame: string;
  idPlayer: string;
}

export interface StartGameData {
  ships: Ship[] | undefined;
  currentPlayerIndex: string;
}

export interface TurnData {
  currentPlayer: string;
}
