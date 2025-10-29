import React, { useEffect, useRef, useState } from "react";

export default function PeerTile({ stream, label, isLocal = false, isPinned }) {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Always update srcObject safely
    if (stream && videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
      console.log("🎥 Bound stream:", label, stream.getTracks());
    }

    // Check if stream has video
    const checkVideoTracks = () => {
      const hasTrack = !!stream?.getVideoTracks()?.some((t) => t.readyState === "live");
      setHasVideo(hasTrack);
    };

    checkVideoTracks();

    // Listen to track start/stop events (for cam toggle)
    stream?.getVideoTracks()?.forEach((track) => {
      track.onended = checkVideoTracks;
      track.onmute = checkVideoTracks;
      track.onunmute = checkVideoTracks;
    });

    return () => {
      // cleanup
      if (videoEl) videoEl.srcObject = null;
    };
  }, [stream, label]);

  return (
    <div
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${
        isPinned ? "border-4 border-purple-500" : ""
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover bg-black transition-opacity duration-300 ${
          hasVideo ? "opacity-100" : "opacity-0"
        }`}
      />

      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-black">
          Camera off
        </div>
      )}

      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
        {label}
      </div>
    </div>
  );
}
