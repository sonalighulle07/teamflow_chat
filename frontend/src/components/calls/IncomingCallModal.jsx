import React from "react";
import { useEffect } from "react";

export default function IncomingCallModal({ visible, fromUser, callType, onAccept, onReject }) {

  // Add this inside useEffect to play ringtone
useEffect(() => {
  if (!visible) return;

  const audio = new Audio("/sounds/ringtone.mp3");
  audio.loop = true;

  audio.play().catch(err => {
    console.warn("Audio playback blocked:", err);
  });

  return () => {
    audio.pause();
    audio.currentTime = 0;
  };
}, [visible]);


  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 3000
      }}
    >
      <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", textAlign: "center", width: "300px" }}>
        <p>Incoming {callType} call from {fromUser}</p>
        <div style={{ marginTop: "15px", display: "flex", justifyContent: "center", gap: "40px" }}>
          {/* Accept */}
          <button
            onClick={onAccept}
            style={{
              background: "#4caf50",
              border: "none",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              fontSize: "18px",
              color: "white"
            }}
          >
            ✓
          </button>
          {/* Reject */}
          <button
            onClick={onReject}
            style={{
              background: "#f44336",
              border: "none",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              fontSize: "18px",
              color: "white"
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
