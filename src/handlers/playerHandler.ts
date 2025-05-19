import { WebSocket } from 'ws';
import { db } from '../db/inMemoryDB';

export function handleRegistration(ws: WebSocket, message: any) {
  const { name, password } = message.data;

  if (db.players[name]) {
    if (db.players[name].password !== password) {
      ws.send(
        JSON.stringify({
          type: 'reg',
          data: { name, index: null, error: true, errorText: 'Wrong password' },
          id: 0,
        })
      );
      return;
    }
  } else {
    db.players[name] = { name, password, wins: 0, ws };
  }

  ws.send(
    JSON.stringify({
      type: 'reg',
      data: { name, index: name, error: false, errorText: '' },
      id: 0,
    })
  );

  updateRoomState();
  updateWinners();
}

function updateRoomState() {
  const rooms = db.rooms
    .filter((room) => room.players.length === 1)
    .map((room) => ({
      roomId: room.id,
      roomUsers: room.players.map((p: any) => ({
        name: p.name,
        index: p.index,
      })),
    }));
  broadcast({ type: 'update_room', data: rooms, id: 0 });
}

function updateWinners() {
  const list = Object.values(db.players).map((p) => ({
    name: p.name,
    wins: p.wins,
  }));
  broadcast({ type: 'update_winners', data: list, id: 0 });
}

function broadcast(msg: any) {
  const json = JSON.stringify(msg);
  Object.values(db.players).forEach((p) => p.ws.send(json));
}
