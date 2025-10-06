import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import socket from "../../hooks/socket";

const MediaConfirmation = ({ userId }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(sessionStorage.getItem("cameraOn") === "true");
  const [micOn, setMicOn] = useState(sessionStorage.getItem("micOn") === "true");
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const { code } = useParams();

  // Cleanup session on leave/broadcast
  useEffect(() => {
    const channel = new BroadcastChannel("meeting-session");
    channel.onmessage = (e) => {
      if (e.data === `left_${code}_${userId}`) {
        sessionStorage.removeItem(`joined_${code}_${userId}`);
      }
    };
    return () => channel.close();
  }, [code, userId]);

  // Init camera & mic
  useEffect(() => {
    const initStream = async () => {
      try {
        const fullStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        fullStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
        fullStream.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
        setStream(fullStream);
        if (videoRef.current) videoRef.current.srcObject = fullStream;
      } catch {
        setStream(new MediaStream());
      }
    };
    initStream();

    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [micOn, cameraOn]);

  // --- Live toggle handlers ---
  const toggleCamera = () => {
    if (!stream) return;
    const enabled = !cameraOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setCameraOn(enabled);
    sessionStorage.setItem("cameraOn", enabled ? "true" : "false");
  };

  const toggleMic = () => {
    if (!stream) return;
    const enabled = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setMicOn(enabled);
    sessionStorage.setItem("micOn", enabled ? "true" : "false");
  };

  const handleJoin = () => {
    if (!stream || joining) return;

    setJoining(true);
    const sessionKey = `joined_${code}_${userId}`;

    const onError = ({ message }) => {
      if (message.includes("already in this meeting")) {
        alert("You are already in this meeting.");
      }
      cleanup();
    };

    const onSuccess = () => {
      sessionStorage.setItem(sessionKey, "true");
      sessionStorage.setItem("userId", userId);
      sessionStorage.setItem("roomCode", code);
      sessionStorage.setItem("micOn", micOn);
      sessionStorage.setItem("cameraOn", cameraOn);

      // Stop prejoin stream
      if (stream) stream.getTracks().forEach((t) => t.stop());

      // Open meeting room
      window.open(`/meet/${code}`, "_blank", "width=1200,height=800");

      cleanup();
    };

    const cleanup = () => {
      setJoining(false);
      socket.off("error", onError);
      socket.off("existingUsers", onSuccess);
    };

    socket.once("error", onError);
    socket.once("existingUsers", onSuccess);

    socket.emit("joinRoom", { userId, roomCode: code });
  };

  const handleCancel = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    sessionStorage.removeItem(`joined_${code}_${userId}`);
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h2 className="text-2xl font-semibold mb-4">Setup Your Media</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-80 h-60 rounded-lg border border-gray-700 mb-4 bg-black"
      />
      <div className="flex gap-6 mb-4">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full ${micOn ? "bg-green-600" : "bg-red-600"} hover:opacity-80`}
        >
          {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button
          onClick={toggleCamera}
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
          Join Meeting
        </button>
      </div>
    </div>
  );
};

export default MediaConfirmation;
