import React, { useEffect, useRef } from "react";

export default function PeerTile({ stream, label, isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
      console.log("🎥 [PeerTile] Initial bind:", {
        label,
        stream,
        tracks: stream?.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
        })),
      });
    }
  }, [stream, label]);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        console.log("🔄 [PeerTile] Stream updated:", {
          label,
          stream,
          tracks: stream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
          })),
        });
      }
    }
  }, [stream, label]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
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

