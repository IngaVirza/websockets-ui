import db from '../db/inMemoryDB';
import { generateId, sendMessage } from '../utils/utils';

export function handleCreateRoom(ws: WebSocket, playerName: string) {
  const roomId = generateId();
  const room = {
    roomId,
    roomUsers: [{ name: playerName, index: '' }], // index will be assigned after game creation
  };
  db.rooms.set(roomId, room);

  sendUpdateRoom();
}

export function sendUpdateRoom() {
  // send all rooms with only one player inside
  const roomsList = Array.from(db.rooms.values())
    .filter((r) => r.roomUsers.length === 1)
    .map((r) => ({
      roomId: r.roomId,
      roomUsers: r.roomUsers.map((u) => ({ name: u.name, index: u.index })),
    }));

  const message = {
    type: 'update_room',
    data: roomsList,
    id: 0,
  };

  // broadcast to all connected players
  for (const player of db.players.values()) {
    if (player.ws && player.ws.readyState === player.ws.OPEN) {
      sendMessage(player.ws, message);
    }
  }
}

export function handleAddUserToRoom(
  ws: WebSocket,
  data: { indexRoom: string },
  playerName: string
) {
  const { indexRoom } = data;
  const room = db.rooms.get(indexRoom);

  if (!room) {
    sendMessage(ws, {
      type: 'create_game',
      data: {
        error: true,
        errorText: 'Room not found',
      },
      id: 0,
    });
    return;
  }

  if (room.roomUsers.length !== 1) {
    sendMessage(ws, {
      type: 'create_game',
      data: {
        error: true,
        errorText: 'Room full or invalid',
      },
      id: 0,
    });
    return;
  }

  // add player to room
  room.roomUsers.push({ name: playerName, index: '' });

  // create game
  const idGame = generateId();

  // assign player ids in game session
  const player1 = room.roomUsers[0];
  const player2 = room.roomUsers[1];
  player1.index = generateId();
  player2.index = generateId();

  // create Game session
  db.games.set(idGame, {
    idGame,
    players: {
      [player1.index]: {
        ships: [],
        attacksReceived: [],
        indexPlayer: player1.index,
      },
      [player2.index]: {
        ships: [],
        attacksReceived: [],
        indexPlayer: player2.index,
      },
    },
    currentPlayerIndex: player1.index,
    finished: false,
  });

  room.gameId = idGame;

  // Remove room from available rooms because it is now full
  db.rooms.delete(indexRoom);

  // Notify both players about game creation
  for (const p of [player1, player2]) {
    const playerObj = db.players.get(p.name);
    if (playerObj?.ws && playerObj.ws.readyState === playerObj.ws.OPEN) {
      sendMessage(playerObj.ws, {
        type: 'create_game',
        data: {
          idGame,
          idPlayer: p.index,
        },
        id: 0,
      });
    }
  }

  sendUpdateRoom();
}
