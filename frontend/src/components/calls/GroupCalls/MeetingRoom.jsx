// unchanged imports
import React, { useEffect, useState, useCallback } from "react";
import { useMeeting } from "../hooks/useMeeting";
import PeerTile from "./PeerTile";
import MeetingControls from "./MeetingUtils/MeetingControls";

export default function MeetingRoom() {
  const [pinnedId, setPinnedId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const userId = sessionStorage.getItem("userId");
  const code = sessionStorage.getItem("roomCode");

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
  } = useMeeting(userId, code);

  const allStreams = [
    ...(localStream ? [["local", localStream]] : []),
    ...Array.from(peers.entries()),
  ];

  const handlePin = (id) => setPinnedId((prev) => (prev === id ? null : id));

  useEffect(() => {
    const micEnabled = sessionStorage.getItem("micOn") === "true";
    const camEnabled = sessionStorage.getItem("cameraOn") === "true";
    joinMeeting({ micEnabled, camEnabled });
    return () => leaveMeeting();
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      sessionStorage.removeItem(`joined_${code}_${userId}`);
      const channel = new BroadcastChannel("meeting-session");
      channel.postMessage(`left_${code}_${userId}`);
      channel.close();
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        handleUnload();
      }
    });

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleUnload);
    };
  }, [code, userId]);

  const handleLeave = useCallback(() => {
    const channel = new BroadcastChannel("meeting-session");
    channel.postMessage(`left_${code}_${userId}`);
    channel.close();

    leaveMeeting();
    setToastMsg("You left the meeting");
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
      window.location.href = "/";
    }, 1000);
  }, [leaveMeeting]);

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
                  <PeerTile key={id} stream={stream} label={id === "local" ? "You" : id} isLocal={id === "local"} />
                ))}
            </div>

            {allStreams.filter(([id]) => id !== pinnedId).length > 0 && (
              <div className="flex gap-2 mt-2 h-32 overflow-x-auto">
                {allStreams
                  .filter(([id]) => id !== pinnedId)
                  .map(([id, stream]) => (
                    <div key={id} className="flex-none w-32 cursor-pointer" onClick={() => handlePin(id)}>
                      <PeerTile stream={stream} label={id === "local" ? "You" : id} isLocal={id === "local"} />
                    </div>
                  ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
            {allStreams.map(([id, stream]) => (
              <div key={id} className="cursor-pointer" onClick={() => handlePin(id)}>
                <PeerTile stream={stream} label={id === "local" ? "You" : id} isLocal={id === "local"} />
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

