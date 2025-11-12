import React, { useState, useRef, useEffect } from "react";
import { FaSmile, FaEllipsisV } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import { URL } from "../config";
import CryptoJS from "crypto-js";

const renderMeetingInvite = (text, metadata) => {
  const lines = text.split("\n");
  return (
    <div className="meeting-invite bg-blue-50 p-3 rounded-lg border border-blue-200">
      <div className="font-semibold text-blue-800">{lines[0]}</div>
      <div className="text-gray-600 mt-2">{lines[2]}</div>
      <div className="mt-3">
        <a
          href={metadata?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
        >
          Join Meeting
        </a>
      </div>
    </div>
  );
};

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

 // ---- AES Decrypt (same key as backend) ----
const KEY = "12345678901234567890123456789012"; // 32-byte key

function safeDecrypt(text) {
  if (!text || typeof text !== "string" || !text.includes(":")) return text || "";

  try {
    const [ivHex, encryptedHex] = text.split(":");
    const iv = CryptoJS.enc.Hex.parse(ivHex.trim());
    const encryptedWA = CryptoJS.enc.Hex.parse(encryptedHex.trim());

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedWA },
      CryptoJS.enc.Utf8.parse(KEY),
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const result = decrypted.toString(CryptoJS.enc.Utf8);
    return result || text;
  } catch (err) {
    console.error("Decryption error:", err.message, text);
    return text;
  }
}


  // ---- Normalize reactions into consistent shape ----
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

// ---- Initialize reactions state ----
const [reactedEmojis, setReactedEmojis] = useState(() => {
  try {
    let decrypted = safeDecrypt(message.reactions);
    try {
      decrypted = JSON.parse(decrypted);
    } catch {}
    return normalizeReactions(decrypted);
  } catch (err) {
    console.error("Failed to decrypt initial reactions:", err);
    return normalizeReactions(message.reactions);
  }
});


  // ---- Update when message changes ----
useEffect(() => {
  if (!message.reactions) return;
  try {
    let decrypted = safeDecrypt(message.reactions);
    try {
      decrypted = JSON.parse(decrypted);
    } catch {}
    setReactedEmojis(normalizeReactions(decrypted));
  } catch (err) {
    console.error("Reaction decryption error:", err);
    setReactedEmojis(normalizeReactions(message.reactions));
  }
}, [message.id, message.reactions]);

// ---- Sync with socket events ----
useEffect(() => {
  if (!socket) return;

  const handleReactionEvent = ({ messageId, reactions }) => {
    if (messageId !== message.id) return;
    try {
      let decrypted = safeDecrypt(reactions);
      try {
        decrypted = JSON.parse(decrypted);
      } catch {}
      setReactedEmojis(normalizeReactions(decrypted));
    } catch (err) {
      console.error("Socket reaction decrypt error:", err);
      setReactedEmojis(normalizeReactions(reactions));
    }
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
  const handleSave = () => {
    if (editText.trim() === "") return;
    onEdit({ ...message, text: editText }); // send updated text to parent
    setIsEditing(false);
  };

  const handleDownload = async (url, fileName) => {
    try {
      console.log("Starting download from URL:", url);
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download file.");
    }
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert("URL copied!");
  };
  const handleOpenUrl = (url) => window.open(url, "_blank");

  const MediaMenu = ({ fileUrl, fileName }) => {
    if (!fileUrl) return null;
    return (
      <div className="absolute top-3 right-[5px]">
        <button
          className="p-1 text-black rounded-full hover:bg-black/50  hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            setMediaMenuOpen((m) => !m);
          }}
        >
          <FaEllipsisV />
        </button>
        {mediaMenuOpen && (
          <div className="flex flex-col space-y-1 p-1 mt-[20px] bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200 w-52">
            {/* Download */}
            <button
              onClick={() => handleDownload(fileUrl, fileName)}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-700 font-medium bg-white rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-all duration-150"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                />
              </svg>
              <span className="text-sm">Download</span>
            </button>

            {/* Copy URL */}
            <button
              onClick={() => handleCopyUrl(fileUrl)}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-700 font-medium bg-white rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-all duration-150"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16h8m-8-4h8m-2-6h6v12a2 2 0 01-2 2H8l-4-4V4a2 2 0 012-2h8z"
                />
              </svg>
              <span className="text-sm">Copy URL</span>
            </button>

            {/* Open in New Tab */}
            <button
              onClick={() => handleOpenUrl(fileUrl)}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-700 font-medium bg-white rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-all duration-150"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 3h7v7m0 0L10 21l-7-7L21 3z"
                />
              </svg>
              <span className="text-sm">Open</span>
            </button>
          </div>
        )}
      </div>
    );
  };

const renderContent = () => {
  
  // ✅ now safely call decryption functions
  const decryptedFileUrl = safeDecrypt(message.file_url);
  const fileUrl = getFileUrl(decryptedFileUrl);
  const fileName = safeDecrypt(message.file_name);
  const decryptedText = safeDecrypt(message.text);

  // ✅ your existing rendering logic
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
          <div className="flex items-center gap-2 p-2 text-black pr-[38px] bg-white border rounded-xl shadow-sm max-w-xs">
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
            <span className="text-[11px] italic text-gray-800">
              Forwarded
            </span>
          )}
          {message.metadata?.type === "meeting-invite" ? (
            <div className="mt-1">
              {renderMeetingInvite(decryptedText, message.metadata)}
            </div>
          ) : (
            <p className="break-words">
              {highlightText(decryptedText || "")}
              {message.edited === 1 && (
                <span className="text-[12px] text-gray-800 ml-1">
                  (Edited)
                </span>
              )}
            </p>
          )}
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
        className={`px-4 py-2 rounded-2xl text-[15px] shadow-md ${bubbleClasses} relative`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderContent()}

        {hovered && (
          <div
            className={`absolute -top-8 ${
              isOwn ? "right-2" : "left-2"
            } flex items-center gap-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-md px-2 py-1 z-20 border border-gray-200 transition-all duration-200`}
          >
            {/* Quick Emojis (smaller size) */}
            {["👍", "❤️", "😆", "😮", "😂"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className={`relative px-1.5 py-0.5 text-base flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 ${
                  didIReact(emoji)
                    ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white"
                    : "bg-transparent text-gray-700 hover:bg-purple-100"
                }`}
                title={`React ${emoji}`}
              >
                <span>{emoji}</span>
                {getEmojiCount(emoji) > 0 && (
                  <span className="absolute -top-2 -right-1 text-[9px] bg-white text-gray-700 px-1 rounded-full shadow-sm">
                    {getEmojiCount(emoji)}
                  </span>
                )}
              </button>
            ))}

            {/* Emoji Picker */}
            <div className="relative">
              <button
                className="p-1 text-gray-600 hover:bg-purple-100 rounded-full transition-all duration-200"
                onClick={() => setShowEmojiPicker((s) => !s)}
                title="More emojis"
              >
                <FaSmile className="text-purple-600 text-sm" />
              </button>
              {showEmojiPicker && (
                <div className="absolute top-8 right-0 z-30 transform scale-90 origin-top-right transition-all duration-200">
                  <div className="rounded-xl shadow-lg border border-gray-200 bg-white/95 backdrop-blur-md">
                    <EmojiPicker
                      onEmojiClick={handlePickerEmoji}
                      theme="light"
                      width={260}
                      height={320}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Options Menu */}
            <div className="relative">
              <button
                className="p-1 text-gray-600 hover:bg-purple-100 rounded-full transition-all duration-200"
                onClick={() => setMenuOpen((m) => !m)}
                title="Options"
              >
                <FaEllipsisV className="text-purple-600 text-sm" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 w-36 bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-xl z-40 animate-fadeIn transition-all duration-200">
                  <div className="flex flex-col divide-y divide-gray-100 text-sm">
                    {isOwn && message.type === "text" && (
                      <button
                        className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-all duration-150"
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
                        className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 transition-all duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(message.id); // ✅ use the prop function
                          setMenuOpen(false);
                        }}
                      >
                        🗑️ <span>Delete</span>
                      </button>
                    )}

                    <button
                      className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 transition-all duration-150"
                      onClick={() => {
                        onForward?.(message);
                        setMenuOpen(false);
                      }}
                    >
                      🔄 <span>Forward</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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

      <div
        className={`flex items-center gap-2 text-xs text-gray-400 mt-1 ${
          isOwn ? "self-end" : "self-start"
        }`}
      >
        {!isOwn && message.username && (
          <span className="font-medium text-gray-600">{message.username}</span>
        )}
        <span>
          {new Date(message.created_at || message.timestamp).toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
          )}
        </span>
      </div>

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
                handleSave();
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
