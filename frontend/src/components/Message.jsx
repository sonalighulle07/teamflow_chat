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

  // ---- normalize reactions ----
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
      if (val == null) out[emoji] = { count: 0, users: {} };
      else if (typeof val === "number") out[emoji] = { count: val, users: {} };
      else if (typeof val === "object") {
        if ("count" in val) {
          const users =
            val.users && typeof val.users === "object" ? val.users : {};
          out[emoji] = {
            count: Number(val.count || Object.keys(users).length || 0),
            users,
          };
        } else {
          const users = val;
          out[emoji] = { count: Object.keys(users).length, users };
        }
      } else out[emoji] = { count: 0, users: {} };
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
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);

  const audioRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const [reactedEmojis, setReactedEmojis] = useState(() =>
    normalizeReactions(message.reactions)
  );

  useEffect(() => {
    setReactedEmojis(normalizeReactions(message.reactions));
  }, [message.reactions, message.id]);

  // socket reaction sync
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
      setMediaMenuOpen(false);
    }, 120);
  };
  useEffect(
    () => () =>
      hoverTimeoutRef.current && clearTimeout(hoverTimeoutRef.current),
    []
  );

  // ---- media helpers ----
  const getFileUrl = (url) => (url?.startsWith("http") ? url : `${URL}${url}`);
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

  const userId = currentUser?.id;
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
    if (typeof onReact === "function") onReact(message.id, emoji);
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

  const handleDownload = (url, fileName) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "file";
    link.click();
  };
  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert("URL copied!");
  };
  const handleOpenUrl = (url) => window.open(url, "_blank");

  const MediaMenu = ({ fileUrl, fileName }) => {
    if (!fileUrl) return null;
    return (
      <div className="absolute top-1 right-1">
        <button
          className="p-1 text-white bg-black/50 rounded-full hover:bg-black/70"
          onClick={(e) => {
            e.stopPropagation();
            setMediaMenuOpen((m) => !m);
          }}
        >
          <FaEllipsisV />
        </button>
        {mediaMenuOpen && (
          <div className="absolute right-0 mt-2 w-36 text-black bg-white border border-gray-200 rounded shadow-lg z-50">
            <button
              className="w-full px-3 py-2 text-left hover:bg-gray-100"
              onClick={() => handleDownload(fileUrl, fileName)}
            >
              Download
            </button>
            <button
              className="w-full px-3 py-2 text-left hover:bg-gray-100"
              onClick={() => handleCopyUrl(fileUrl)}
            >
              Copy URL
            </button>
            <button
              className="w-full px-3 py-2 text-left hover:bg-gray-100"
              onClick={() => handleOpenUrl(fileUrl)}
            >
              Open in new tab
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    const fileUrl = getFileUrl(message.file_url);
    const fileName = message.file_name || message.file_url?.split("/").pop();

    switch (message.type) {
      case "image":
        if (!fileUrl) return null;
        return (
          <div className="relative inline-block">
            <img
              src={fileUrl}
              alt="Sent"
              className="max-w-xs rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
              onDoubleClick={handleDoubleClick}
            />
            <MediaMenu fileUrl={fileUrl} fileName={fileName} />
            {isFullscreen && (
              <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                <img
                  src={fileUrl}
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
        if (!fileUrl) return null;
        return (
          <div className="relative inline-block">
            <video
              src={fileUrl}
              className="max-w-xs rounded-lg shadow-md cursor-pointer"
              controls
              muted
            />
            <MediaMenu fileUrl={fileUrl} fileName={fileName} />
          </div>
        );

      case "audio":
        if (!fileUrl) return null;
        return (
          <div className="relative inline-block">
            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-xl shadow-sm max-w-md w-full">
              <span className="text-2xl">🎵</span>
              <audio
                ref={audioRef}
                src={fileUrl}
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
            <MediaMenu fileUrl={fileUrl} fileName={fileName} />
          </div>
        );

      case "file":
      case "application":
        if (!fileUrl) return null;
        const fileExt = fileName?.split(".").pop()?.toLowerCase();
        const getFileIcon = () => {
          if (fileExt === "pdf") return "📕";
          if (["doc", "docx"].includes(fileExt)) return "📘";
          if (["xls", "xlsx"].includes(fileExt)) return "📊";
          return "📄";
        };
        return (
          <div className="relative inline-block">
            <div className="flex items-center gap-2 p-2 text-black bg-white border rounded-xl shadow-sm max-w-xs">
              <span className="text-2xl">{getFileIcon()}</span>
              <span className="truncate">{fileName}</span>
            </div>
            <MediaMenu fileUrl={fileUrl} fileName={fileName} />
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
  const getEmojiCount = (emoji) => {
    const data = reactedEmojis[emoji];
    if (!data) return 0;
    return typeof data.count === "number"
      ? data.count
      : Object.keys(data.users || {}).length;
  };
  const didIReact = (emoji) => !!reactedEmojis[emoji]?.users?.[userId];

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
        <div
          className={`absolute -top-9 ${
            isOwn ? "right-2" : "left-2"
          } flex items-center gap-1 bg-white rounded-full shadow-md px-2 py-1 z-20 transition-all duration-200 
  ${
    hovered ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
  }`}
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
              {getEmojiCount(emoji) > 0 && (
                <span className="text-xs">{getEmojiCount(emoji)}</span>
              )}
            </button>
          ))}

          {/* Emoji picker button */}
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

          {/* Options menu */}
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
                {isOwn && message.type === "text" && (
                  <button
                    className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-purple-100 rounded transition-colors"
                    onClick={() => {
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    ✏️ <span>Edit</span>
                  </button>
                )}
                {isOwn && (
                  <button
                    className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                    onClick={() => {
                      onDelete?.(message.id);
                      setMenuOpen(false);
                    }}
                  >
                    🗑️ <span>Delete</span>
                  </button>
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
      </div>

      {/* Reactions below bubble */}
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

      {/* Editing UI */}
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
                  const token = sessionStorage.getItem("chatToken");
                  if (!token) return console.error("No token found");
                  const res = await fetch(`${URL}/api/chats/${message.id}`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ text: editText }),
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
          </div>
        </div>
      )}
    </div>
  );
}
