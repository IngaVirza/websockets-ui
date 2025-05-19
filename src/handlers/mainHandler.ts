import { WebSocket } from 'ws';
import { handleRegistration } from './playerHandler';
import { handleCreateRoom, handleAddUserToRoom } from './roomHandler';

export function handleMessage(ws: WebSocket, message: any) {
  switch (message.type) {
    case 'reg':
      handleRegistration(ws, message);
      break;
    case 'create_room':
      handleCreateRoom(ws, message);
      break;
    case 'add_user_to_room':
      handleAddUserToRoom(ws, message);
      break;
    default:
      ws.send(
        JSON.stringify({ error: true, errorText: 'Unknown command', id: 0 })
      );
  }
}
