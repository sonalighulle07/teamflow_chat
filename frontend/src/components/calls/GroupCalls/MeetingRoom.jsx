import React, { useEffect, useState, useCallback, useRef } from "react";
import { useMeeting } from "../hooks/useMeeting";
import PeerTile from "./PeerTile";
import MeetingControls from "./MeetingUtils/MeetingControls";
import Draggable from "react-draggable";

export default function MeetingRoom() {
  const userId = sessionStorage.getItem("userId");
  const username = sessionStorage.getItem("username") || "You";
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

  const [pinnedId, setPinnedId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Unified stream list
  const allStreams = [
    ...(localStream ? [["local", localStream, username, isScreenSharing]] : []),
    ...Array.from(peers.entries()).map(([id, peer]) => [
      id,
      peer.stream,
      peer.username || id,
      peer.isScreenSharing || false,
    ]),
  ];

  // Auto-pin the sharer’s screen for other users (not the sharer)
  useEffect(() => {
    const sharer = allStreams.find(
      ([id, , , isSharing]) => id !== "local" && isSharing
    );
    if (sharer && pinnedId !== sharer[0]) {
      setPinnedId(sharer[0]);
    } else if (!sharer && pinnedId && pinnedId !== "local") {
      setPinnedId(null);
    }
  }, [JSON.stringify(allStreams.map((s) => [s[0], s[3]]))]);

  const handlePin = (id) => {
    setPinnedId((prev) => (prev === id ? null : id));
  };

  // Join on mount
  useEffect(() => {
    const initialMic = sessionStorage.getItem("micOn") === "true";
    const initialCam = sessionStorage.getItem("cameraOn") === "true";
    joinMeeting({ micEnabled: initialMic, camEnabled: initialCam });
    return () => leaveMeeting();
  }, []);

  // Toast system
  useEffect(() => {
    const handleToast = (e) => {
      setToastMsg(e.detail.message);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };
    window.addEventListener("meeting-toast", handleToast);
    return () => window.removeEventListener("meeting-toast", handleToast);
  }, []);

  const handleLeave = useCallback(() => {
    leaveMeeting();
    setToastMsg("You left the meeting");
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      window.close();
    }, 1000);
  }, [leaveMeeting]);

  const pinnedStream = pinnedId
    ? allStreams.find(([id]) => id === pinnedId)
    : null;

  const otherStreams = allStreams.filter(([id]) => id !== pinnedId);
  const tileRefs = useRef({});
  allStreams.forEach(([id]) => {
    if (!tileRefs.current[id]) tileRefs.current[id] = React.createRef();
  });

  const isGridView = !pinnedStream;

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col relative overflow-hidden">
      <div className="text-xs text-gray-400 text-center py-1">Room: {code}</div>

      {/* MAIN AREA */}
      <div className="flex-1 relative">
        {isGridView ? (
          // 🟩 GRID MODE
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2 overflow-y-auto h-full">
            {allStreams.map(([id, stream, label]) => (
              <div
                key={id}
                className="cursor-pointer"
                onClick={() => handlePin(id)}
              >
                <PeerTile
                  stream={stream}
                  label={label}
                  isLocal={id === "local"}
                />
              </div>
            ))}
          </div>
        ) : (
          // 🟦 PINNED + STACKED MODE
          <>
            {pinnedStream && (
              <div className="absolute inset-0 z-10">
                <PeerTile
                  stream={pinnedStream[1]}
                  label={pinnedStream[2]}
                  isLocal={pinnedStream[0] === "local"}
                  isPinned
                />
              </div>
            )}

            {/* 🟨 STACKED DRAGGABLE FEED */}
            <div className="absolute top-4 right-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto z-20">
              {otherStreams.map(([id, stream, label]) => (
                <Draggable key={id} nodeRef={tileRefs.current[id]} bounds="parent">
                  <div
                    ref={tileRefs.current[id]}
                    className="w-48 h-32 bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-400 cursor-pointer"
                    onClick={() => handlePin(id)}
                  >
                    <PeerTile
                      stream={stream}
                      label={label}
                      isLocal={id === "local"}
                    />
                  </div>
                </Draggable>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
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
      </div>

      {showToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-purple-600 text-white rounded shadow-lg animate-fade-in z-50">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
