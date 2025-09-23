import React, { useEffect, useRef } from "react";

export default function IncomingCallModal({
  visible,
  fromUser,
  callType,
  onAccept,
  onReject,
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/ringtone.mp3");
      audioRef.current.loop = true;
    }

    // Load & attempt to play ringtone
    audioRef.current.load();
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => console.warn("Ringtone play failed:", err));
    }

    // Stop ringtone when modal hides
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 3000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "10px",
          textAlign: "center",
          width: "300px",
        }}
      >
        <p>
          Incoming {callType} call from <strong>{fromUser}</strong>
        </p>
        <div
          style={{
            marginTop: "15px",
            display: "flex",
            justifyContent: "center",
            gap: "40px",
          }}
        >
          <button
            onClick={() => {
              audioRef.current?.pause();
              audioRef.current.currentTime = 0;
              onAccept();
            }}
            style={{
              background: "#4caf50",
              border: "none",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              fontSize: "18px",
              color: "white",
              cursor: "pointer",
            }}
          >
            ✓
          </button>
          <button
            onClick={() => {
              audioRef.current?.pause();
              audioRef.current.currentTime = 0;
              onReject();
            }}
            style={{
              background: "#f44336",
              border: "none",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              fontSize: "18px",
              color: "white",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
