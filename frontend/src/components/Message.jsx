import React, { useState, useRef, useEffect } from "react";
import { FaSmile, FaEllipsisV } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";

export default function Message({
  message,
  isOwn,
  searchQuery,
  onReact,
  onDelete,
  onEdit,
  onForward,
  socket,
}) {
  const BASE_URL = "http://localhost:3000";

  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const reactedEmojis = Object.keys(message.reactions || {});

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Hover logic
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHovered(true);
  };
  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHovered(false);
      setMenuOpen(false);
      setShowEmojiPicker(false);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Socket listener for reactions
  useEffect(() => {
    if (!socket) return;
    const handleReactionEvent = ({ messageId, reactions }) => {
      if (message.id === messageId) {
        // Only store emoji keys
        setReactedEmojis(Object.keys(reactions));
      }
    };
    socket.on("reaction", handleReactionEvent);
    return () => socket.off("reaction", handleReactionEvent);
  }, [socket, message.id]);

  const bubbleClasses = isOwn
    ? "bg-purple-600 text-white self-end rounded-tr-none"
    : "bg-gray-200 text-gray-900 self-start rounded-tl-none";

  const getFileUrl = (url) =>
    url?.startsWith("http") ? url : `${BASE_URL}${url}`;

  const highlightText = (text) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleDoubleClick = () => {
    setIsFullscreen(true);
    setZoom(1);
  };
  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.2));
  const handleZoomOut = () => setZoom((z) => Math.max(1, z - 0.2));
  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setZoom(1);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };
  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-md flex flex-col gap-3">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="border border-gray-300 text-black px-3 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow-sm hover:bg-purple-700 transition-colors"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/chats/${message.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: editText }),
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    setIsEditing(false);
                    onEdit?.(updated);
                  } else {
                    console.error("Edit failed on server");
                  }
                } catch (err) {
                  console.error("Edit failed:", err);
                }
              }}
            >
              Save
            </button>
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow-sm hover:bg-gray-200 transition-colors"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    switch (message.type) {
      case "image":
        if (!message.file_url) return null;
        return (
          <div className="relative inline-block">
            <img
              src={getFileUrl(message.file_url)}
              alt="Sent"
              className="max-w-xs rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
              onDoubleClick={handleDoubleClick}
            />
            {isFullscreen && (
              <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                <img
                  src={getFileUrl(message.file_url)}
                  alt="Fullscreen"
                  className="max-h-full max-w-full rounded-lg shadow-lg transition-transform"
                  style={{ transform: `scale(${zoom})` }}
                />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 bg-black bg-opacity-50 px-4 py-2 rounded-full">
                  <button
                    className="text-white text-xl font-bold px-3 py-1 hover:text-purple-400"
                    onClick={handleZoomOut}
                  >
                    −
                  </button>
                  <button
                    className="text-white text-xl font-bold px-3 py-1 hover:text-purple-400"
                    onClick={handleZoomIn}
                  >
                    +
                  </button>
                  <button
                    className="text-white text-xl font-bold px-3 py-1 hover:text-red-500"
                    onClick={handleCloseFullscreen}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case "video":
        if (!message.file_url) return null;
        return (
          <video
            src={getFileUrl(message.file_url)}
            className="max-w-xs rounded-lg shadow-md cursor-pointer"
            controls
            muted
          />
        );

      case "audio":
        if (!message.file_url) return null;
        return (
          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-xl shadow-sm max-w-md w-full">
            <span className="text-2xl">🎵</span>
            <audio
              ref={audioRef}
              src={getFileUrl(message.file_url)}
              className="w-full"
              onEnded={() => setIsPlaying(false)}
            />
            <button
              onClick={togglePlay}
              className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={toggleMute}
              className="px-2 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200"
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
          </div>
        );

      case "file":
      case "application":
        if (!message.file_url) return null;
        const fileName =
          message.file_name || message.file_url?.split("/").pop();
        const fileExt = fileName?.split(".").pop()?.toLowerCase();
        const getFileIcon = () => {
          if (fileExt === "pdf") return "📕";
          if (["doc", "docx"].includes(fileExt)) return "📘";
          if (["xls", "xlsx"].includes(fileExt)) return "📊";
          return "📄";
        };
        return (
          <div className="flex items-center gap-2 p-2 bg-white border rounded-xl shadow-sm max-w-xs">
            <span className="text-2xl">{getFileIcon()}</span>
            <span className="truncate">{fileName}</span>
          </div>
        );

      default:
        return (
          <div>
            {message.forwarded_from && (
              <span className="text-xs italic text-gray-900">Forwarded</span>
            )}

            <p className="break-words">
              {highlightText(message.text || "")}
              {message.edited === 1 && (
                <span className="text-xs text-gray-900 ml-1">(edited)</span>
              )}
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className={`flex flex-col mb-3 max-w-[75%] relative ${
        isOwn ? "items-end ml-auto" : "items-start mr-auto"
      }`}
    >
      <div
        className={`px-4 py-2 rounded-2xl shadow-md ${bubbleClasses} relative`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderContent()}

        {hovered && (
          <div
            className={`absolute -top-9 ${
              isOwn ? "right-2" : "left-2"
            } flex items-center gap-1 bg-white rounded-full shadow-md px-2 py-1 z-20`}
          >
            {/* Quick emojis */}
            {["👍", "❤️", "😆", "😮", "😂"].map((emoji) => (
              <button
                key={emoji}
                className="px-1 hover:bg-gray-100 rounded-full"
                onClick={() => onReact?.(message.id, emoji)}
              >
                {emoji}
              </button>
            ))}

            {/* Emoji picker */}
            <div className="relative">
              <button
                className="p-1 text-gray-600 hover:bg-gray-100 rounded-full"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
              >
                <FaSmile />
              </button>
              {showEmojiPicker && (
                <div className="absolute top-8 right-0 z-30">
                  <EmojiPicker
                    onEmojiClick={(emojiObject) =>
                      onReact?.(message.id, emojiObject.emoji)
                    }
                    theme="light"
                  />
                </div>
              )}
            </div>

            {/* Options menu */}
            <div className="relative">
              <button
                className="p-1 text-gray-600 hover:bg-gray-100 rounded-full"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <FaEllipsisV />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 w-48 bg-white shadow-lg rounded-lg z-30 border border-gray-200 text-gray-700">
                  {/* Forwarded label (if message is forwarded) */}
                  {message.forwarded_from && (
                    <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-200">
                      Forwarded
                    </div>
                  )}

                  {/* Edit */}
                  {isOwn && (
                    <button
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-purple-100 rounded transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      ✏️ <span>Edit</span>
                    </button>
                  )}

                  {/* Delete */}
                  {isOwn && (
                    <button
                      className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                      onClick={() => onDelete?.(message.id)}
                    >
                      🗑️ <span>Delete</span>
                    </button>
                  )}

                  {/* Forward */}
                  <button
                    className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-blue-100 rounded transition-colors"
                    onClick={() => onForward?.(message)}
                  >
                    🔄 <span>Forward</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Timestamp */}
      <span
        className={`text-xs text-gray-400 mt-1 ${
          isOwn ? "self-end" : "self-start"
        }`}
      >
        {new Date(message.created_at || message.timestamp).toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" }
        )}
      </span>
    </div>
  );
}
