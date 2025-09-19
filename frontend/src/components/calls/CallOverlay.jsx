import React from "react";

export default function CallOverlay({
  callType,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMic,
  onToggleCam,
  onMinimize,
  onMaximize,
  onClose,
  isMaximized,
}) {
  return (
    <div
      style={{
        display: callType ? "flex" : "none",
        position: "fixed",
        bottom: isMaximized ? "unset" : 20,
        right: isMaximized ? "unset" : 20,
        top: isMaximized ? 0 : "unset",
        left: isMaximized ? 0 : "unset",
        width: isMaximized ? "100%" : "420px",
        height: isMaximized ? "100%" : "280px",
        background: "#1e1e1e",
        borderRadius: isMaximized ? "0" : "12px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 2000,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: "40px",
          background: "#2b2b2b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 10px",
          color: "#fff",
          fontSize: "14px",
        }}
      >
        <span>{callType === "video" ? "Video Call" : "Audio Call"}</span>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onMinimize}>➖</button>
          <button onClick={onMaximize}>⬜</button>
          <button
            onClick={onClose}
            style={{
              background: "#d93025",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              color: "white",
              cursor: "pointer",
            }}
          >
            ✖️
          </button>
        </div>
      </div>

      {/* Remote Video */}
      <video
        autoPlay
        playsInline
        ref={(el) => {
          if (el && remoteStream) el.srcObject = remoteStream;
        }}
        style={{ flex: 1, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Local Video (only for video calls) */}
      {callType === "video" && (
        <video
          autoPlay
          playsInline
          muted
          ref={(el) => {
            if (el && localStream) el.srcObject = localStream;
          }}
          style={{
            width: "100px",
            height: "75px",
            position: "absolute",
            bottom: "70px",
            right: "20px",
            border: "2px solid #fff",
            borderRadius: "8px",
            zIndex: 100,
          }}
        />
      )}

      {/* Controls */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "15px",
          background: "rgba(0,0,0,0.6)",
          padding: "8px 14px",
          borderRadius: "30px",
        }}
      >
        <button onClick={onToggleMic} style={controlButtonStyle}>
          🎤
        </button>
        <button onClick={onToggleCam} style={controlButtonStyle}>
          📹
        </button>
        <button
          onClick={onEndCall}
          style={{ ...controlButtonStyle, background: "#d93025" }}
        >
          ✖️
        </button>
      </div>
    </div>
  );
}

const controlButtonStyle = {
  background: "#444",
  border: "none",
  borderRadius: "50%",
  width: "40px",
  height: "40px",
  color: "white",
  cursor: "pointer",
};
