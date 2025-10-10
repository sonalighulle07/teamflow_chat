import React, { useEffect, useRef } from "react";

export default function PeerTile({ stream, label, isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
  if (videoRef.current) {
    videoRef.current.srcObject = stream || null;
    
    console.log("🎥 Binding stream in PeerTile:", label, stream);
  }
}, [stream, label]);



  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        console.log("🎥 Binding stream:", label, stream.getTracks());
      }
    }
  }, [stream, label]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // mute local to avoid echo
        className="w-full h-full object-cover bg-black"
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          No video stream
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        {label}
      </div>
    </div>
  );
}
