import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(SOCKET_URL, { 
      transports: ['websocket', 'polling'],
      auth: { token }
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
