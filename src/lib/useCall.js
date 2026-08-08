import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "./socket.js";

// FR-2.2: чат доторх WebRTC дуудлага.
//
// STUN нь зөвхөн "миний гадаад хаяг юу вэ?" гэдгийг хэлдэг — хоёр тал шууд
// холбогдож чадвал л ажиллана. Symmetric NAT, corporate firewall, mobile
// carrier-grade NAT дор шууд холболт үүсдэггүй тул TURN (трафикийг өөрөөрөө
// дамжуулдаг relay) шаардлагатай. TURN-гүй үед хэрэглэгчдийн мэдэгдэхүйц
// хувь нь "холбогдож байна…" дээр үүрд гацдаг.
//
// TURN нь данс шаарддаг тул env-ээр өгнө — тохируулаагүй бол урьдын
// STUN-only зан төлөв хэвээр (dev-д хангалттай).
//   VITE_TURN_URL="turn:global.relay.metered.ca:80"
//   VITE_TURN_USERNAME="..."
//   VITE_TURN_CREDENTIAL="..."
const TURN_URL = import.meta.env?.VITE_TURN_URL;
const TURN_USERNAME = import.meta.env?.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env?.VITE_TURN_CREDENTIAL;

export const hasTurn = !!(TURN_URL && TURN_USERNAME && TURN_CREDENTIAL);

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(hasTurn
    ? [{ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL }]
    : []),
];

// "disconnected" нь түр зуурынх байж болно — WebRTC өөрөө сэргээх оролдлого
// хийдэг тул шууд таслах нь эрт. "failed"/"closed" бол эргэлт буцалтгүй.
const RECONNECT_GRACE_MS = 8000;

// idle -> calling (бид дуудаж байна) / ringing (бидэнд дуудлага ирлээ) -> active -> idle
export function useCall(myId) {
  const [callState, setCallState] = useState("idle");
  const [incomingCall, setIncomingCall] = useState(null); // { fromUserId, conversationId, kind }
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState("");

  const pcRef = useRef(null);
  const otherUserIdRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const cameraTrackRef = useRef(null);
  // Sara-ийн ICE candidate-үүд ихэвчлэн offer явуулмагцаа шууд гарч ирдэг —
  // Nova хараахан Accept дараагүй үед pcRef.current нь null тул шууд
  // хаягдчихдаг байсан (чимээгүй алдаа) — connection хэзээ ч ICE candidate
  // хос олохгүй, "calling"/"ringing" төлөвөөс цаашгүй зогсдог байв.
  // Одоо pc үүсэх/remote description тавигдахаас өмнө ирсэн candidate-уудыг
  // энд түр хадгалж, remote description тавигдмагц бүгдийг дараалан нэмнэ.
  const pendingCandidatesRef = useRef([]);
  // "disconnected" болоод сэргэхийг хүлээх таймер.
  const dropTimerRef = useRef(null);
  // Холболтын төлөв солигдоход callState-ийн ХАМГИЙН СҮҮЛИЙН утга хэрэгтэй.
  // State-ийг closure-аар барих нь болохгүй: pc үүсэх агшны утга хөлдөж
  // үлддэг тул дуудлага "active" болсны дараа ирсэн эвент хуучин утгыг харна.
  const callStateRef = useRef(callState);
  callStateRef.current = callState;

  const flushPendingCandidates = useCallback(async (pc) => {
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    }
  }, []);

  const cleanup = useCallback(() => {
    clearTimeout(dropTimerRef.current);
    dropTimerRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setIncomingCall(null);
    setMuted(false);
    setCameraOff(false);
    setScreenSharing(false);
    otherUserIdRef.current = null;
    pendingOfferRef.current = null;
    cameraTrackRef.current = null;
    pendingCandidatesRef.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  const buildPeerConnection = useCallback((toUserId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (e.candidate) getSocket()?.emit("call:ice-candidate", { toUserId, candidate: e.candidate });
    };
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);
    // Нөгөө тал таб хаах, сүлжээ тасрах, тэжээл унах зэрэгт "call:end"
    // socket эвент ХЭЗЭЭ Ч ирэхгүй. Өмнө нь энэ handler-ийн бие хоосон
    // байсан тул дуудлага "active" төлөвтэй үүрд гацаж, хэрэглэгч "End
    // call"-ыг гараар дарж л гарах боломжтой байв.
    pc.onconnectionstatechange = () => {
      // Аль хэдийн хаагдсан pc-ийн хоцорсон эвент — идэвхтэй холболтыг
      // санамсаргүй тасалж болохгүй.
      if (pcRef.current !== pc) return;
      if (callStateRef.current === "idle") return;

      const state = pc.connectionState;

      if (state === "connected") {
        // Сэргэлээ — хүлээлтийн таймерыг цуцална.
        clearTimeout(dropTimerRef.current);
        dropTimerRef.current = null;
        return;
      }

      if (state === "failed" || state === "closed") {
        setError("Холболт тасарлаа");
        cleanup();
        return;
      }

      if (state === "disconnected" && !dropTimerRef.current) {
        // Түр зуурын байж болно — тодорхой хугацаа хүлээгээд л таслана.
        dropTimerRef.current = setTimeout(() => {
          dropTimerRef.current = null;
          if (pcRef.current !== pc) return;
          if (pc.connectionState === "connected") return;
          setError("Холболт тасарлаа");
          cleanup();
        }, RECONNECT_GRACE_MS);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup]);

  const startCall = useCallback(async (toUserId, conversationId, video) => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      setLocalStream(stream);
      cameraTrackRef.current = stream.getVideoTracks()[0] || null;
      otherUserIdRef.current = toUserId;
      const pc = buildPeerConnection(toUserId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getSocket()?.emit("call:offer", { toUserId, conversationId, sdp: offer, kind: video ? "video" : "voice" });
      setCallState("calling");
    } catch (err) {
      setError(err.message === "Permission denied" ? "Camera/mic access denied" : err.message);
    }
  }, [buildPeerConnection]);

  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    if (!offer) return;
    setError("");
    try {
      const video = offer.kind === "video";
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      setLocalStream(stream);
      cameraTrackRef.current = stream.getVideoTracks()[0] || null;
      otherUserIdRef.current = offer.fromUserId;
      const pc = buildPeerConnection(offer.fromUserId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      await flushPendingCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      getSocket()?.emit("call:answer", { toUserId: offer.fromUserId, sdp: answer });
      setCallState("active");
      setIncomingCall(null);
    } catch (err) {
      setError(err.message === "Permission denied" ? "Camera/mic access denied" : err.message);
    }
  }, [buildPeerConnection, flushPendingCandidates]);

  const rejectCall = useCallback(() => {
    if (incomingCall) getSocket()?.emit("call:reject", { toUserId: incomingCall.fromUserId });
    setIncomingCall(null);
    pendingOfferRef.current = null;
    setCallState("idle");
  }, [incomingCall]);

  const endCall = useCallback(() => {
    if (otherUserIdRef.current) getSocket()?.emit("call:end", { toUserId: otherUserIdRef.current });
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted((m) => !m);
  }, [localStream, muted]);

  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = cameraOff; });
    setCameraOff((c) => !c);
  }, [localStream, cameraOff]);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        await sender?.replaceTrack(screenTrack);
        screenTrack.onended = () => toggleScreenShare();
        setScreenSharing(true);
      } catch {
        // user cancelled the screen picker — stay on camera
      }
    } else if (cameraTrackRef.current) {
      await sender?.replaceTrack(cameraTrackRef.current);
      setScreenSharing(false);
    }
  }, [screenSharing]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !myId) return;

    const onOffer = (data) => {
      pendingOfferRef.current = data;
      setIncomingCall(data);
      setCallState("ringing");
    };
    const onAnswer = async (data) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      await flushPendingCandidates(pc);
      setCallState("active");
    };
    const onIceCandidate = (data) => {
      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
      } else {
        pendingCandidatesRef.current.push(data.candidate);
      }
    };
    const onReject = () => cleanup();
    const onEnd = () => cleanup();

    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:reject", onReject);
    socket.on("call:end", onEnd);
    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:reject", onReject);
      socket.off("call:end", onEnd);
    };
  }, [myId, cleanup, flushPendingCandidates]);

  return {
    callState, incomingCall, localStream, remoteStream, muted, cameraOff, screenSharing, error,
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera, toggleScreenShare,
  };
}
