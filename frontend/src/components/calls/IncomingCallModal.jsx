import React from "react";

export default function IncomingCallModal({ visible, fromUser, callType, onAccept, onReject }) {
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
