import React, { useEffect, useRef, useState } from "react";

export default function PeerTile({
  stream,
  label,
  isLocal = false,
  isPinned = false,
  onDoubleClick,
}) {
  
  const videoRef = useRef(null);
  const [videoActive, setVideoActive] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  
  // 🎥 Handle video stream binding + track state
  useEffect(() => {
    if (!videoRef.current) return;

    if (!stream) {
      setVideoActive(false);
      videoRef.current.srcObject = null;
      return;
    }

    // Attach stream immediately
    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }

    const checkVideo = () => {
      const active =
        stream.getVideoTracks().some(
          (t) => t.enabled && t.readyState === "live"
        ) || false;
      setVideoActive(active);
    };

    // Initial check
    checkVideo()

    // Listen for any track state changes
    const tracks = stream.getVideoTracks();
    tracks.forEach((track) => {
      track.onmute = checkVideo;
      track.onunmute = checkVideo;
      track.onended = checkVideo;
    });

    return () => {
      tracks.forEach((track) => {
        track.onmute = null;
        track.onunmute = null;
        track.onended = null;
      });
    };
  }, [stream]);

  // 🎤 Detect if user is speaking (audio activity)
  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
      try {
        source.disconnect();
        analyser.disconnect();
        ctx.close();
      } catch (err) {
        // ignore disconnect errors
      }
    };
  }, [stream]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden w-full aspect-video border transition-all
        ${
          isPinned
            ? "border-blue-600 shadow-lg"
            : speaking
            ? "border-green-500 shadow-md"
            : "border-gray-700"
        }
        bg-gray-900 hover:border-blue-400 cursor-pointer`}
      onDoubleClick={onDoubleClick}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />

      {/* If camera is off */}
      {!videoActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
          <div className="text-lg font-semibold">{label}</div>
          <div className="text-xs text-gray-400 mt-1">Camera Off</div>
        </div>
      )}

      {/* Show name when camera active */}
      {videoActive && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {label}
        </div>
      )}

      {/* Debug info for stream tracks */}
      {stream && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-[10px] px-2 py-1 rounded z-10">
          {stream.getTracks().map((t, i) => (
            <div key={i}>
              {t.kind}: {t.enabled ? "✅" : "❌"} ({t.readyState})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
