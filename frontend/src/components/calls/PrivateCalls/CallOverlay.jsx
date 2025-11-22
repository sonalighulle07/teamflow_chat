// CallOverlay.jsx
import React, { useEffect, useRef, useState } from "react";
import socket from "../hooks/socket";
import { useSelector } from "react-redux";

/*
Props:
 - callId (optional) — provided by useCall.callState.callId
 - callType, localStream, remoteStreams (array of {userId, stream}),
 - onEndCall, onToggleMic, onToggleCam, onStartScreenShare, onStopScreenShare,
 - isScreenSharing, isMuted, isVideoEnabled, onMinimize, onMaximize, onClose,
 - isMaximized, inCall,
 - addUser (function) -> will call useCall.addUserToCall
 - cancelInvite (function) -> useCall.cancelInviteFor
*/

export default function CallOverlay({
  callId,
  callType,
  localStream,
  remoteStreams = [], // array of { userId, stream }
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
  inCall,
  addUser, // provided by useCall.addUserToCall
  cancelInvite, // provided by useCall.cancelInviteFor
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef([]);

  const userList = useSelector((state) => state.user.userList || []);

  const [showUserList, setShowUserList] = useState(false);

  // pendingInvites: array of { id: userId, username, status, timeoutId }
  const [pendingInvites, setPendingInvites] = useState([]);

  const statusColors = {
    ringing: "#ffd700",
    rejected: "#ff4444",
    "no-answer": "#ff8800",
    joined: "#00cc66",
    cancelled: "#d93025",
  };

  // attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // attach remote streams into video refs
  useEffect(() => {
    remoteVideoRefs.current = remoteVideoRefs.current.slice(0, remoteStreams.length);

    remoteStreams.forEach((r, idx) => {
      const el = remoteVideoRefs.current[idx];
      if (el && r?.stream && el.srcObject !== r.stream) {
        el.srcObject = r.stream;
      }
    });
  }, [remoteStreams]);

  // helper: create invite tile (id = userId)
  const addInviteTile = (userId, username, status = "ringing", timeoutMs = 15000) => {
    setPendingInvites((prev) => {
      if (prev.some((p) => p.id === String(userId))) return prev;

      const timeoutId = setTimeout(() => {
        // mark as no-answer then remove after short delay and notify server
        setPendingInvites((prev2) => prev2.map((it) => (it.id === String(userId) ? { ...it, status: "no-answer" } : it)));
        setTimeout(() => {
          setPendingInvites((prev2) => prev2.filter((it) => it.id !== String(userId)));
          socket.emit("call-invite-timeout-remove", { userId, callId });
        }, 3000);
      }, timeoutMs);

      return [...prev, { id: String(userId), username: username || "User", status, timeoutId }];
    });
  };

  const updateInviteStatus = (userId, status) => {
    setPendingInvites((prev) => prev.map((p) => (p.id === String(userId) ? { ...p, status } : p)));
    // clear timeouts for final statuses
    if (["joined", "rejected", "cancelled", "no-answer"].includes(status)) {
      setPendingInvites((prev) => {
        prev.forEach((p) => {
          if (p.id === String(userId) && p.timeoutId) {
            clearTimeout(p.timeoutId);
          }
        });
        return prev;
      });
    }
  };

  const removeInviteTile = (userId) => {
    setPendingInvites((prev) => {
      prev.forEach((p) => p.id === String(userId) && p.timeoutId && clearTimeout(p.timeoutId));
      return prev.filter((p) => p.id !== String(userId));
    });
  };

  // when user clicks "Add" from popup
  const handleAddClick = (uid) => {
    const u = userList.find((x) => String(x.id) === String(uid));
    addInviteTile(uid, u?.username || "User", "ringing");
    // notify server to add the user into this call room
    if (typeof addUser === "function" && callId) {
      addUser(uid, u?.username || "User");
    } else {
      // fallback emit for compatibility
      socket.emit("call-add-user", { addedUserId: uid, addedUsername: u?.username || "User", inviterId: null, callId });
    }
    setShowUserList(false);
  };

  const handleCancelInvite = (uid) => {
    // cancel on UI and notify server
    removeInviteTile(uid);
    if (typeof cancelInvite === "function" && callId) {
      cancelInvite(uid);
    } else {
      socket.emit("call-invite-cancel", { userId: uid, callId });
    }
  };

  // ------------------------------------------------------------------
  // Socket listeners - only respond to events matching this callId
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!callId) return;

    const onInviteRinging = ({ userId: invitedId, username, inviterId, callId: evCallId }) => {
      if (evCallId !== callId) return;
      // create a tile for everyone in call
      addInviteTile(invitedId, username, "ringing");
    };

    const onInviteCancel = ({ userId: invitedId, callId: evCallId }) => {
      if (evCallId !== callId) return;
      updateInviteStatus(invitedId, "cancelled");
      setTimeout(() => removeInviteTile(invitedId), 2000);
    };

    const onInviteTimeout = ({ userId: invitedId, callId: evCallId }) => {
      if (evCallId !== callId) return;
      updateInviteStatus(invitedId, "no-answer");
      setTimeout(() => removeInviteTile(invitedId), 2500);
    };

    const onInviteTimeoutRemove = ({ userId: invitedId, callId: evCallId }) => {
      if (evCallId !== callId) return;
      removeInviteTile(invitedId);
    };

    const onInviteJoined = ({ userId: joinedId, username, callId: evCallId }) => {
      // some server variants send keys differently; handle both shapes
      const id = joinedId || (typeof userId !== "undefined" ? userId : null);
      if (evCallId !== callId) return;
      updateInviteStatus(id || joinedId || userId, "joined");
      setTimeout(() => removeInviteTile(id || joinedId || userId), 1500);
    };

    // Also some server emits 'call-user-joined' or 'call-invite-joined'
    const onCallUserJoined = (payload) => {
      const evCallId = payload.callId || payload.call_id || null;
      const id = payload.userId || payload.user_id || payload.userId;
      if (!evCallId || evCallId !== callId) return;
      updateInviteStatus(id, "joined");
      setTimeout(() => removeInviteTile(id), 1500);
    };

    // Attach listeners
    socket.on("call-invite-ringing", onInviteRinging);
    socket.on("call-invite-cancel", onInviteCancel);
    socket.on("call-invite-timeout", onInviteTimeout);
    socket.on("call-invite-timeout-remove", onInviteTimeoutRemove);
    socket.on("call-invite-joined", onInviteJoined);
    socket.on("call-user-joined", onCallUserJoined); // alternative

    return () => {
      socket.off("call-invite-ringing", onInviteRinging);
      socket.off("call-invite-cancel", onInviteCancel);
      socket.off("call-invite-timeout", onInviteTimeout);
      socket.off("call-invite-timeout-remove", onInviteTimeoutRemove);
      socket.off("call-invite-joined", onInviteJoined);
      socket.off("call-user-joined", onCallUserJoined);
    };
  }, [callId, userList]);

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------
  const remoteStreamsUsernames = remoteStreams.map((r) => {
    const u = userList.find((x) => String(x.id) === String(r.userId));
    return u?.username || `User ${r.userId}`;
  });

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  return (
    <div
      style={{
        display: callType ? "flex" : "none",
        position: "fixed",
        bottom: isMaximized ? "unset" : 20,
        right: isMaximized ? "unset" : 20,
        top: isMaximized ? 0 : "unset",
        left: isMaximized ? 0 : "unset",
        width: isMaximized ? "100%" : "520px",
        height: isMaximized ? "100%" : "320px",
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
          height: 42,
          background: "#2b2b2b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          color: "#fff",
        }}
      >
        <div>{callType === "video" ? "Call (Video)" : "Call (Audio)"}</div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowUserList((s) => !s)}
            style={{ background: "#444", color: "#fff", padding: "6px 8px", borderRadius: 6 }}
          >
            ➕ Add
          </button>

          <button onClick={onMinimize}>➖</button>
          <button onClick={onMaximize}>⬜</button>
          <button onClick={onClose} style={{ background: "#d93025", color: "#fff", borderRadius: 20, width: 36, height: 36 }}>
            ✖️
          </button>
        </div>
      </div>

      {/* User list popup */}
      {showUserList && (
        <div style={{ position: "absolute", top: 50, right: 12, width: 220, background: "#2b2b2b", padding: 10, borderRadius: 8, zIndex: 4000 }}>
          <div style={{ color: "#fff", fontWeight: 600 }}>Add user</div>
          <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto" }}>
            {userList.map((u) => (
              <div
                key={u.id}
                onClick={() => handleAddClick(u.id)}
                style={{ padding: 8, marginTop: 6, background: "#333", borderRadius: 6, color: "#fff", cursor: "pointer" }}
              >
                {u.username}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Pending invites + remote streams */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, padding: 8, background: "#000" }}>
        {/* pending invites */}
        {pendingInvites.map((p) => (
          <div key={p.id} style={{ background: "#121212", border: "1px solid #333", padding: 10, borderRadius: 8, color: "#fff", textAlign: "center" }}>
            <div style={{ fontWeight: 700 }}>{p.username}</div>
            <div style={{ marginTop: 8, color: statusColors[p.status] }}>
              {p.status === "ringing" && "📞 Ringing…"}
              {p.status === "rejected" && "❌ Rejected"}
              {p.status === "no-answer" && "👋 Buddy didn’t join"}
              {p.status === "joined" && "🟢 Joined"}
              {p.status === "cancelled" && "🚫 Cancelled"}
            </div>

            {p.status === "ringing" && (
              <button onClick={() => handleCancelInvite(p.id)} style={{ marginTop: 10, padding: "6px 10px", background: "#d93025", borderRadius: 6, color: "#fff" }}>
                Cancel
              </button>
            )}
          </div>
        ))}

        {/* remote streams */}
        {remoteStreams.map((r, idx) => (
          <div key={r.userId} style={{ position: "relative", background: "#000", borderRadius: 8, overflow: "hidden" }}>
            <video ref={(el) => (remoteVideoRefs.current[idx] = el)} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 6, color: "#fff", fontSize: 12 }}>
              {remoteStreamsUsernames[idx] || `User ${r.userId}`}
            </div>
          </div>
        ))}
      </div>

      {/* local small preview */}
      {callType === "video" && (
        <video ref={localVideoRef} muted autoPlay playsInline style={{ width: 120, height: 90, position: "absolute", bottom: 90, right: 20, borderRadius: 8, border: "2px solid #fff" }} />
      )}

      {/* controls */}
      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, background: "rgba(0,0,0,0.6)", padding: "8px 12px", borderRadius: 30 }}>
        <button onClick={onToggleMic} style={controlButtonStyle}>{isMuted ? "🔇" : "🎤"}</button>
        <button onClick={onToggleCam} style={controlButtonStyle}>{isVideoEnabled ? "📹" : "🚫"}</button>
        <button onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare} style={controlButtonStyle}>{isScreenSharing ? "🛑" : "🖥️"}</button>
        <button onClick={onEndCall} style={{ ...controlButtonStyle, background: "#d93025" }}>✖️</button>
      </div>
    </div>
  );
}

const controlButtonStyle = { background: "#444", border: "none", borderRadius: "50%", width: 44, height: 44, color: "#fff", cursor: "pointer" };
