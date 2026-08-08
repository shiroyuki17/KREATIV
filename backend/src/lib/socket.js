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

    // FR-2.2: WebRTC дуудлагын signaling — сервер offer/answer/ICE
    // candidate-ийг зөвхөн дамжуулна, өөрөө хадгалдаггүй (дуудлага бол
    // ephemeral, мессежийн адил persist хийх шаардлагагүй). Бодит
    // аудио/видео урсгал хэрэглэгчид хооронд шууд (peer-to-peer) урсдаг —
    // сервер зөвхөн холболт тохируулах "гар барих" мэдээллийг дамжуулна.
    socket.on('call:offer', ({ toUserId, conversationId, sdp, kind }) => {
      emitToUser(toUserId, 'call:offer', { fromUserId: socket.userId, conversationId, sdp, kind });
    });
    socket.on('call:answer', ({ toUserId, sdp }) => {
      emitToUser(toUserId, 'call:answer', { fromUserId: socket.userId, sdp });
    });
    socket.on('call:ice-candidate', ({ toUserId, candidate }) => {
      emitToUser(toUserId, 'call:ice-candidate', { fromUserId: socket.userId, candidate });
    });
    socket.on('call:reject', ({ toUserId }) => {
      emitToUser(toUserId, 'call:reject', { fromUserId: socket.userId });
    });
    socket.on('call:end', ({ toUserId }) => {
      emitToUser(toUserId, 'call:end', { fromUserId: socket.userId });
    });
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}
