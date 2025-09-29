import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMeeting } from "./hooks/useMeeting";
import PeerTile from "./PeerTile";
import MeetingControls from "./MeetingControls";

export default function MeetingRoom({ userId }) {
  const { code } = useParams();
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

  // Auto-pin local if sharing
  useEffect(() => {
    if (isScreenSharing) setPinnedId("local");
  }, [isScreenSharing]);

  useEffect(() => {
    joinMeeting();
    return leaveMeeting;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Combine streams
  const allStreams = [
    ...(localStream ? [["local", localStream]] : []),
    ...Array.from(peers.entries()),
  ];

  const handlePin = (id) => {
    setPinnedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
      <div className="text-xs text-gray-500 text-center py-1">Room: {code}</div>

      <div className="flex-1 flex flex-col p-2 gap-2">
        {pinnedId ? (
          <>
            {/* Pinned stream */}
            <div className="flex-1 relative" onClick={() => handlePin(pinnedId)}>
              {allStreams
                .filter(([id]) => id === pinnedId)
                .map(([id, stream]) => (
                  <PeerTile
                    key={id}
                    stream={stream}
                    label={id === "local" ? "You" : id}
                    isLocal={id === "local"}
                  />
                ))}
            </div>

            {/* Other streams in a horizontal row */}
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
                      />
                    </div>
                  ))}
              </div>
            )}
          </>
        ) : (
          // Default grid layout
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
            {allStreams.map(([id, stream]) => (
              <div key={id} className="cursor-pointer" onClick={() => handlePin(id)}>
                <PeerTile
                  stream={stream}
                  label={id === "local" ? "You" : id}
                  isLocal={id === "local"}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <MeetingControls
        onLeave={leaveMeeting}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
      />
    </div>
  );
}
