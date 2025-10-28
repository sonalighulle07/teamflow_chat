import React, { useEffect, useRef } from "react";

export default function CallOverlay({
  callType,
  localStream,
  remoteStreams = [],
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
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef([]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    remoteVideoRefs.current.forEach((ref, idx) => {
      if (ref && remoteStreams[idx] && ref.srcObject !== remoteStreams[idx]) {
        ref.srcObject = remoteStreams[idx];
      }
    });
  }, [remoteStreams]);

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
          {callType === "video" ? "Meeting (Video)" : "Meeting (Audio)"}
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

      {/* Remote Participants Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "4px",
          padding: "4px",
          background: "#000",
        }}
      >
        {remoteStreams.length > 0 ? (
          remoteStreams.map((stream, idx) => {
            remoteVideoRefs.current = remoteVideoRefs.current.slice(
              0,
              remoteStreams.length
            );
            return (
              <div key={idx} style={{ position: "relative" }}>
                <video
                  autoPlay
                  playsInline
                  ref={(el) => (remoteVideoRefs.current[idx] = el)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "6px",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "4px",
                    left: "4px",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  Participant {idx + 1}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ color: "#aaa", textAlign: "center", padding: "20px" }}>
            Waiting for participant to join…
          </div>
        )}
      </div>

      {/* Local Video (video calls only) */}
      {callType === "video" && (
        <video
          autoPlay
          playsInline
          muted
          ref={localVideoRef}
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
        <button onClick={onToggleMic} style={controlButtonStyle}>
          {isMuted ? "🔇" : "🎤"}
        </button>
        <button onClick={onToggleCam} style={controlButtonStyle}>
          {isVideoEnabled ? "📹" : "🚫"}
        </button>
        <button
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          style={controlButtonStyle}
        >
          {isScreenSharing ? "🛑" : "🖥️"}
        </button>
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
