import db from '../db/inMemoryDB';
import { Position, AttackStatus, Ship } from '../types/interfaces';
import { sendMessage } from '../utils/utils';

interface AttackData {
  gameId: string;
  x: number;
  y: number;
  indexPlayer: string;
}

function isShipHit(ship: Ship, pos: Position): boolean {
  const { x, y } = pos;
  const { position, direction, length } = ship;
  for (let i = 0; i < length; i++) {
    let shipX = direction ? position.x + i : position.x;
    let shipY = direction ? position.y : position.y + i;
    if (shipX === x && shipY === y) return true;
  }
  return false;
}

function isShipKilled(ship: Ship): boolean {
  return ship.hits >= ship.length;
}

function markShipHit(ship: Ship): Ship {
  return { ...ship, hits: ship.hits + 1 };
}

export function handleAttack(ws: WebSocket, data: AttackData) {
  const { gameId, x, y, indexPlayer } = data;
  const game = db.games.get(gameId);
  if (!game || game.finished) return;

  // Check turn
  if (game.currentPlayerIndex !== indexPlayer) {
    sendMessage(ws, {
      type: 'attack',
      data: { error: true, errorText: 'Not your turn' },
      id: 0,
    });
    return;
  }

  // Find enemy player
  const enemyPlayerId = Object.keys(game.players).find(
    (id) => id !== indexPlayer
  );
  if (!enemyPlayerId) return;

  const enemyData = game.players[enemyPlayerId];
  const attackerData = game.players[indexPlayer];
  const pos: Position = { x, y };

  // Check if this position was attacked before
  if (enemyData.attacksReceived.some((p) => p.x === x && p.y === y)) {
    sendMessage(ws, {
      type: 'attack',
      data: { error: true, errorText: 'Position already attacked' },
      id: 0,
    });
    return;
  }

  enemyData.attacksReceived.push(pos);

  // Check hit/miss/killed
  let status: AttackStatus = 'miss';
  let hitShipIndex = -1;

  for (let i = 0; i < enemyData.ships.length; i++) {
    if (isShipHit(enemyData.ships[i], pos)) {
      enemyData.ships[i] = markShipHit(enemyData.ships[i]);
      if (isShipKilled(enemyData.ships[i])) {
        status = 'killed';
      } else {
        status = 'shot';
      }
      hitShipIndex = i;
      break;
    }
  }

  // Prepare attack feedback message
  const attackMsg = {
    type: 'attack',
    data: {
      position: pos,
      currentPlayer: indexPlayer,
      status,
    },
    id: 0,
  };

  // Send attack result to both players
  for (const playerId in game.players) {
    const player = Object.values(db.players).find((p) => p.id === playerId);
    if (player?.ws && player.ws.readyState === player.ws.OPEN) {
      sendMessage(player.ws, attackMsg);
    }
  }

  // If killed, check if all ships are killed - finish game
  if (status === 'killed') {
    const allKilled = enemyData.ships.every((ship) => ship.hits >= ship.length);
    if (allKilled) {
      game.finished = true;
      // Update winners
      const winnerPlayer = db.players.get(attackerData.indexPlayer) || null;
      if (winnerPlayer) {
        const wins = db.winners.get(winnerPlayer.name) || 0;
        db.winners.set(winnerPlayer.name, wins + 1);
      }

      const finishMsg = {
        type: 'finish',
        data: {
          winPlayer: indexPlayer,
        },
        id: 0,
      };

      for (const playerId in game.players) {
        const player = Object.values(db.players).find((p) => p.id === playerId);
        if (player?.ws && player.ws.readyState === player.ws.OPEN) {
          sendMessage(player.ws, finishMsg);
        }
      }

      // Send update_winners to all
      sendUpdateWinners();
      return;
    }
  }

  // If status is 'miss', change turn to enemy player
  if (status === 'miss') {
    game.currentPlayerIndex = enemyPlayerId;
  }

  // Send turn info
  const turnMsg = {
    type: 'turn',
    data: {
      currentPlayer: game.currentPlayerIndex,
    },
    id: 0,
  };
  for (const playerId in game.players) {
    const player = Object.values(db.players).find((p) => p.id === playerId);
    if (player?.ws && player.ws.readyState === player.ws.OPEN) {
      sendMessage(player.ws, turnMsg);
    }
  }
}

function sendUpdateWinners() {
  const winnersTable = Array.from(db.winners.entries()).map(([name, wins]) => ({
    name,
    wins,
  }));

  const message = {
    type: 'update_winners',
    data: winnersTable,
    id: 0,
  };

  for (const player of db.players.values()) {
    if (player.ws && player.ws.readyState === player.ws.OPEN) {
      sendMessage(player.ws, message);
    }
  }
}
