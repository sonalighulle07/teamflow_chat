// MeetingRoom.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate,useParams } from "react-router-dom";
import { useMeeting } from "../hooks/useMeeting";
import PeerTile from "./PeerTile";
import MeetingControls from "./MeetingUtils/MeetingControls";


export default function MeetingRoom() {
  const location = useLocation();
  const navigate = useNavigate();

  const userId = JSON.parse(sessionStorage.getItem("chatUser"))?.id;
  const { credentials } = useParams();

  console.log("userID:",userId);

  console.log("param credentials:",credentials);
  const code = credentials?.split("-")[2] || null;
  console.log("Room Code:", code);

  // meeting_code = "team-121-cc100426"

  const teamId = credentials.split("-")[1]; // 👉 "121"

  console.log("Team ID:", teamId);


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

  const [ready, setReady] = useState(false);
  const [pinnedId, setPinnedId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const allStreams = [
    ...(localStream ? [[userId, localStream, isScreenSharing, "You"]] : []),
    ...Array.from(peers.entries()).map(([id, stream]) => {
      const name = userRefs?.current?.get(id) || `User ${id}`;
      return [id, stream, false, name];
    })
  ];

  // --------------------------------------------------------
  // 🚀 WAIT FOR PREVIEW STREAM BEFORE JOINING MEETING
  // --------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const start = async () => {
      console.log("MeetingRoom loaded → waiting for preview stream...");


      // Initial mic/cam state
      const initialMic = sessionStorage.getItem("micOn") === "true";
      const initialCam = sessionStorage.getItem("cameraOn") === "true";

      try {
        await joinMeeting({ 
          micEnabled: initialMic, 
          camEnabled: initialCam,
        });

        if (!mounted) return;
        setReady(true);

      } catch (err) {
        console.error("Join meeting failed:", err);
      }
    };

    start();   

    return () => {
      mounted = false;
      leaveMeeting();
    };
  }, []);

  // --------------------------------------------------------
  // EXIT MEETING
  // --------------------------------------------------------
  const handleLeave = useCallback(() => {
    try {
      
      leaveMeeting();
      setToastMsg("You left the meeting");
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
        navigate(-1);
      }, 1000);
    } catch (err) {
      console.error("Leave error:", err);
    }
  }, [leaveMeeting, code, userId, navigate]);

  // --------------------------------------------------------
  // Leave on tab close
  // --------------------------------------------------------
  useEffect(() => {
    const handleUnload = () => {
        leaveMeeting();
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("unload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("unload", handleUnload);
    };
  }, [code, userId, leaveMeeting]);

  // --------------------------------------------------------
  // TOAST SYSTEM
  // --------------------------------------------------------
  useEffect(() => {
    const handler = (e) => {
      setToastMsg(e.detail?.message || "");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };

    window.addEventListener("meeting-toast", handler);
    return () => window.removeEventListener("meeting-toast", handler);
  }, []);

  const handlePin = (id) => {
    setPinnedId((prev) => (prev === id ? null : id));
  };

  // --------------------------------------------------------
  // BLOCK UI UNTIL JOINING COMPLETES
  // --------------------------------------------------------
  if (!ready) {
    return (
      <div className="h-screen w-screen bg-black text-white flex items-center justify-center text-lg">
        Joining meeting...
      </div>
    );
  }

  // --------------------------------------------------------
  // MAIN UI
  // --------------------------------------------------------
 return (
  <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">

    <div className="text-xs text-gray-400 text-center py-1">
      Room: {code}
    </div>

    {/* MAIN VIDEO AREA */}
    <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden relative z-10">

      {pinnedId ? (
        <>
          {/* PINNED VIEW */}
          <div
            className="flex-1 relative overflow-hidden rounded-xl border border-gray-700"
            onClick={() => handlePin(pinnedId)}
          >
            {allStreams
              .filter(([id]) => id === pinnedId)
              .map(([id, stream, , label]) => (
                <PeerTile
                  key={id}
                  stream={stream}
                  label={label}
                  isLocal={id === userId}
                  isPinned
                  className="h-full w-full"
                  onDoubleClick={() => handlePin(id)}
                />
              ))}
          </div>

          {/* OTHER THUMBNAILS */}
          {allStreams.filter(([id]) => id !== pinnedId).length > 0 && (
            <div className="flex gap-2 mt-2 h-32 overflow-x-auto">
              {allStreams
                .filter(([id]) => id !== pinnedId)
                .map(([id, stream, , label]) => (
                  <div
                    key={id}
                    className="flex-none w-32 cursor-pointer"
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

        </>
      ) : (
        // GRID MODE
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 overflow-hidden">
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

    {/* CONTROLS - ALWAYS ON TOP */}
    <div className="relative z-20 bg-black/40 backdrop-blur-md">
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

    {/* TOAST */}
    {showToast && (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-purple-600 text-white rounded shadow-lg z-[999]">
        {toastMsg}
      </div>
    )}
  </div>
);

}
