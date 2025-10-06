import React, { useEffect, useRef, useState } from "react";

export default function PeerTile({ stream, label, isLocal = false }) {
  const videoRef = useRef(null);
  const [videoActive, setVideoActive] = useState(true);

  // Update videoActive based on track state
  useEffect(() => {
    if (!stream) {
      setVideoActive(false);
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }

    const checkVideo = () => {
      const active = stream.getVideoTracks().some(t => t.enabled && t.readyState === "live");
      setVideoActive(active);
      if (videoRef.current) videoRef.current.srcObject = stream;
    };

    checkVideo();

    // Listen to track events
    stream.getVideoTracks().forEach(track => {
      track.onmute = checkVideo;
      track.onunmute = checkVideo;
      track.onended = checkVideo;
    });

    return () => {
      stream.getVideoTracks().forEach(track => {
        track.onmute = null;
        track.onunmute = null;
        track.onended = null;
      });
    };
  }, [stream]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden w-full aspect-video border border-gray-700">
      {/* Always attach the video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />

      {/* Overlay when video is off */}
      {!videoActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
          <div className="text-lg font-semibold">{label}</div>
          <div className="text-xs text-gray-400 mt-1">Camera Off</div>
        </div>
      )}

      {/* Label overlay */}
      {videoActive && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {label}
        </div>
      )}

      {/* Optional debug overlay */}
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
