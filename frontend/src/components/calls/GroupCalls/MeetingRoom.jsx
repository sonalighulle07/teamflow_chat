// ✅ MeetingRoom.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMeeting } from "../hooks/useMeeting";
import PeerTile from "./PeerTile";
import MeetingControls from "./MeetingUtils/MeetingControls";
import { getPreviewStream, clearPreviewStream } from "../../../utils/streamStore";
import socket from "../hooks/socket"; // ✅ your existing socket instance

export default function MeetingRoom() {
  const location = useLocation();
  const navigate = useNavigate();

  // ---- Basic session info ----
  const userId = sessionStorage.getItem("userId");
  const code = sessionStorage.getItem("roomCode");
  const teamId = location?.state?.teamId || null;

  // ---- Grab pre-join media preview if available ----
  const initialStream = getPreviewStream();
  // useEffect(() => {
  //   return () => clearPreviewStream();
  // }, []);

  // ---- Meeting hook (WebRTC + signaling) ----
  const {
    peers,
    localStream,
    joinMeeting,
    leaveMeeting,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    userRefs
  } = useMeeting(userId, code, teamId);

  // ---- UI states ----
  const [pinnedId, setPinnedId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // ---- Combine all streams (local + remote) ----
  // ✅ Combine all streams with labels from userRefs
const allStreams = [
  ...(localStream
    ? [[userId, localStream, isScreenSharing, "You"]]
    : []),
  ...Array.from(peers.entries()).map(([id, stream]) => [
    id,
    stream,
    false,
    // get label from ref
    userRefs.current.get(id) || `User ${id}`,
  ]),
];


  // ---- Join meeting flow ----
  useEffect(() => {
    const init = async () => {
      try {
        const micOn = sessionStorage.getItem("micOn") === "true";
        const camOn = sessionStorage.getItem("cameraOn") === "true";

        console.log("Joining meeting with mic:", micOn, "cam:", camOn);
        await joinMeeting({ micEnabled: micOn, camEnabled: camOn });

        if (initialStream) {
          const tracks = initialStream.getTracks();
          const newStream = new MediaStream(tracks);
          newStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
          newStream.getVideoTracks().forEach((t) => (t.enabled = camOn));
        }
      } catch (err) {
        console.error("❌ joinMeeting failed:", err);
      }
    };

    init();

    // Cleanup when component unmounts
    return () => {
      console.log("Unmounting: leaving meeting");
      socket.emit("leave-room", { roomCode: code, userId });
      leaveMeeting();
    };
  }, []); // eslint-disable-line

  // ---- Leave meeting manually ----
  const handleLeave = useCallback(() => {
    try {
      socket.emit("leave-room", { roomCode: code, userId });
      leaveMeeting();

      setToastMsg("You left the meeting");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate(-1);
      }, 1000);
    } catch (err) {
      console.error("Leave meeting error:", err);
    }
  }, [leaveMeeting, code, userId, navigate]);

  // ---- Handle tab/window close ----
  useEffect(() => {
    const handleUnload = () => {
      try {
        console.log("Window closing — emitting leave-room");
        socket.emit("leave-room", { roomCode: code, userId });
        leaveMeeting();
      } catch (err) {
        console.warn("Unload leave error:", err);
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("unload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("unload", handleUnload);
    };
  }, [code, userId, leaveMeeting]);

  // ---- Handle pinning ----
  const handlePin = useCallback((id) => {
    setPinnedId((prev) => (prev === id ? null : id));
  }, []);

  // ---- Toast listener ----
  useEffect(() => {
    const handler = (e) => {
      setToastMsg(e.detail?.message || "");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };
    window.addEventListener("meeting-toast", handler);
    return () => window.removeEventListener("meeting-toast", handler);
  }, []);

  // ---- Render ----
  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
      {/* Room Header */}
      <div className="text-xs text-gray-400 text-center py-1">
        Room: {code}
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
        {pinnedId ? (
          <>
            <div
              className="flex-1 relative"
              onClick={() => handlePin(pinnedId)}
            >
              {allStreams
                .filter(([id]) => id === pinnedId)
                .map(([id, stream]) => (
                  <PeerTile
                    key={id}
                    stream={stream}
                    label={id === "local" ? "You" : id}
                    isLocal={id === "local"}
                    isPinned
                    onDoubleClick={() => handlePin(id)}
                  />
                ))}
            </div>

            {/* Thumbnails below */}
            {allStreams.filter(([id]) => id !== pinnedId).length > 0 && (
              <div className="flex gap-2 mt-2 h-32 overflow-x-auto">
                {allStreams
                  .filter(([id]) => id !== pinnedId)
                  .map(([id, stream]) => (
                    <div
                      key={id}
                      className="flex-none w-32 cursor-pointer"
                      onClick={() => handlePin(id)}
                    >
                      <PeerTile
                        stream={stream}
                        label={id === "local" ? "You" : id}
                        isLocal={id === "local"}
                        onDoubleClick={() => handlePin(id)}
                      />
                    </div>
                  ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
            {allStreams.map(([id, stream, , label]) => (
  <div
    key={id}
    className="cursor-pointer"
    onClick={() => handlePin(id)}
  >
    <PeerTile
      stream={stream}
      label={label}
      isLocal={id === userId}
      onDoubleClick={() => handlePin(id)}
    />
  </div>
))}

          </div>
        )}
      </div>

      {/* Controls */}
      <MeetingControls
        onLeave={handleLeave}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
      />

      {/* Toast */}
      {showToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-purple-600 text-white rounded shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
