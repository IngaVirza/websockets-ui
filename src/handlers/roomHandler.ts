import { WebSocket } from 'ws';
import { db } from '../db/inMemoryDB';
import { v4 as uuidv4 } from 'uuid';

export function handleCreateRoom(ws: WebSocket, message: any) {
  const player = getPlayerBySocket(ws);
  if (!player) return;
  const roomId = uuidv4();
  db.rooms.push({ id: roomId, players: [player] });
  updateRoomState();
}

export function handleAddUserToRoom(ws: WebSocket, message: any) {
  const player = getPlayerBySocket(ws);
  if (!player) return;
  const room = db.rooms.find((r) => r.id === message.data.indexRoom);
  if (!room) return;

  room.players.push(player);
  const gameId = uuidv4();
  db.games[gameId] = { id: gameId, players: room.players, ships: {}, turn: 0 };
  db.rooms = db.rooms.filter((r) => r.id !== room.id);

  room.players.forEach((p, index) => {
    p.ws.send(
      JSON.stringify({
        type: 'create_game',
        data: { idGame: gameId, idPlayer: index },
        id: 0,
      })
    );
  });

  updateRoomState();
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

function getPlayerBySocket(ws: WebSocket) {
  return Object.values(db.players).find((p) => p.ws === ws);
}

function broadcast(msg: any) {
  const json = JSON.stringify(msg);
  Object.values(db.players).forEach((p) => p.ws.send(json));
}
