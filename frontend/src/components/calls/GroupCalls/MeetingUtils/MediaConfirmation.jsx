import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import socket from "../../hooks/socket";

const MediaConfirmation = ({ userId, currentUser }) => {
  const videoRef = useRef(null);
  const [previewStream, setPreviewStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);

  const navigate = useNavigate();
  const { credentials } = useParams();
  console.log("Credentials:",credentials)
  
  
  console.log("param credentials:",credentials)
  const code = credentials?.split("-")[2] || null;
  console.log("Room Code:", code);

  const teamId = credentials.split("-")[1]; 

  console.log("Team ID:", teamId);

  const username = currentUser?.username || "Guest";
  const fullname = currentUser?.fullname || "";
  const avatarSrc = currentUser?.profile_image || null;
  const userIdDisplay = currentUser?.id || "";

const handleJoin = () => {
  socket.emit(
    "checkJoined",
    { roomCode: code, userId },
    ({ joined }) => {
      if (joined) {
        alert("You are already in this meeting on another tab or session.");
        return; 
      }

      // If not joined → continue normally
      sessionStorage.setItem("micOn", micOn ? "true" : "false");
      sessionStorage.setItem("cameraOn", cameraOn ? "true" : "false");

      socket.emit("startMeeting", {
        teamId: teamId,
        startedBy: userId,
        meetingCode: code,
      });

      previewStream?.getTracks().forEach((t) => t.stop());

      navigate(`/meet/${credentials}`, {
        state: { userId, username },
      });
    }
  );
};
  // --- Load preview camera/mic ---
  useEffect(() => {
    const loadPreviewStream = async () => {
      try {
        const constraints = {};

        if (cameraOn) constraints.video = { width: 640, height: 480 };
        if (micOn) constraints.audio = true;

        if (!constraints.video && !constraints.audio) {
          setPreviewStream(null);
          videoRef.current.srcObject = null;
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setPreviewStream(stream);
      } catch (err) {
        console.error("Preview stream error:", err);
      }
    };

    loadPreviewStream();

    return () => {
      previewStream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn, micOn]);

  // Attach preview stream to video element
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // --- Toggle mic ---
  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    sessionStorage.setItem("micOn", String(next));
  };

  // --- Toggle camera ---
  const toggleCam = () => {
    const next = !cameraOn;
    setCameraOn(next);
    sessionStorage.setItem("cameraOn", String(next));
  };

  const handleCancel = () => {
    previewStream?.getTracks().forEach((t) => t.stop());
    window.close();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
      {/* Top user info */}
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
          className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Join Meeting
        </button>
      </div>
    </div>
  );
};

export default MediaConfirmation;
