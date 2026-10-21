import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export function attachSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || !process.env.JWT_ACCESS_SECRET) return next(new Error('UNAUTHENTICATED'));
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      if (!payload.sub || !payload.role) return next(new Error('UNAUTHENTICATED'));
      socket.data.user = { id: String(payload.sub), role: String(payload.role) };
      return next();
    } catch {
      return next(new Error('UNAUTHENTICATED'));
    }
  });

  // Do not expose a generic "join any room" handler. Add narrowly scoped join handlers
  // only after implementing database-backed driver/parent assignment checks.
  io.on('connection', (socket) => {
    socket.emit('connection:ready', { authenticated: true });
  });

  return io;
}

export function getSocketServer() {
  if (!io) throw new Error('Socket.IO has not been initialized');
  return io;
}
