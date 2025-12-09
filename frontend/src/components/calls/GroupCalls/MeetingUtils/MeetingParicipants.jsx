import React, { useEffect, useState } from "react";
import socket from "../../hooks/socket";
import { useSelector } from "react-redux";

export default function ParticipantsPanel({ roomCode, onClose }) {
  const currentUser = useSelector((state) => state.user);
  const userId = currentUser?.id;
  const [participants, setParticipants] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [hostId, setHostId] = useState(null);

  useEffect(() => {

    console.log("Paricipants.jsx mounted");

    if (!roomCode) return;

    // Ask backend for current permissions
    socket.emit("getRoomPermissions", { roomCode });

    // Listener for synced permissions
    socket.on("permissions-sync", ({ hostId, users }) => {
      setPermissions(users);
      setHostId(hostId);
    });

    // Listener when host changes permissions
    socket.on("userPermissionsUpdated", ({ targetUserId, updatedPermissions }) => {
      setPermissions((prev) => ({
        ...prev,
        [targetUserId]: updatedPermissions,
      }));
    });

    // Listener for active room users
    socket.emit("get-active-users", { roomCode }, (res) => {
      if (res?.users) {
        setParticipants(res.users);
        console.log("Active users in room:",res.users);
      }
    });

    return () => {
      socket.off("permissions-sync");
      socket.off("userPermissionsUpdated");
    };
  }, [roomCode]);

  const isHost = userId === hostId;

  const togglePermission = (targetUserId, field) => {
    const updated = {
      ...permissions[targetUserId],
      [field]: !permissions[targetUserId][field],
    };

    socket.emit("updateUserPermissions", {
      roomCode,
      targetUserId,
      updatedPermissions: updated,
    });
  };

  return (
    <div
      style={{
        position: "absolute",
        right: "20px",
        top: "80px",
        width: "320px",
        background: "#1E1F22",
        padding: "16px",
        borderRadius: "10px",
        color: "white",
        zIndex: 20000,
      }}
    >
      <h3 style={{ marginBottom: "10px", fontSize: "18px", fontWeight: "700" }}>
        Participants
      </h3>

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          right: "10px",
          top: "10px",
          background: "transparent",
          border: "none",
          color: "#ccc",
          cursor: "pointer",
          fontSize: "18px",
        }}
      >
        ✖
      </button>

      {participants.map((p) => {
        const pPerm = permissions[p.userId] || { mic: true, cam: true, screen: true };
        const itsMe = p.userId === userId;

        return (
          <div
            key={p.userId}
            style={{
              background: "#2A2D31",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "10px",
            }}
          >
            <div style={{ fontWeight: "600", marginBottom: "6px" }}>
              {p.username} {p.userId === hostId && "(Host)"}
              {itsMe ? " (You)" : ""}
            </div>

            {/* Host controls */}
            {isHost && !itsMe ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => togglePermission(p.userId, "mic")}
                  className="permission-btn"
                >
                  MIC: {pPerm.mic ? "ON" : "OFF"}
                </button>

                <button
                  onClick={() => togglePermission(p.userId, "cam")}
                  className="permission-btn"
                >
                  CAM: {pPerm.cam ? "ON" : "OFF"}
                </button>

                <button
                  onClick={() => togglePermission(p.userId, "screen")}
                  className="permission-btn"
                >
                  SCREEN: {pPerm.screen ? "ON" : "OFF"}
                </button>
              </div>
            ) : (
              <div style={{ opacity: 0.7, fontSize: "14px" }}>
                🎤 {pPerm.mic ? "Allowed" : "Blocked"} | 🎥 {pPerm.cam ? "Allowed" : "Blocked"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
