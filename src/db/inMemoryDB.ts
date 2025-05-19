// src/db/inMemoryDB.ts
import { Player, Room, Game, Ship, AttackStatus } from '../types/interfaces';

interface InMemoryDB {
  players: Map<string, Player>; // key: name
  rooms: Map<string, Room>;
  games: Map<string, Game>;
  winners: Map<string, number>;
}

const db: InMemoryDB = {
  players: new Map(),
  rooms: new Map(),
  games: new Map(),
  winners: new Map(),
};

export default db;
