import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { handleMessage } from './handlers/mainHandler';

dotenv.config();

const wss = new WebSocketServer({ port: parseInt(process.env.PORT || '8080') });

console.log(
  `WebSocket server started on ws://localhost:${process.env.PORT || '8080'}`
);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message.toString());
      handleMessage(ws, parsed);
    } catch (err) {
      console.error('Invalid message:', message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
