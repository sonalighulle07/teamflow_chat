// src/components/calls/CallOverlay.js
import React from "react";

export default function CallOverlay({
  callType,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMic,
  onToggleCam,
  onStartScreenShare,
  onStopScreenShare,
  isScreenSharing,
  isMuted,
  isVideoEnabled,
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
      {/* Top Bar */}
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
        <span>
          {callType === "video" ? "Video Call" : "Audio Call"}
        </span>
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
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Local Video (video calls only) */}
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

      {/* Control Bar */}
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
        {/* Mute / Unmute */}
        <button onClick={onToggleMic} style={controlButtonStyle}>
          {isMuted ? "🔇" : "🎤"}
        </button>

        {/* Video On / Off */}
        <button onClick={onToggleCam} style={controlButtonStyle}>
          {isVideoEnabled ? "📹" : "🚫"}
        </button>

        {/* Screen Share */}
        <button
          onClick={
            isScreenSharing
              ? onStopScreenShare
              : onStartScreenShare
          }
          style={controlButtonStyle}
        >
          {isScreenSharing ? "🛑" : "🖥️"}
        </button>

        {/* End Call */}
        <button
          onClick={onEndCall}
          style={{
            ...controlButtonStyle,
            background: "#d93025",
          }}
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

