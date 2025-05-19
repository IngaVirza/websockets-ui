import db from '../db/inMemoryDB';
import { Ship } from '../types/interfaces';
import { sendMessage } from '../utils/utils';

interface AddShipsData {
  gameId: string;
  ships: Ship[];
  indexPlayer: string;
}

export function handleAddShips(ws: WebSocket, data: AddShipsData) {
  const game = db.games.get(data.gameId);
  if (!game) {
    sendMessage(ws, {
      type: 'add_ships',
      data: { error: true, errorText: 'Game not found' },
      id: 0,
    });
    return;
  }

  if (!game.players[data.indexPlayer]) {
    sendMessage(ws, {
      type: 'add_ships',
      data: { error: true, errorText: 'Player not in game' },
      id: 0,
    });
    return;
  }

  // Save player's ships
  game.players[data.indexPlayer].ships = data.ships.map((ship) => ({
    ...ship,
    hits: 0,
  }));

  // Check if both players sent ships
  const allShipsReady = Object.values(game.players).every(
    (p) => p.ships.length > 0
  );
  if (allShipsReady) {
    // Start game, send start_game to both players
    for (const playerId in game.players) {
      const playerData = game.players[playerId];
      const player = Object.values(db.players).find((p) => p.id === playerId);
      if (!player || !player.ws || player.ws.readyState !== player.ws.OPEN)
        continue;

      sendMessage(player.ws, {
        type: 'start_game',
        data: {
          ships: playerData.ships,
          currentPlayerIndex: game.currentPlayerIndex,
        },
        id: 0,
      });

      sendMessage(player.ws, {
        type: 'turn',
        data: {
          currentPlayer: game.currentPlayerIndex,
        },
        id: 0,
      });
    }
  }
}
