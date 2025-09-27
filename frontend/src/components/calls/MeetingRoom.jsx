import React, { useEffect } from "react";
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

  useEffect(() => {
    joinMeeting();
    return leaveMeeting;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
      <div className="text-xs text-gray-500 text-center py-1">
        Room: {code}
      </div>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
        {localStream && <PeerTile stream={localStream} label="You" isLocal />}
        {Array.from(peers.entries()).map(([peerId, stream]) => (
          <PeerTile key={peerId} stream={stream} label={peerId} />
        ))}

        {peers.size === 0 && !localStream && (
          <div className="text-center text-gray-400 col-span-full">
            Waiting for others to join…
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