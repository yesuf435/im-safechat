import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_BASE || 'http://localhost:3001');
  }
  return socket;
}
