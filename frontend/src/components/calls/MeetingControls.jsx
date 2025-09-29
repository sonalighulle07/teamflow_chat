import React from "react";

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
      <button onClick={onToggleMic}>{isMuted ? "🔇" : "🎤"}</button>
      <button onClick={onToggleCam}>{isVideoEnabled ? "📹" : "🚫"}</button>
      <button onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}>
        {isScreenSharing ? "🛑" : "🖥️"}
      </button>
      <button onClick={onLeave} className="text-red-500">
        Leave
      </button>
    </div>
  );
}

