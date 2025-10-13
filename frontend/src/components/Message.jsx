import React, { useState, useRef, useEffect } from "react";
import { FaSmile, FaEllipsisV } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";

export default function Message({
  message,
  isOwn,
  searchQuery,
  onReact, // (messageId, emoji) => void
  onDelete,
  onEdit,
  onForward,
  socket, // optional
}) {
  const BASE_URL = "http://localhost:3000";

  // ---- helpers ----
  const currentUser = JSON.parse(sessionStorage.getItem("chatUser") || "null");

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
    // parsed is expected to be an object mapping emoji -> either
    // 1) number (count)
    // 2) { count, users }
    // 3) users map (id -> 1)
    const out = {};
    Object.entries(parsed).forEach(([emoji, val]) => {
      if (val == null) {
        out[emoji] = { count: 0, users: {} };
      } else if (typeof val === "number") {
        out[emoji] = { count: val, users: {} };
      } else if (typeof val === "object") {
        if ("count" in val) {
          const users =
            val.users && typeof val.users === "object" ? val.users : {};
          out[emoji] = {
            count: Number(val.count || Object.keys(users).length || 0),
            users,
          };
        } else {
          // assume val is users map
          const users = val;
          out[emoji] = { count: Object.keys(users).length, users };
        }
      } else {
        out[emoji] = { count: 0, users: {} };
      }
    });
    return out;
  };

  // ---- state ----
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Store local normalized reactions for optimistic UI
  const [reactedEmojis, setReactedEmojis] = useState(() =>
    normalizeReactions(message.reactions)
  );

  // Keep local reactions in sync when message prop updates
  useEffect(() => {
    setReactedEmojis(normalizeReactions(message.reactions));
  }, [message.reactions, message.id]);

  // If parent sends socket events directly to this component
  useEffect(() => {
    if (!socket) return;
    const handleReactionEvent = ({ messageId, reactions }) => {
      if (messageId !== message.id) return;
      setReactedEmojis(normalizeReactions(reactions));
    };
    socket.on?.("reaction", handleReactionEvent);
    return () => socket.off?.("reaction", handleReactionEvent);
  }, [socket, message.id]);

  // ---- hover handlers ----
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

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // ---- media helpers ----
  const getFileUrl = (url) =>
    url?.startsWith("http") ? url : `${BASE_URL}${url}`;

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
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // ---- reactions ----
  const userId = currentUser?.id;

  // Toggle reaction locally (optimistic) and notify parent via onReact
  const toggleReaction = (emoji) => {
    setReactedEmojis((prev) => {
      const prevData = prev[emoji] || { count: 0, users: {} };
      const usersMap = { ...(prevData.users || {}) };
      const alreadyReacted = userId && usersMap[userId];

      if (alreadyReacted) {
        // remove
        delete usersMap[userId];
      } else if (userId) {
        usersMap[userId] = 1;
      }

      const newCount = Object.keys(usersMap).length;
      return { ...prev, [emoji]: { count: newCount, users: usersMap } };
    });

    // call parent (parent should handle server + broadcast)
    if (typeof onReact === "function") {
      onReact(message.id, emoji);
    }
  };

  // When user picks emoji from picker
  const handlePickerEmoji = (emojiObject) => {
    const e = emojiObject?.emoji;
    if (!e) return;
    toggleReaction(e);
    setShowEmojiPicker(false);
  };

  // ---- render content (files / text) ----
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

  // ---- JSX ----
  // compute bubble alignment classes
  const bubbleClasses = isOwn
    ? "bg-purple-600 text-white self-end rounded-tr-none"
    : "bg-gray-200 text-gray-900 self-start rounded-tl-none";

  // helper to get count and if current user reacted
  const getEmojiCount = (emoji) => {
    const data = reactedEmojis[emoji];
    if (!data) return 0;
    if (typeof data.count === "number") return data.count;
    return Object.keys(data.users || {}).length;
  };
  const didIReact = (emoji) => {
    return !!(
      reactedEmojis[emoji] &&
      reactedEmojis[emoji].users &&
      userId &&
      reactedEmojis[emoji].users[userId]
    );
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

        {/* Hover actions */}
        {hovered && (
          <div
            className={`absolute -top-9 ${
              isOwn ? "right-2" : "left-2"
            } flex items-center gap-1 bg-white rounded-full shadow-md px-2 py-1 z-20`}
          >
            {["👍", "❤️", "😆", "😮", "😂"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className={`px-1 flex items-center gap-1 hover:bg-gray-100 rounded-full ${
                  didIReact(emoji) ? "bg-gray-200" : ""
                }`}
                title={`React ${emoji}`}
              >
                <span>{emoji}</span>
                {/* show count on hover bar too (optional) */}
                {getEmojiCount(emoji) > 0 && (
                  <span className="text-xs">{getEmojiCount(emoji)}</span>
                )}
              </button>
            ))}

            {/* emoji picker toggle */}
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

            {/* options menu */}
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
                        ✏️ <span>Edit</span>
                      </button>
                      <button
                        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                        onClick={() => {
                          onDelete?.(message.id);
                          setMenuOpen(false);
                        }}
                      >
                        🗑️ <span>Delete</span>
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
                    🔄 <span>Forward</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reactions below (separate from bubble) */}
      <div className="mt-1">
        {Object.keys(reactedEmojis).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(reactedEmojis).map(([emoji, data]) => {
              const count =
                typeof data.count === "number"
                  ? data.count
                  : Object.keys(data.users || {}).length;
              if (count === 0) return null;
              const reacted = !!(userId && data.users && data.users[userId]);
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

      {/* Editing UI (simple inline) */}
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
                  const res = await fetch(`/api/chats/${message.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: editText }),
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    onEdit?.(updated);
                    setIsEditing(false);
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
