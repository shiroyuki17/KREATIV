import { useEffect, useRef } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, MonitorUp, X } from "lucide-react";

function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function CallerCard({ name, avatarUrl }) {
  return (
    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand/50 to-neon/40 font-display text-2xl font-bold ring-4 ring-white/10">
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : initialsOf(name)}
      <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
    </div>
  );
}

// FR-2.2: чат доторх дуудлагын UI — ringing/calling/active бүх төлвийг
// нэг компонентоор дамжуулна. callState === "idle" үед юу ч render хийхгүй.
export default function CallOverlay({ call, otherUser }) {
  const { callState, incomingCall, localStream, remoteStream, muted, cameraOff, screenSharing, error, acceptCall, rejectCall, endCall, toggleMute, toggleCamera, toggleScreenShare } = call;
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream || null;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream || null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream || null;
  }, [remoteStream]);

  if (callState === "idle") return null;

  const isVideo = (incomingCall?.kind || (localStream?.getVideoTracks().length > 0 ? "video" : "voice")) === "video";
  const name = otherUser?.name || "Someone";
  const avatarUrl = otherUser?.avatarUrl;

  if (callState === "ringing") {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-black/85 backdrop-blur-md">
        <CallerCard name={name} avatarUrl={avatarUrl} />
        <div className="text-center">
          <p className="font-display text-xl font-bold text-white">{name}</p>
          <p className="mt-1 text-[13px] text-white/50">Incoming {isVideo ? "video" : "voice"} call…</p>
        </div>
        <div className="mt-4 flex items-center gap-6">
          <button onClick={rejectCall} aria-label="Decline" className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform hover:scale-105">
            <PhoneOff className="h-6 w-6" />
          </button>
          <button onClick={acceptCall} aria-label="Accept" className="flex h-14 w-14 items-center justify-center rounded-full bg-mint text-ink shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform hover:scale-105">
            <Phone className="h-6 w-6" />
          </button>
        </div>
        {error && <p className="text-[12px] text-red-400">{error}</p>}
      </div>
    );
  }

  if (callState === "calling") {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-black/85 backdrop-blur-md">
        <CallerCard name={name} avatarUrl={avatarUrl} />
        <div className="text-center">
          <p className="font-display text-xl font-bold text-white">{name}</p>
          <p className="mt-1 text-[13px] text-white/50">Calling…</p>
        </div>
        <button onClick={endCall} aria-label="Cancel call" className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform hover:scale-105">
          <PhoneOff className="h-6 w-6" />
        </button>
        {error && <p className="text-[12px] text-red-400">{error}</p>}
      </div>
    );
  }

  // active
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="relative flex-1">
        {isVideo && remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CallerCard name={name} avatarUrl={avatarUrl} />
          </div>
        )}
        <audio ref={remoteAudioRef} autoPlay hidden={isVideo} />

        <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3.5 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur">
          {name}
        </div>

        {isVideo && localStream && !cameraOff && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-4 h-32 w-24 rounded-xl object-cover shadow-[0_8px_24px_rgba(0,0,0,0.6)] ring-1 ring-white/15 sm:h-40 sm:w-28"
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-4 bg-black/60 py-6 backdrop-blur">
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${muted ? "bg-white text-ink" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        {isVideo && (
          <button
            onClick={toggleCamera}
            aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${cameraOff ? "bg-white text-ink" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
        )}
        {isVideo && (
          <button
            onClick={toggleScreenShare}
            aria-label="Share screen"
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${screenSharing ? "bg-brand text-ink" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <MonitorUp className="h-5 w-5" />
          </button>
        )}
        <button onClick={endCall} aria-label="End call" className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition-transform hover:scale-105">
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
      {error && <p className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[12px] text-red-400">{error}</p>}
    </div>
  );
}
