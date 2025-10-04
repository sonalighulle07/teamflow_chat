import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";

const MediaConfirmation = ({ userId }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { code } = useParams();
  const meetingWindowRef = useRef(null);

  useEffect(() => {
    const channel = new BroadcastChannel("meeting-session");
    channel.onmessage = (e) => {
      if (e.data === `left_${code}_${userId}`) {
        sessionStorage.removeItem(`joined_${code}_${userId}`);
      }
    };
    return () => channel.close();
  }, [code, userId]);

  const initStream = async () => {
    try {
      const fullStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      fullStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
      fullStream.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
      setStream(fullStream);
      if (videoRef.current) videoRef.current.srcObject = fullStream;
    } catch {
      setError("Microphone or camera access denied.");
    }
  };

  useEffect(() => {
    initStream();
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleCamera = () => {
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !cameraOn));
    setCameraOn((prev) => !prev);
  };

  const toggleMic = () => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((prev) => !prev);
  };

  const handleJoin = () => {
    if (!stream) return;
    const sessionKey = `joined_${code}_${userId}`;
    if (sessionStorage.getItem(sessionKey)) {
      alert("You are already in this meeting.");
      return;
    }
    sessionStorage.setItem(sessionKey, "true");
    sessionStorage.setItem("userId", userId);
    sessionStorage.setItem("roomCode", code);
    sessionStorage.setItem("micOn", micOn);
    sessionStorage.setItem("cameraOn", cameraOn);
    stream.getTracks().forEach((t) => t.stop());
    meetingWindowRef.current = window.open(
      `/meet/${code}`,
      "_blank",
      "width=1200,height=800"
    );
  };

  const handleCancel = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    sessionStorage.removeItem(`joined_${code}_${userId}`);
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h2 className="text-2xl font-semibold mb-4">Setup Your Media</h2>
      {error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-80 h-60 rounded-lg border border-gray-700 mb-4 bg-black"
        />
      )}
      <div className="flex gap-6 mb-4">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full ${
            micOn ? "bg-green-600" : "bg-red-600"
          } hover:opacity-80`}
        >
          { micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full ${
            cameraOn ? "bg-green-600" : "bg-red-600"
          } hover:opacity-80`}
        >
          { cameraOn ? <FaVideo /> : <FaVideoSlash /> }
        </button>
      </div>
      <div className="flex gap-4">
        <button
          onClick={handleCancel}
          className="bg-gray-600 px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleJoin}
          disabled={!!error}
          className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Join Meeting
        </button>
      </div>
    </div>
  );
};

export default MediaConfirmation;
