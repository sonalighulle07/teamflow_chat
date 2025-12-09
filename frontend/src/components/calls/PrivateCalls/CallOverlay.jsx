// CallOverlay.jsx (updated)
import React, { useEffect, useRef, useState } from "react";
import socket from "../hooks/socket";
import { useSelector } from "react-redux";

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
  addUser,
  cancelInvite,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({}); // map userId -> element
  const [addUserList, setAddUserList] = useState([]);

  const userList = useSelector((state) => state.user.userList || []);
  const currentUser = useSelector((state) => state.user.currentUser);

  const [showUserList, setShowUserList] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);

  const statusColors = {
    ringing: "#ffd700",
    rejected: "#ff4444",
    "no-answer": "#ff8800",
    joined: "#00cc66",
    cancelled: "#d93025",
  };

  // safe resolver for usernames (always prefer Redux data)
  const resolveUsername = (uid) => {
    if (!uid && uid !== 0) return "User";
    const u = userList.find((x) => String(x.id) === String(uid));
    return u?.username || `User ${uid}`;
  };

  // Helpers to check if a user already has a live stream
  const hasLiveStream = (uid) => {
    return remoteStreams.some((r) => String(r.userId) === String(uid) && r.stream && r.stream.getTracks && r.stream.getTracks().length > 0);
  };

  // attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // attach remote streams into video refs keyed by userId (safely)
  useEffect(() => {
    remoteStreams.forEach((r) => {
      if (!r || !r.stream) return;
      if (!r.stream.getTracks || r.stream.getTracks().length === 0) return;

      const key = String(r.userId);
      const el = remoteVideoRefs.current[key];
      if (el && el.srcObject !== r.stream) {
        try {
          el.srcObject = r.stream;
        } catch (e) {
          // some browsers may throw if autoplay restrictions block this — ignore
        }
      }
    });
  }, [remoteStreams]);


  const handleAddBtnClick = (s) =>{

    socket.emit("in-call-users-request", { callId },async (resp) => {
      if (resp?.success && Array.isArray(resp.users))
      {
        const existingUserIds = resp.users.map((u) => String(u.userId));
        const filtered = userList.filter((u) => !existingUserIds.includes(String(u.id)) && String(u.id) !== String(currentUser.id));
        setAddUserList(filtered);
        setShowUserList(s);
      }
    }
    )
  }

  // helper: create invite tile (id = userId)
  const addInviteTile = (userId, username, status = "ringing", timeoutMs = 15000) => {
    const idStr = String(userId);
    // don't create invite if this user already has a live stream
    if (hasLiveStream(idStr)) return;

    setPendingInvites((prev) => {
      if (prev.some((p) => p.id === idStr)) return prev;

      const timeoutId = setTimeout(() => {
        setPendingInvites((prev2) => prev2.map((it) => (it.id === idStr ? { ...it, status: "no-answer" } : it)));
        setTimeout(() => {
          setPendingInvites((prev2) => prev2.filter((it) => it.id !== idStr));
          try {
            socket.emit("call-invite-timeout-remove", { userId, callId });
          } catch (e) {}
        }, 3000);
      }, timeoutMs);

      return [...prev, { id: idStr, username: username || "User", status, timeoutId }];
    });
  };

  const updateInviteStatus = (userId, status) => {
    const idStr = String(userId);
    setPendingInvites((prev) => prev.map((p) => (p.id === idStr ? { ...p, status } : p)));
    if (["joined", "rejected", "cancelled", "no-answer"].includes(status)) {
      setPendingInvites((prev) => {
        prev.forEach((p) => {
          if (p.id === idStr && p.timeoutId) {
            clearTimeout(p.timeoutId);
          }
        });
        return prev;
      });
    }
  };

  const removeInviteTile = (userId) => {
    const idStr = String(userId);
    setPendingInvites((prev) => {
      prev.forEach((p) => p.id === idStr && p.timeoutId && clearTimeout(p.timeoutId));
      return prev.filter((p) => p.id !== idStr);
    });
  };

  const handleAddUserClick = (uid) => {
    const u = userList.find((x) => String(x.id) === String(uid));
    const name = u?.username || `User ${uid}`;

    // add UI tile (will be discarded if the user has a live stream)
    addInviteTile(uid, name, "ringing");

    if (typeof addUser === "function" && callId) {
      addUser(uid, name);
    } else {
      socket.emit("call-add-user", { addedUserId: uid, addedUsername: name, inviterId: currentUser.id, callId });
    }
    setShowUserList(false);
  };

  const handleCancelInvite = (uid) => {
    removeInviteTile(uid);
    if (typeof cancelInvite === "function" && callId) {
      cancelInvite(uid);
    } else {
      socket.emit("call-invite-cancel", { userId: uid, callId });
    }
  };

  // Socket listeners for invite lifecycle (UI only)
  useEffect(() => {
    if (!callId) return;

    // server payloads can differ; normalize carefully and prefer Redux username
    const onInviteRinging = (payload = {}) => {
      // payload might be { userId } or { addedUserId } or full participant object
      const invitedId = payload.userId || payload.addedUserId || (payload.participant && payload.participant.userId);
      if (!invitedId) return;
      const evCallId = payload.callId || payload.call_id || payload.callId;
      if (evCallId !== callId) return;

      const name = resolveUsername(invitedId);
      addInviteTile(invitedId, name, "ringing");
    };

    const onInviteCancel = (payload = {}) => {
      const invitedId = payload.userId || payload.addedUserId;
      const evCallId = payload.callId || payload.call_id;
      if (!invitedId || evCallId !== callId) return;
      updateInviteStatus(invitedId, "cancelled");
      setTimeout(() => removeInviteTile(invitedId), 2000);
    };

    const onInviteTimeout = (payload = {}) => {
      const invitedId = payload.userId || payload.addedUserId;
      const evCallId = payload.callId || payload.call_id;
      if (!invitedId || evCallId !== callId) return;
      updateInviteStatus(invitedId, "no-answer");
      setTimeout(() => removeInviteTile(invitedId), 2500);
    };

    const onInviteTimeoutRemove = (payload = {}) => {
      const invitedId = payload.userId || payload.addedUserId;
      const evCallId = payload.callId || payload.call_id;
      if (!invitedId || evCallId !== callId) return;
      removeInviteTile(invitedId);
    };

  const onInviteJoined = (payload = {}) => {
      // payload may be { userId, username, callId } or nested shapes
      const joinedId = payload.userId || payload.user_id || (payload.newUser && payload.newUser.userId);
      const evCallId = payload.callId || payload.call_id;
      if (!joinedId || evCallId !== callId) return;

      // If user already has a live stream, ensure we don't show invite tile
      if (hasLiveStream(joinedId)) {
        removeInviteTile(joinedId);
        return;
      }

      updateInviteStatus(joinedId, "joined");
      setTimeout(() => removeInviteTile(joinedId), 1500);
    };

    const onCallUserJoined = (payload = {}) => {
      const evCallId = payload.callId || payload.call_id;
      const id = payload.userId || payload.user_id || (payload.newUser && payload.newUser.userId);
      if (!id || evCallId !== callId) return;

      if (hasLiveStream(id)) {
        removeInviteTile(id);
        return;
      }

      updateInviteStatus(id, "joined");
      setTimeout(() => removeInviteTile(id), 1500);
    };

    socket.on("call-invite-ringing", onInviteRinging);
    socket.on("call-invite-cancel", onInviteCancel);
    socket.on("call-invite-timeout", onInviteTimeout);
    socket.on("call-invite-timeout-remove", onInviteTimeoutRemove);
    socket.on("call-invite-joined", onInviteJoined);
    socket.on("call-user-joined", onCallUserJoined);

    return () => {
      socket.off("call-invite-ringing", onInviteRinging);
      socket.off("call-invite-cancel", onInviteCancel);
      socket.off("call-invite-timeout", onInviteTimeout);
      socket.off("call-invite-timeout-remove", onInviteTimeoutRemove);
      socket.off("call-invite-joined", onInviteJoined);
      socket.off("call-user-joined", onCallUserJoined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, userList, remoteStreams]);

  // UI pieces
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
      {/* Top bar */}
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
            onClick={() => handleAddBtnClick(!showUserList)}
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

      {/* Add user popup */}
      {showUserList && (
        <div style={{ position: "absolute", top: 50, right: 12, width: 220, background: "#2b2b2b", padding: 10, borderRadius: 8, zIndex: 4000 }}>
          <div style={{ color: "#fff", fontWeight: 600 }}>Add user</div>
          <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto" }}>
            {addUserList.map((u) => (
              <div
                key={u.id}
                onClick={() => handleAddUserClick(u.id)}
                style={{ padding: 8, marginTop: 6, background: "#333", borderRadius: 6, color: "#fff", cursor: "pointer" }}
              >
                {u.username}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid container: pending invites and remote streams separated (display:contents prevents reserved empty cells) */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, padding: 8, background: "#000" }}>
        <div style={{ display: "contents" }}>
          {/* pending invites (render first) */}
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
        </div>

        <div style={{ display: "contents" }}>
          {/* remote streams: only render when stream exists and has tracks */}
          {remoteStreams
            .filter((r) => r?.stream && r.stream.getTracks && r.stream.getTracks().length > 0)
            .map((r) => {
              const key = String(r.userId);
              return (
                <div key={key} style={{ position: "relative", background: "#000", borderRadius: 8, overflow: "hidden" }}>
                  <video
                    ref={(el) => {
                      // only set ref when element exists and stream exists
                      if (el && r.stream && r.stream.getTracks && r.stream.getTracks().length > 0) {
                        remoteVideoRefs.current[key] = el;
                        try {
                          if (el.srcObject !== r.stream) el.srcObject = r.stream;
                        } catch (e) {}
                      }
                    }}
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: 6, color: "#fff", fontSize: 12 }}>
                    {resolveUsername(r.userId)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* local small preview */}
      {callType === "video" && <video ref={ localVideoRef } muted autoPlay playsInline style={{ width: 120, height: 90, position: "absolute", bottom: 90, right: 20, borderRadius: 8, border: "2px solid #fff" }} />}

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
