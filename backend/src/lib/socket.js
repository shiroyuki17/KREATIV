// FR-5.1 — Реал-тайм чат. Redis adapter шаардлагагүй (Render дээр single
// instance тул), тул plain socket.io server хангалттай. REST route-ууд
// (message.routes.js) л зурвасыг бодитоор validate+persist хийдэг хэвээр
// үлдэнэ — socket нь зөвхөн "шинэ зурвас ирлээ" гэдгийг холбогдогч хоёр
// талд шууд түгээх (polling-ийг халаад) дамжуулагч давхарга.
import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';

let io = null;

export function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}
