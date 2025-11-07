import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import socket from "../../hooks/socket";

const MediaConfirmation = ({ userId, currentUser }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(sessionStorage.getItem("cameraOn") === "true");
  const [micOn, setMicOn] = useState(sessionStorage.getItem("micOn") === "true");
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const { code } = useParams();
  const initialized = useRef(false);
  
  // --- Cleanup session on broadcast leave ---
  useEffect(() => {
    const channel = new BroadcastChannel("meeting-session");
    channel.onmessage = (e) => {
      if (e.data === `left_${code}_${userId}`) {
        sessionStorage.removeItem(`joined_${code}_${userId}`);
      }
    };
    return () => channel.close();
  }, [code, userId]);

  // --- Initialize media preview (safe on reload) ---
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let activeStream;
    const initPreview = async () => {
      try {
        const constraints = {};
        if (micOn) constraints.audio = true;
        if (cameraOn) constraints.video = true;

        if (constraints.audio || constraints.video) {
          activeStream = await navigator.mediaDevices.getUserMedia(constraints);
          setStream(activeStream);
        } else {
          setStream(null);
        }
      } catch (err) {
        console.warn("Media init warning:", err);
      }
    };

    initPreview();

    // stop all media tracks on unload / unmount
    const cleanup = () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };

    window.addEventListener("beforeunload", cleanup);
    return () => {
      cleanup();
      window.removeEventListener("beforeunload", cleanup);
    };
  }, [micOn, cameraOn]);

  // --- Bind stream to video element ---
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // --- Toggle microphone ---
  const toggleMic = async () => {
    const enabled = !micOn;
    setMicOn(enabled);
    sessionStorage.setItem("micOn", enabled.toString());

    if (!enabled && stream) {
      stream.getAudioTracks().forEach((t) => t.stop());
    } else if (enabled) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newStream = new MediaStream([...stream?.getVideoTracks(), ...micStream.getAudioTracks()]);
        setStream(newStream);
      } catch (err) {
        console.error("Mic toggle failed:", err);
      }
    }
  };

  // --- Toggle camera ---
  const toggleCam = async () => {
    const enabled = !cameraOn;
    setCameraOn(enabled);
    sessionStorage.setItem("cameraOn", enabled.toString());

    if (!enabled && stream) {
      stream.getVideoTracks().forEach((t) => t.stop());
    } else if (enabled) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newStream = new MediaStream([...stream?.getAudioTracks(), ...camStream.getVideoTracks()]);
        setStream(newStream);
      } catch (err) {
        console.error("Camera toggle failed:", err);
      }
    }
  };

  // --- Join meeting ---
  const handleJoin = () => {
    if (joining) return;
    setJoining(true);

    const sessionKey = `joined_${code}_${userId}`;

    const cleanup = () => {
      setJoining(false);
      socket.off("error", onError);
      socket.off("existingUsers", onSuccess);
    };

    const onError = ({ message }) => {
      alert(message);
      cleanup();
    };

    const onSuccess = () => {
      sessionStorage.setItem(sessionKey, "true");
      sessionStorage.setItem("userId", userId);
      sessionStorage.setItem("roomCode", code);
      sessionStorage.setItem("micOn", micOn.toString());
      sessionStorage.setItem("cameraOn", cameraOn.toString());

      if (stream) stream.getTracks().forEach((t) => t.stop());
      window.open(`/meet/${code}`, "_blank", "width=1200,height=800");
      cleanup();
    };

    socket.once("error", onError);
    socket.once("existingUsers", onSuccess);
    socket.emit("joinRoom", { userId, roomCode: code });
  };

  // --- Cancel meeting ---
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
          <img src={avatarSrc} alt={username} className="h-12 w-12 rounded-full object-cover border-2 border-purple-600" />
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
        <button onClick={toggleMic} className={`p-3 rounded-full ${micOn ? "bg-green-600" : "bg-red-600"} hover:opacity-80`}>
          {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button onClick={toggleCam} className={`p-3 rounded-full ${cameraOn ? "bg-green-600" : "bg-red-600"} hover:opacity-80`}>
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
