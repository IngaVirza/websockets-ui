import WebSocket, { WebSocket as WS } from 'ws';
import dotenv from 'dotenv';
import db from './db/inMemoryDB';
import { handleReg } from './handlers/playerHandler';
import {
  handleCreateRoom,
  handleAddUserToRoom,
  sendUpdateRoom,
} from './handlers/roomHandler';
import { handleAddShips } from './handlers/shipHandler';
import { handleAttack } from './handlers/gameHandler';

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws: WebSocket) => {
  console.log('New connection');

  ws.on('message', (message: string) => {
    try {
      const msg = JSON.parse(message);

      console.log('Received command:', msg.type, msg);

      switch (msg.type) {
        case 'reg':
          handleReg(ws, msg.data);
          sendUpdateRoom();
          break;
        case 'create_room':
          {
            // Find player by ws
            const player = Array.from(db.players.values()).find(
              (p) => p.ws === ws
            );
            if (player) handleCreateRoom(ws, player.name);
          }
          break;
        case 'add_user_to_room':
          {
            const player = Array.from(db.players.values()).find(
              (p) => p.ws === ws
            );
            if (player) handleAddUserToRoom(ws, msg.data, player.name);
          }
          break;
        case 'add_ships':
          handleAddShips(ws, msg.data);
          break;
        case 'attack':
          handleAttack(ws, msg.data);
          break;
        default:
          console.log('Unknown message type:', msg.type);
      }
    } catch (e) {
      console.error('Failed to process message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Connection closed');
  });
});
