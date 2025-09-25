import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMeeting } from "../../utils/meetingUtils";
import { useCall } from "./hooks/useCall";
import CallOverlay from "./CallOverlay";

export default function MeetingRoom({ userId }) {
  const { code } = useParams();
  const [meeting, setMeeting] = useState(null);
  const call = useCall(userId);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const data = await getMeeting(code);
      if (!isMounted) return;

      setMeeting(data);
      call.joinMeetingRoom(code);

      // Wait for local media before starting call
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: data.type === "video",
      });

      if (!isMounted) return;
      call.startCall(data.type, { id: "meeting", name: data.title });
    }

    init();

    return () => {
      isMounted = false;
      call.cleanup();
    };
  }, [code]);

  if (!meeting) return <div className="p-4 text-white">Loading meeting...</div>;

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h2 className="text-xl font-semibold mb-2">{meeting.title}</h2>
      <p className="text-sm text-gray-300 mb-4">
        Scheduled at {new Date(meeting.scheduled_at).toLocaleString()}
      </p>

      {call.callState.type && (
        <CallOverlay
          callType={call.callState.type}
          localStream={call.localStream}
          remoteStreams={call.remoteStreams}
          onEndCall={call.endCall}
          onToggleMic={call.toggleMic}
          onToggleCam={call.toggleCam}
          onStartScreenShare={call.startScreenShare}
          onStopScreenShare={call.stopScreenShare}
          isScreenSharing={call.isScreenSharing}
          isMuted={call.isMuted}
          isVideoEnabled={call.isVideoEnabled}
          onMinimize={() => call.setIsMaximized(false)}
          onMaximize={() => call.setIsMaximized(true)}
          onClose={call.endCall}
          isMaximized={call.isMaximized}
        />
      )}
    </div>
  );
}

