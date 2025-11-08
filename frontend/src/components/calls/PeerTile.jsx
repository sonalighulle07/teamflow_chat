import React, { useRef, useEffect } from "react";

export default function PeerTile({ stream, label, isLocal, isPinned }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-gray-900 ${
        isPinned ? "h-full w-full" : "h-32"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-0 left-0 bg-black/50 text-white text-xs px-2 py-1">
        {label}
      </div>
    </div>
  );
}
