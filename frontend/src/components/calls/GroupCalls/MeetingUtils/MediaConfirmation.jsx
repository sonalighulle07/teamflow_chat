import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import socket from "../../hooks/socket";
// import { setPreviewStream } from "../../../../utils/streamStore";

const MediaConfirmation = ({ userId, currentUser }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const { code } = useParams();
  const activeUser =
    sessionStorage.getItem("chatUser") ? JSON.parse(sessionStorage.getItem("chatUser")) : null;

  // --- Clean up broadcast session ---
  useEffect(() => {
    const channel = new BroadcastChannel("meeting-session");
    channel.onmessage = (e) => {
      if (e.data === `left_${code}_${userId}`) {
        sessionStorage.removeItem(`joined_${code}_${userId}`);
      }
    };
    return () => channel.close();
  }, [code, userId]);

  // --- Initialize preview ---
  useEffect(() => {
    const initPreview = async () => {
      try {
        const constraints = {};
        if (micOn) constraints.audio = true;
        if (cameraOn) constraints.video = { width: 640, height: 480 };

        if (!constraints.audio && !constraints.video) {
          setStream(null);
          if (videoRef.current) videoRef.current.srcObject = null;
          return;
        }

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    initPreview();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, micOn]);

  // --- Force video binding and playback ---
  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        try {
          videoRef.current.load(); // ✅ Forces refresh of stream
          await videoRef.current.play();
        } catch (err) {
          console.warn("Video play error:", err);
        }
      }
    };
    playVideo();
  }, [stream]);

  // --- Toggle mic ---
  const toggleMic = async () => {
    const next = !micOn;
    setMicOn(next);
    sessionStorage.setItem("micOn", next.toString());
  };

  // --- Toggle cam ---
  const toggleCam = async () => {
    const next = !cameraOn;
    setCameraOn(next);
    sessionStorage.setItem("cameraOn", next.toString());
  };

  // --- Join meeting ---
const handleJoin = () => {
  if (joining) return;
  setJoining(true);

  const teamMatch = code.match(/^team-(\d+)-/);
  const teamId = teamMatch ? parseInt(teamMatch[1]) : null;
  if (!teamId) {
    console.error("❌ Invalid meeting code:", code);
    setJoining(false);
    return;
  }

  socket.emit("startMeeting", {
    teamId,
    startedBy: activeUser.id,
    meetingCode: code,
  });

  const sessionKey = `joined_${code}_${userId}`;
  socket.emit("joinRoom", { userId, roomCode: code }, (response) => {
    console.log("✅ joinRoom ACK:", response);
    if (response?.success) {
      sessionStorage.setItem(sessionKey, "true");
      sessionStorage.setItem("userId", userId);
      sessionStorage.setItem("roomCode", code);
      sessionStorage.setItem("micOn", micOn);
      sessionStorage.setItem("cameraOn", cameraOn);

      

// before navigating:
// setPreviewStream(stream);
navigate(`/meet/${code}`, { state: { teamId } });

    } else {
      console.error("Join failed:", response?.message);
      alert(response?.message || "Unable to join meeting");
      setJoining(false);
    }
  });
};


  const handleCancel = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    sessionStorage.removeItem(`joined_${code}_${userId}`);
    navigate("/");
  };

  const username = currentUser?.username || "Guest";
  const fullname = currentUser?.fullname || "";
  const avatarSrc = currentUser?.profile_image || null;
  const userIdDisplay = currentUser?.id || "";

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
      <div className="absolute top-6 flex items-center gap-4 bg-gray-800/80 px-4 py-2 rounded-2xl shadow-lg border border-gray-700">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={username}
            className="h-12 w-12 rounded-full object-cover border-2 border-purple-600"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center text-lg font-bold">
            {username[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <span className="font-semibold">{username}</span>
          <span className="text-sm text-gray-400">{fullname}</span>
        </div>
        <span className="ml-auto text-xs text-gray-500 border px-2 py-0.5 rounded">{userIdDisplay}</span>
      </div>

      <h2 className="text-2xl font-semibold mb-4 mt-16">Setup Your Media</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-80 h-60 rounded-lg border border-gray-700 mb-4 bg-black object-cover"
      />

      <div className="flex gap-6 mb-4">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full ${micOn ? "bg-green-600" : "bg-red-600"} hover:opacity-80`}
        >
          {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button
          onClick={toggleCam}
          className={`p-3 rounded-full ${cameraOn ? "bg-green-600" : "bg-red-600"} hover:opacity-80`}
        >
          {cameraOn ? <FaVideo /> : <FaVideoSlash />}
        </button>
      </div>

      <div className="flex gap-4">
        <button onClick={handleCancel} className="bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-700">
          Cancel
        </button>
        <button
          onClick={handleJoin}
          disabled={joining}
          className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {joining ? "Joining..." : "Join Meeting"}
        </button>
      </div>
    </div>
  );
};

export default MediaConfirmation;
