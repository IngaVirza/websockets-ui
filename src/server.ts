import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  WebSocketMessage,
  RegRequest,
  Player,
  RegResponse,
  Room,
  RoomListItem,
  WinnerListItem,
  CreateGameResponse,
  PlayerSession,
  AddUserToRoomRequest,
  AddShipsRequest,
  Ship,
  Game,
  TurnData,
  StartGameData,
} from './types/interfaces';

const wss = new WebSocketServer({ port: 8080 });
console.log('WebSocket server running on ws://localhost:8080');

const players = new Map<string, Player>();
const winners: Map<string, number> = new Map();
const rooms: Map<string, Room> = new Map();
const sessions: Map<WebSocket, PlayerSession> = new Map();
const games: Map<string, Game> = new Map();

function broadcast(type: string, data: any) {
  const msg = JSON.stringify({ type, data, id: 0 });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
function send(ws: WebSocket, type: string, data: any) {
  const msg: WebSocketMessage = { type, data, id: 0 };
  ws.send(JSON.stringify(msg));
}
function updateRoomList() {
  const list: RoomListItem[] = Array.from(rooms.values())
    .filter((r) => r.players.length === 1)
    .map((r) => ({
      roomId: r.roomId,
      roomUsers: r.players.map((p) => ({
        name: p.player.name,
        index: p.index,
      })),
    }));

  broadcast('update_room', list);
}

function updateWinners() {
  const list: WinnerListItem[] = Array.from(winners.entries()).map(
    ([name, wins]) => ({
      name,
      wins,
    })
  );
  broadcast('update_winners', list);
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let message: WebSocketMessage;

    try {
      message = JSON.parse(data.toString());
    } catch (e) {
      console.error('Invalid JSON:', data.toString());
      return;
    }

    console.log('Received:', message.type, message.data);

    switch (message.type) {
      case 'reg': {
        const { name, password } = message.data as RegRequest;

        if (!players.has(name)) {
          players.set(name, { name, password, wins: 0 });
        }

        const player = players.get(name)!;

        if (player.password !== password) {
          send(ws, 'reg', {
            name,
            index: '',
            error: true,
            errorText: 'Wrong password',
          } satisfies RegResponse);
          return;
        }

        const index = uuidv4();
        const session: PlayerSession = {
          socket: ws,
          player,
          index,
          ships: [],
        };

        sessions.set(ws, session);

        send(ws, 'reg', {
          name,
          index,
          error: false,
          errorText: '',
        } satisfies RegResponse);

        updateRoomList();
        updateWinners();
        break;
      }

      case 'create_room': {
        const session = sessions.get(ws);
        if (!session) return;

        const roomId = uuidv4();
        const room: Room = {
          roomId,
          players: [session],
        };
        rooms.set(roomId, room);
        session.gameId = roomId;

        updateRoomList();
        break;
      }

      case 'add_user_to_room': {
        const session = sessions.get(ws);
        if (!session) return;

        const { indexRoom } = message.data as AddUserToRoomRequest;
        const room = rooms.get(indexRoom);
        if (!room || room.players.length >= 2) return;

        room.players.push(session);
        session.gameId = room.roomId;

        // Create game
        const gameId = uuidv4();
        const game: Game = {
          id: gameId,
          players: room.players,
          currentPlayerIndex: room.players[0].index,
          boards: new Map(),
        };
        games.set(gameId, game);

        // Inform both players
        for (const p of room.players) {
          send(p.socket, 'create_game', {
            idGame: gameId,
            idPlayer: p.index,
          } satisfies CreateGameResponse);
        }

        rooms.delete(indexRoom);
        updateRoomList();
        break;
      }

      case 'add_ships': {
        const { gameId, ships, indexPlayer } = message.data as AddShipsRequest;
        const game = games.get(gameId);
        if (!game) return;

        const player = game.players.find((p) => p.index === indexPlayer);
        if (!player) return;

        player.ships = ships;
        game.boards.set(indexPlayer, ships);

        // Start game if both players added ships
        if (game.players.every((p) => p.ships.length > 0)) {
          for (const p of game.players) {
            send(p.socket, 'start_game', {
              ships: p.ships,
              currentPlayerIndex: game.currentPlayerIndex,
            } satisfies StartGameData);

            send(p.socket, 'turn', {
              currentPlayer: game.currentPlayerIndex,
            } satisfies TurnData);
          }
        }
        break;
      }

      case 'attack': {
        const { gameId, x, y, indexPlayer } = message.data;
        const game = games.get(gameId);
        if (!game) return;

        if (game.currentPlayerIndex !== indexPlayer) return;

        const opponent = game.players.find((p) => p.index !== indexPlayer);
        if (!opponent) return;

        const board = game.boards.get(opponent.index);
        if (!board) return;

        let result = 'miss';
        for (const ship of board) {
          for (let i = 0; i < ship.length; i++) {
            const posX = ship.direction ? ship.position.x + i : ship.position.x;
            const posY = ship.direction ? ship.position.y : ship.position.y + i;
            if (posX === x && posY === y) {
              ship.hits++;
              result = ship.hits >= ship.length ? 'killed' : 'shot';
              break;
            }
          }
          if (result !== 'miss') break;
        }

        for (const p of game.players) {
          send(p.socket, 'attack', {
            position: { x, y },
            currentPlayer: indexPlayer,
            status: result,
          });
        }

        if (result === 'miss') {
          game.currentPlayerIndex = opponent.index;
        }

        for (const p of game.players) {
          send(p.socket, 'turn', { currentPlayer: game.currentPlayerIndex });
        }

        const allSunk = board.every((s) => s.hits >= s.length);
        if (allSunk) {
          for (const p of game.players) {
            send(p.socket, 'finish', {
              winPlayer: indexPlayer,
            });
          }

          const winner = game.players.find((p) => p.index === indexPlayer)!;
          const wins = winners.get(winner.player.name) || 0;
          winners.set(winner.player.name, wins + 1);
          updateWinners();
          games.delete(gameId);
        }

        break;
      }
    }
  });

  ws.on('close', () => {
    const session = sessions.get(ws);
    if (!session) return;
    sessions.delete(ws);
  });
});
