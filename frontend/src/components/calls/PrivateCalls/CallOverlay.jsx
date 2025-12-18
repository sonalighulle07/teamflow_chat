// CallOverlay.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaDesktop,
  FaStop,
  FaTimes,
  FaUserPlus,
  FaWindowMinimize,
  FaWindowMaximize,
} from "react-icons/fa";
import socket from "../hooks/socket";
import { useSelector } from "react-redux";

export default function CallOverlay({
  callId,
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
  addUser,
  cancelInvite,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const [addUserList, setAddUserList] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);

  const userList = useSelector((state) => state.user.userList || []);
  const currentUser = useSelector((state) => state.user.currentUser);

  const statusColors = {
    ringing: "text-yellow-400",
    rejected: "text-red-500",
    "no-answer": "text-orange-400",
    joined: "text-green-500",
    cancelled: "text-red-600",
  };

  const resolveUsername = (uid) => {
    if (!uid && uid !== 0) return "User";
    const u = userList.find((x) => String(x.id) === String(uid));
    return u?.username || `User ${uid}`;
  };

  const hasLiveStream = (uid) => {
    return remoteStreams.some(
      (r) =>
        String(r.userId) === String(uid) &&
        r.stream &&
        r.stream.getTracks &&
        r.stream.getTracks().length > 0
    );
  };

  useEffect(() => {
    if (localVideoRef.current && localStream)
      localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreams.forEach((r) => {
      if (
        !r?.stream ||
        !r.stream.getTracks ||
        r.stream.getTracks().length === 0
      )
        return;
      const key = String(r.userId);
      const el = remoteVideoRefs.current[key];
      if (el && el.srcObject !== r.stream) el.srcObject = r.stream;
    });
  }, [remoteStreams]);

  const handleAddBtnClick = () => {
    socket.emit("in-call-users-request", { callId }, (resp) => {
      if (resp?.success && Array.isArray(resp.users)) {
        const existingUserIds = resp.users.map((u) => String(u.userId));
        const filtered = userList.filter(
          (u) =>
            !existingUserIds.includes(String(u.id)) &&
            String(u.id) !== String(currentUser.id)
        );
        setAddUserList(filtered);
        setShowUserList(!showUserList);
      }
    });
  };

  const addInviteTile = (
    userId,
    username,
    status = "ringing",
    timeoutMs = 15000
  ) => {
    const idStr = String(userId);
    if (hasLiveStream(idStr)) return;

    setPendingInvites((prev) => {
      if (prev.some((p) => p.id === idStr)) return prev;
      const timeoutId = setTimeout(() => {
        setPendingInvites((prev2) =>
          prev2.map((it) =>
            it.id === idStr ? { ...it, status: "no-answer" } : it
          )
        );
        setTimeout(() => {
          setPendingInvites((prev2) => prev2.filter((it) => it.id !== idStr));
          try {
            socket.emit("call-invite-timeout-remove", { userId, callId });
          } catch (e) {}
        }, 3000);
      }, timeoutMs);

      return [
        ...prev,
        { id: idStr, username: username || "User", status, timeoutId },
      ];
    });
  };

  const updateInviteStatus = (userId, status) => {
    const idStr = String(userId);
    setPendingInvites((prev) =>
      prev.map((p) => (p.id === idStr ? { ...p, status } : p))
    );
    if (["joined", "rejected", "cancelled", "no-answer"].includes(status)) {
      setPendingInvites((prev) => {
        prev.forEach(
          (p) => p.id === idStr && p.timeoutId && clearTimeout(p.timeoutId)
        );
        return prev;
      });
    }
  };

  const removeInviteTile = (userId) => {
    const idStr = String(userId);
    setPendingInvites((prev) => {
      prev.forEach(
        (p) => p.id === idStr && p.timeoutId && clearTimeout(p.timeoutId)
      );
      return prev.filter((p) => p.id !== idStr);
    });
  };

  const handleAddUserClick = (uid) => {
    const u = userList.find((x) => String(x.id) === String(uid));
    const name = u?.username || `User ${uid}`;
    addInviteTile(uid, name, "ringing");

    if (typeof addUser === "function" && callId) addUser(uid, name);
    else
      socket.emit("call-add-user", {
        addedUserId: uid,
        addedUsername: name,
        inviterId: currentUser.id,
        callId,
      });

    setShowUserList(false);
  };

  const handleCancelInvite = (uid) => {
    removeInviteTile(uid);
    if (typeof cancelInvite === "function" && callId) cancelInvite(uid);
    else socket.emit("call-invite-cancel", { userId: uid, callId });
  };

  const getGridCols = () => {
    const count = remoteStreams.length;
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    return "grid-cols-3";
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex flex-col rounded-lg shadow-xl overflow-hidden
      bg-black ${isMaximized ? "w-full h-full" : "w-[500px] h-[300px]"}`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between h-11 px-4 bg-gray-900 text-white">
        <div className="flex items-center gap-2 font-semibold">
          {callType === "video" ? <FaVideo /> : <FaMicrophone />}
          <span className="text-sm">
            {callType === "video" ? "Video Call" : "Audio Call"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddBtnClick}
            className="flex items-center gap-1  mt-2 px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs"
          >
            <FaUserPlus /> Add
          </button>
          <button
            onClick={onMinimize}
            className="px-2 py-1 rounded hover:bg-gray-700 text-xs"
          >
            <FaWindowMinimize />
          </button>
          <button
            onClick={onMaximize}
            className="px-2 py-1 rounded hover:bg-gray-700 text-xs mt-2"
          >
            <FaWindowMaximize />
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 flex mt-2 items-center justify-center bg-red-600 rounded hover:bg-red-500 text-xs"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Remote Streams */}
      <div className={`flex-1 grid ${getGridCols()} gap-2 p-2 relative`}>
        {pendingInvites.map((p) => (
          <div
            key={p.id}
            className="absolute top-3 left-3 bg-gray-800 border border-gray-600 rounded p-1 flex flex-col items-center shadow-md text-xs"
          >
            <div className="font-semibold text-white">{p.username}</div>
            <div className={`${statusColors[p.status]} text-[10px]`}>
              {p.status === "ringing" && "📞 Ringing…"}
              {p.status === "rejected" && "❌ Rejected"}
              {p.status === "no-answer" && "👋 Didn’t join"}
              {p.status === "joined" && "🟢 Joined"}
              {p.status === "cancelled" && "🚫 Cancelled"}
            </div>
            {p.status === "ringing" && (
              <button
                onClick={() => handleCancelInvite(p.id)}
                className="mt-1 px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-[10px]"
              >
                Cancel
              </button>
            )}
          </div>
        ))}

        {remoteStreams
          .filter((r) => r?.stream && r.stream.getTracks?.().length > 0)
          .map((r) => {
            const key = String(r.userId);
            return (
              <div
                key={key}
                className="relative w-full h-full bg-black rounded overflow-hidden flex items-center justify-center"
              >
                <video
                  ref={(el) => {
                    if (el && r.stream) {
                      remoteVideoRefs.current[key] = el;
                      if (el.srcObject !== r.stream) el.srcObject = r.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover bg-black"
                />
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 px-1 py-0.5 rounded text-white text-[10px]">
                  {resolveUsername(r.userId)}
                </div>
              </div>
            );
          })}
      </div>

      {/* Local Video */}
      {callType === "video" && localStream && (
        <video
          ref={localVideoRef}
          muted
          autoPlay
          playsInline
          className="w-28 h-24 absolute bottom-3 right-3 rounded border border-white shadow-md object-cover"
        />
      )}

      {/* Controls */}
      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-3 bg-black bg-opacity-80 p-2 rounded-full shadow-md">
        <button
          onClick={onToggleMic}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white text-lg"
        >
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>

        {callType === "video" && (
          <button
            onClick={onToggleCam}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white text-lg"
          >
            {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
          </button>
        )}

        <button
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white text-lg"
        >
          {isScreenSharing ? <FaStop /> : <FaDesktop />}
        </button>

        <button
          onClick={onEndCall}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white text-lg"
        >
          <FaTimes />
        </button>
      </div>

      {/* Add User Popup */}
      {showUserList && (
        <div className="absolute top-14 right-3 w-56 bg-gray-800 p-3 rounded shadow-lg z-50">
          <div className="text-white font-semibold mb-2 text-sm">Add User</div>
          <div className="max-h-56 overflow-y-auto">
            {addUserList.map((u) => (
              <div
                key={u.id}
                onClick={() => handleAddUserClick(u.id)}
                className="p-2 my-1 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 text-white text-sm"
              >
                {u.username}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
