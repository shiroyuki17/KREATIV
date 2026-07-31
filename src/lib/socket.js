// FR-5.1 — реал-тайм чат. REST л зурвасыг бодитоор илгээдэг хэвээр, socket
// нь зөвхөн "шинэ зурвас ирлээ" гэдгийг холбогдогч хоёр талд шууд мэдэгддэг
// (polling-ийг халаад) дамжуулагч давхарга.
import { io } from "socket.io-client";
import { API_BASE } from "./authApi.js";

let socket = null;

export function connectSocket(accessToken) {
  if (socket?.connected && socket.auth?.token === accessToken) return socket;
  socket?.disconnect();
  socket = io(API_BASE, { auth: { token: accessToken }, transports: ["websocket", "polling"] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
