import React, { useEffect, useRef, useState } from "react";

export default function PeerTile({ stream, label, isLocal = false, isPinned = false }) {
  const videoRef = useRef(null);
  const [videoActive, setVideoActive] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!stream) {
      setVideoActive(false);
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }

    const updateVideo = () => {
      const active = stream.getVideoTracks().some(
        (t) => t.enabled && t.readyState === "live"
      );
      setVideoActive(active);
      if (videoRef.current) videoRef.current.srcObject = stream;
    };

    updateVideo();
    stream.getVideoTracks().forEach((t) => {
      t.onmute = updateVideo;
      t.onunmute = updateVideo;
      t.onended = updateVideo;
    });

    return () => {
      stream.getVideoTracks().forEach((t) => {
        t.onmute = null;
        t.onunmute = null;
        t.onended = null;
      });
    };
  }, [stream]);

  // Active speaker detection
  useEffect(() => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 512;
    const data = new Uint8Array(analyser.frequencyBinCount);

    let raf;
    const detect = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setSpeaking(avg > 10);
      raf = requestAnimationFrame(detect);
    };
    detect();

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      analyser.disconnect();
    };
  }, [stream]);

  return (
    <div
      className={`relative w-full h-full bg-gray-800 rounded-lg overflow-hidden border-4 transition-all cursor-pointer 
        ${isPinned ? "border-blue-500 shadow-xl" : speaking ? "border-green-500 shadow-md" : "border-gray-700"}
      `}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />
      {!videoActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700 bg-opacity-70">
          <span className="text-white text-sm">Camera Off</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-50 text-sm rounded text-white">
        {label} {isLocal && "(You)"}
      </div>
    </div>
  );
}
