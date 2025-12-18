import React, { useEffect, useRef } from "react";
import { FaPhone, FaTimes } from "react-icons/fa";
import { URL } from "../../../config";

export default function IncomingCallModal({
  visible,
  fromUser,
  callType,
  onAccept,
  onReject,
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/ringtone.mp3");
      audioRef.current.loop = true;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});

    return () => {
      audioRef.current?.pause();
      audioRef.current.currentTime = 0;
    };
  }, [visible]);

  if (!visible) return null;

  const username = typeof fromUser === "object" ? fromUser?.username : fromUser;

  // 🔹 Same avatar logic style as Header
  let avatar = null;

  if (typeof fromUser === "object") {
    const img =
      fromUser.profile_image || fromUser.profileImage || fromUser.avatar;

    if (img) {
      avatar = img.startsWith("http") ? img : `${URL}${img}`;
    }
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[280px] rounded-xl bg-white px-5 py-6 text-center shadow-2xl">
        {/* Avatar */}
        <div className="flex justify-center">
          {avatar ? (
            <img
              src={avatar}
              alt={username}
              className="h-16 w-16 rounded-full object-cover border border-gray-300"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-purple-500 text-white flex items-center justify-center text-xl font-bold">
              {username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="mt-3 text-sm font-semibold text-gray-800 truncate">
          {username}
        </h3>

        {/* Call Type */}
        <p className="mt-1 text-xs text-gray-500">
          Incoming {callType === "video" ? "Video" : "Audio"} Call
        </p>

        {/* Actions */}
        {/* Actions */}
        <div className="mt-6 flex justify-center gap-8">
          {/* Accept */}
          <button
            onClick={() => {
              audioRef.current?.pause();
              audioRef.current.currentTime = 0;
              onAccept();
            }}
            className="h-11 w-11 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md transition transform -rotate-260 "
            title="Accept"
          >
            <FaPhone size={14} />
          </button>

          {/* Reject */}
          <button
            onClick={() => {
              audioRef.current?.pause();
              audioRef.current.currentTime = 0;
              onReject();
            }}
            className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition "
            title="Reject"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
