import React, { useEffect } from "react";
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
})
{
  return (
    <div className="flex justify-center gap-4 p-4 bg-gray-800">
      {/* Mic Button */}
      <button
        onClick={onToggleMic}
        className={`p-3 rounded-full ${isMuted ? "bg-red-600" : "bg-green-600"} hover:opacity-80`}
      >
        {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
      </button>

      {/* Cam Button */}
      <button
        onClick={onToggleCam}
        className={`p-3 rounded-full ${isVideoEnabled ? "bg-green-600" : "bg-red-600"} hover:opacity-80`}
      >
        { isVideoEnabled ? <FaVideo /> : <FaVideoSlash /> }
      </button>

    {/* Screen Share */} 
    <button onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare} className="p-3 rounded-full bg-blue-600 hover:opacity-80" > {isScreenSharing ? "🛑" : "🖥️"} </button>


      {/* Leave */}
      <button onClick={onLeave} className="text-red-500 p-3 rounded-full border border-red-500 hover:bg-red-500 hover:text-white">
        Leave
      </button>
    </div>
  );
}
