import db from '../db/inMemoryDB';
import { Player } from '../types/interfaces';
import { generateId, sendMessage } from '../utils/utils';

interface RegData {
  name: string;
  password: string;
}

export function handleReg(ws: WebSocket, data: RegData) {
  const { name, password } = data;
  let error = false;
  let errorText = '';
  let index = '';

  if (!name || !password) {
    error = true;
    errorText = 'Name and password required';
  } else {
    const existingPlayer = db.players.get(name);
    if (existingPlayer) {
      if (existingPlayer.password !== password) {
        error = true;
        errorText = 'Invalid password';
      } else {
        index = existingPlayer.id;
        existingPlayer.ws = ws;
      }
    } else {
      // create player
      index = generateId();
      const newPlayer: Player = { name, password, id: index, ws };
      db.players.set(name, newPlayer);
    }
  }

  const response = {
    type: 'reg',
    data: {
      name,
      index,
      error,
      errorText,
    },
    id: 0,
  };

  sendMessage(ws, response);
}
