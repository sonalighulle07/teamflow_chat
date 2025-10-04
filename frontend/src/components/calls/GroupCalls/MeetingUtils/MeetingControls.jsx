import React from "react";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";

export default function MeetingControls({
  onLeave,
  onToggleMic,
  onToggleCam,
  onStartScreenShare,
  onStopScreenShare,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
}) {
  return (
    <div className="flex justify-center gap-4 p-4 bg-gray-800">
      <button onClick={onToggleMic}
       className={`p-3 rounded-full ${isMuted ? "bg-green-600" : "bg-red-600"} hover:opacity-80`}
      >{isMuted ? <FaMicrophone /> : <FaMicrophoneSlash />}</button>
      <button onClick={onToggleCam}
       className={`p-3 rounded-full ${isVideoEnabled ? "bg-green-600" : "bg-red-600"} hover:opacity-80`}
      >{isVideoEnabled ?<FaVideo /> : <FaVideoSlash />}</button>
      <button onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}>
        {isScreenSharing ? "🛑" : "🖥️"}
      </button>
      <button onClick={onLeave} className="text-red-500">
        Leave
      </button>
    </div>
  );
}

