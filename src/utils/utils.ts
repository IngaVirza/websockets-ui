// src/utils/utils.ts
import crypto from 'crypto';

export function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function sendMessage(ws: WebSocket, message: any): void {
  ws.send(JSON.stringify(message));
}

export function broadcast(players: WebSocket[], message: any): void {
  const msg = JSON.stringify(message);
  players.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  });
}
