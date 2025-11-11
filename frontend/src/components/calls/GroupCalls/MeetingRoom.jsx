// MeetingRoom.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMeeting } from "../hooks/useMeeting";
import PeerTile from "./PeerTile";
import MeetingControls from "./MeetingUtils/MeetingControls";
import { getPreviewStream, clearPreviewStream } from "../../../utils/streamStore"; // adjust path



export default function MeetingRoom() {
  const location = useLocation();
  const navigate = useNavigate();

  const userId = sessionStorage.getItem("userId");
  const code = sessionStorage.getItem("roomCode");

  // Pick up preview stream (from MediaConfirmation)
  const initialStream = getPreviewStream();
  useEffect(() => () => clearPreviewStream(), []);

  const teamId = location?.state?.teamId || null;

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
  } = useMeeting(userId, code, teamId);

  const [pinnedId, setPinnedId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Merge all video streams (local + remote)
  const allStreams = [
    ...(localStream ? [["local", localStream, isScreenSharing]] : []),
    ...Array.from(peers.entries()).map(([id, stream]) => [id, stream, false]),
  ];

  const handlePin = (id) => setPinnedId((prev) => (prev === id ? null : id));

  // Auto-pin the one who shares screen
  useEffect(() => {
    const sharer = allStreams.find(([id, , isSharing]) => id !== "local" && isSharing);
    if (sharer && pinnedId !== sharer[0]) setPinnedId(sharer[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allStreams.map(([id, , isSharing]) => [id, isSharing]))]);

  // ---- Join meeting flow ----
  useEffect(() => {
    let joined = false;

    const init = async () => {

      console.log("useMeeting variables in Meeting Room : "+isMuted, isVideoEnabled);


      if (joined) return;
      joined = true;

      const micOn = sessionStorage.getItem("micOn") === "true";
      const camOn = sessionStorage.getItem("cameraOn") === "true";

      console.log("Joining meeting with mic:", micOn, "cam:", camOn);

      try {
        await joinMeeting({ micEnabled: micOn, camEnabled: camOn });

        // If MediaConfirmation provided preview stream, use it to replace local tracks instantly
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

    return () => leaveMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Cleanup on unload ----
  useEffect(() => {
    const handleUnload = () => {
      try {
        sessionStorage.removeItem(`joined_${code}_${userId}`);
        const channel = new BroadcastChannel("meeting-session");
        channel.postMessage(`left_${code}_${userId}`);
        channel.close();
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handleUnload();
    });

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleUnload);
    };
  }, [code, userId]);

  // ---- Toast notifications ----
  useEffect(() => {
    const handler = (e) => {
      setToastMsg(e.detail?.message || "");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };
    window.addEventListener("meeting-toast", handler);
    return () => window.removeEventListener("meeting-toast", handler);
  }, []);

  // ---- Leave meeting ----
  const handleLeave = useCallback(() => {
    try {
      const channel = new BroadcastChannel("meeting-session");
      channel.postMessage(`left_${code}_${userId}`);
      channel.close();
    } catch (e) {
      // ignore
    }

    leaveMeeting();
    setToastMsg("You left the meeting");
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
      navigate(-1);
    }, 1000);
  }, [leaveMeeting, code, userId, navigate]);

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
      <div className="text-xs text-gray-500 text-center py-1">Room: {code}</div>

      <div className="flex-1 flex flex-col p-2 gap-2">
        {pinnedId ? (
          <>
            <div className="flex-1 relative" onClick={() => handlePin(pinnedId)}>
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

            {allStreams.filter(([id]) => id !== pinnedId).length > 0 && (
              <div className="flex gap-2 mt-2 h-32 overflow-x-auto">
                {allStreams
                  .filter(([id]) => id !== pinnedId)
                  .map(([id, stream]) => (
                    <div key={id} className="flex-none w-32 cursor-pointer" onClick={() => handlePin(id)}>
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
            {allStreams.map(([id, stream]) => (
              <div key={id} className="cursor-pointer" onClick={() => handlePin(id)}>
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
      </div>

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

      {showToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-purple-600 text-white rounded shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
