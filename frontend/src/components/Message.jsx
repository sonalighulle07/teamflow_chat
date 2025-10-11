import React, { useState, useRef, useEffect } from "react";
import { FaSmile, FaEllipsisV } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import { URL } from "../config";

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
  const currentUser = JSON.parse(sessionStorage.getItem("chatUser") || "null");
  const userId = currentUser?.id;
  const normalizeReactions = (raw) => {
    if (!raw) return {};
    let parsed = raw;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return {};
      }
    }
    const out = {};
    Object.entries(parsed).forEach(([emoji, val]) => {
      if (!val) out[emoji] = { count: 0, users: {} };
      else if (typeof val === "number") out[emoji] = { count: val, users: {} };
      else if (typeof val === "object") {
        if ("count" in val) {
          const users =
            val.users && typeof val.users === "object" ? val.users : {};
          out[emoji] = {
            count: Number(val.count || Object.keys(users).length),
            users,
          };
        } else {
          out[emoji] = { count: Object.keys(val).length, users: val };
        }
      } else out[emoji] = { count: 0, users: {} };
    });
    return out;
  };

  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [reactedEmojis, setReactedEmojis] = useState(() =>
    normalizeReactions(message.reactions)
  );

  const audioRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Sync reactions if message prop updates
  useEffect(() => {
    setReactedEmojis(normalizeReactions(message.reactions));
  }, [message.reactions, message.id]);

  // Socket reaction updates
  useEffect(() => {
    if (!socket) return;
    const handleReaction = ({ messageId, reactions }) => {
      if (messageId !== message.id) return;
      setReactedEmojis(normalizeReactions(reactions));
    };
    socket.on?.("reaction", handleReaction);
    return () => socket.off?.("reaction", handleReaction);
  }, [socket, message.id]);

  // Hover handlers
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHovered(true);
  };
  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHovered(false);
      setMenuOpen(false);
      setShowEmojiPicker(false);
    }, 120);
  };

  const getFileUrl = (url) => (url?.startsWith("http") ? url : `${URL}${url}`);

  const toggleReaction = (emoji) => {
    setReactedEmojis((prev) => {
      const prevData = prev[emoji] || { count: 0, users: {} };
      const usersMap = { ...(prevData.users || {}) };
      const alreadyReacted = userId && usersMap[userId];

      if (alreadyReacted) delete usersMap[userId];
      else if (userId) usersMap[userId] = 1;

      return {
        ...prev,
        [emoji]: { count: Object.keys(usersMap).length, users: usersMap },
      };
    });
    onReact?.(message.id, emoji);
  };

  const handlePickerEmoji = (emojiObject) => {
    const e = emojiObject?.emoji;
    if (!e) return;
    toggleReaction(e);
    setShowEmojiPicker(false);
  };

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

  // Media handlers
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
    setIsPlaying((p) => !p);
  };
  const toggleMute = () => {
    if (!audioRef.current) return;
    const muted = !isMuted;
    audioRef.current.muted = muted;
    setIsMuted(muted);
  };

  const renderContent = () => {
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
                    onClick={handleZoomOut}
                    className="text-white text-xl font-bold px-3 py-1 hover:text-purple-400"
                  >
                    −
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="text-white text-xl font-bold px-3 py-1 hover:text-purple-400"
                  >
                    +
                  </button>
                  <button
                    onClick={handleCloseFullscreen}
                    className="text-white text-xl font-bold px-3 py-1 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case "video":
        return (
          <video
            src={getFileUrl(message.file_url)}
            className="max-w-xs rounded-lg shadow-md"
            controls
            muted
          />
        );
      case "audio":
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
          <div className="flex items-center gap-2 p-2 bg-white border rounded-xl  text-black shadow-sm max-w-xs">
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

  const bubbleClasses = isOwn
    ? "bg-purple-600 text-white self-end rounded-tr-none"
    : "bg-gray-200 text-gray-900 self-start rounded-tl-none";

  const getEmojiCount = (emoji) => reactedEmojis[emoji]?.count || 0;
  const didIReact = (emoji) => !!reactedEmojis[emoji]?.users?.[userId];

  return (
    <div
      className={`flex flex-col mb-3 max-w-[75%] relative ${
        isOwn ? "items-end ml-auto" : "items-start mr-auto"
      }`}
    >
      <div
        className={`px-4 py-2 rounded-2xl shadow-md ${bubbleClasses}`}
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
            {["👍", "❤️", "😂", "😮", "😢"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className={`relative px-1 flex items-center gap-1 rounded-full transition-all duration-200 ease-out
      ${didIReact(emoji) ? "bg-gray-100" : "bg-transparent"}
      hover:scale-[1.08] hover:-translate-y-[2px] active:scale-100`}
                title={`React ${emoji}`}
              >
                <span className="text-[20px] leading-none select-none">
                  {emoji}
                </span>
                {getEmojiCount(emoji) > 0 && (
                  <span className="text-xs text-gray-600">
                    {getEmojiCount(emoji)}
                  </span>
                )}
              </button>
            ))}

            <div className="relative">
              <button
                className="p-1 text-gray-600 hover:bg-gray-100 rounded-full"
                onClick={() => setShowEmojiPicker((s) => !s)}
                title="Pick emoji"
              >
                <FaSmile />
              </button>
              {showEmojiPicker && (
                <div className="absolute top-8 right-0 z-30">
                  <EmojiPicker onEmojiClick={handlePickerEmoji} theme="light" />
                </div>
              )}
            </div>

            <div className="relative">
              <button
                className="p-1 text-gray-600 hover:bg-gray-100 rounded-full"
                onClick={() => setMenuOpen((m) => !m)}
                title="Options"
              >
                <FaEllipsisV />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 w-44 bg-white shadow-lg rounded-lg z-30 border border-gray-200 text-gray-700">
                  {isOwn && (
                    <>
                      <button
                        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-purple-100 rounded transition-colors"
                        onClick={() => {
                          setIsEditing(true);
                          setMenuOpen(false);
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                        onClick={() => {
                          onDelete?.(message.id);
                          setMenuOpen(false);
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-blue-100 rounded transition-colors"
                    onClick={() => {
                      onForward?.(message);
                      setMenuOpen(false);
                    }}
                  >
                    🔄 Forward
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {Object.entries(reactedEmojis).map(([emoji, data]) => {
          const count = data.count;
          if (count === 0) return null;
          const reacted = !!data.users?.[userId];
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              className={`flex items-center gap-1 px-2 py-1 text-sm rounded-full shadow-sm ${
                reacted ? "bg-gray-200" : "bg-gray-100"
              }`}
              title={
                reacted
                  ? "You reacted — click to remove"
                  : "React — click to add"
              }
            >
              <span>{emoji}</span>
              <span className="text-xs">{count}</span>
            </button>
          );
        })}
      </div>

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

      {isEditing && (
        <div className="mt-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          />
          <div className="flex gap-2 mt-2">
            <button
              className="px-3 py-1 bg-purple-600 text-white rounded"
              onClick={async () => {
                try {
                  const updatedMsg = { ...message, text: editText };
                  const token = sessionStorage.getItem("chatToken");
                  const res = await fetch(`${URL}/api/chats/${updatedMsg.id}`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ text: updatedMsg.text }),
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    onEdit?.(updated);
                    setIsEditing(false);
                  } else console.error("Edit failed on server");
                } catch (err) {
                  console.error("Edit failed:", err);
                }
              }}
            >
              Save
            </button>

            <button
              className="px-3 py-1 bg-gray-200 rounded"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
