// FR-5.1 — реал-тайм чат. REST л зурвасыг бодитоор илгээдэг хэвээр, socket
// нь зөвхөн "шинэ зурвас ирлээ" гэдгийг холбогдогч хоёр талд шууд мэдэгддэг
// (polling-ийг халаад) дамжуулагч давхарга.
import { io } from "socket.io-client";
import {
  API_BASE, getAccessToken, refreshAccessToken, TOKEN_REFRESHED_EVENT,
} from "./apiClient.js";

let socket = null;
let socketToken = null;

export function connectSocket(accessToken = getAccessToken()) {
  // Урьд нь зөвхөн `socket.connected` шалгадаг байсан тул, гар барилт дуусаагүй
  // (connecting) байхад давхар дуудагдвал үүссэн холболтоо таслаад шинийг
  // үүсгэдэг байв. Messages.jsx болон useCall.js хоёр бараг зэрэг дууддаг,
  // React StrictMode dev дээр effect-ийг давхар ажиллуулдаг тул энэ нь
  // хуудас ачаалсны дараах эхний хэдэн секундэд холболтыг тасалж
  // ("WebSocket is closed before the connection is established"), өмнөх
  // instance дээр бүртгэсэн сонсогчдыг алдагдуулж байсан.
  //
  // Одоо холбогдсон ЭСВЭЛ холбогдож буй socket-ыг ижил токентой бол дахин
  // ашиглана — зөвхөн токен солигдоход л шинээр үүсгэнэ.
  const reusable = socket && (socket.connected || socket.active) && socketToken === accessToken;
  if (reusable) return socket;

  socket?.disconnect();
  socketToken = accessToken;
  socket = io(API_BASE, { auth: { token: accessToken }, transports: ["websocket", "polling"] });

  // Handshake нь access token шалгадаг (backend/src/lib/socket.js). Токен
  // хугацаа нь дуусмагц холболт "unauthorized"-оор унах бөгөөд socket.io
  // дахин оролдох болгондоо мөн ЯГ ТЭР хуучин токеныг илгээх тул хэзээ ч
  // сэргэхгүй давталтад ордог. Нэг удаа refresh хийж, шинэ токеноор
  // ажиллуулж өгнө (адилхан socket instance хэвээр — бүртгэсэн сонсогчид
  // алдагдахгүй).
  socket.on("connect_error", async (err) => {
    if (!String(err?.message || "").includes("unauthorized")) return;
    const fresh = await refreshAccessToken();
    if (fresh) applyToken(fresh);
  });

  return socket;
}

// Токеныг instance дээр нь солино — шинэ socket үүсгэхгүй тул Messages.jsx
// болон useCall.js-ийн бүртгэсэн listener-үүд хэвээр үлдэнэ.
function applyToken(token) {
  if (!socket || !token) return;
  socketToken = token;
  socket.auth = { token };
  if (socket.connected) socket.disconnect();
  socket.connect();
}

// apiClient REST хүсэлт дээр токен шинэчлэхэд socket-ыг мөн шинэчилнэ —
// эс тэгвээс REST ажиллаж байхад realtime давхарга чимээгүй үхсэн хэвээр үлдэнэ.
if (typeof window !== "undefined") {
  window.addEventListener(TOKEN_REFRESHED_EVENT, (e) => {
    applyToken(e.detail?.accessToken || getAccessToken());
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}

export function getSocket() {
  return socket;
}
