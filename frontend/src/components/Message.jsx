import React, { useState, useRef, useEffect } from "react";
import { FaSmile, FaEllipsisV } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
// import { URL } from "../config";
import CryptoJS from "crypto-js";
import axios from "axios";

import { URL as API_URL } from "../config";

import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
export default function Message({
  message,
  isOwn,
  selectedUser,
  searchQuery,
  onReact,
  onDelete,
  onEdit,
  onForward,
   chatType, 
    teamId,
  socket,
  setMessages,  // <-- add here
  token,  
}) {
  // ---- AES Decrypt (same key as backend) ----
  const KEY = "12345678901234567890123456789012"; // 32-byte key

  function safeDecrypt(text) {
    if (!text || typeof text !== "string" || !text.includes(":"))
      return text || "";

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
  const currentUser = JSON.parse(sessionStorage.getItem("chatUser") || "null");
  const [editingMessage, setEditingMessage] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
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

    // Listen for updates to this specific message
    const handleMessageEdited = (updatedMsg) => {
      if (updatedMsg.id === message.id) {
        setEditedText(safeDecrypt(updatedMsg.text));
        setEditPreview(
          updatedMsg.file_url
            ? getFileUrl(safeDecrypt(updatedMsg.file_url))
            : null
        );
      }
    };

    // Listen for general message updates (all messages in the chat)
    const handleGlobalMessageEdited = (updatedMsg) => {
      if (setMessages) {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    };

    // Listen for reactions
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

    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageEdited", handleGlobalMessageEdited);
    socket.on("reaction", handleReactionEvent);

    return () => {
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageEdited", handleGlobalMessageEdited);
      socket.off("reaction", handleReactionEvent);
    };
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
  const [messagePosition, setMessagePosition] = useState(null);

  const handleEditClick = (msg, e) => {
    setEditingMessage(msg);
    const rect = e.currentTarget.getBoundingClientRect();
    setMessagePosition({
      top: rect.top + window.scrollY,
      left: rect.left + rect.width / 2,
    });
    setIsEditing(true);
  };

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
  // Add this inside your Message component
  const fetchMessages = async () => {
    if (!selectedUser) return;

    try {
      const res = await axios.get(
        `${API_URL}/api/chats/${currentUser.id}/${selectedUser.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessages(res.data);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };
  const fetchTeamMessages = async () => {
    if (!teamId) return;
    try {
      const res = await axios.get(`${API_URL}/api/teams/${teamId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch team messages:", err);
    }
  };

  const handleSaveMedia = async () => {
    if (!editingMessage) return;

    const formData = new FormData();
    if (editFile instanceof File) formData.append("file", editFile);
    formData.append("text", editedText || "");
    formData.append("edited", true);

    try {
      let res;
      if (chatType === "team" && teamId) {
        // ✅ Edit team message
        res = await axios.put(
          `${API_URL}/api/teams/${teamId}/messages/${editingMessage.id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } else {
        // ✅ Edit private message
        res = await axios.put(
          `${API_URL}/api/chats/chats/${editingMessage.id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      if (res.data.success) {
        setIsEditing(false);
        setEditFile(null);
        setEditPreview(null);

        // Refresh messages depending on type
        if (chatType === "team") fetchTeamMessages();
        else fetchMessages();
      }
    } catch (err) {
      console.error("Failed to update message:", err);
    }
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
    const menuRef = useRef(null);

    if (!fileUrl) return null;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMediaMenuOpen(false);
      }
    };

    useEffect(() => {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="absolute top-3 right-[5px]" ref={menuRef}>
        <button
          className="p-1 text-gray-500 mr-[12px]  bg-white rounded-full hover:bg-purple-100 hover:text-purple-800 transition-all duration-150"
          onClick={(e) => {
            e.stopPropagation(); // prevent bubbling to parent
            setMediaMenuOpen((m) => !m);
          }}
        >
          <FaEllipsisV />
        </button>

        {mediaMenuOpen && (
          <div className="absolute flex flex-col space-y-1 p-2  bg-white/30 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 w-44 right-0 z-50">
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
              className="max-w-[250px] rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
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
                />{" "}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 bg-black  bg-opacity-50 px-4 py-2 rounded-full">
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
          <div className="flex items-center gap-2 p-2 text-black pr-[38px] bg-white border rounded-xl shadow-sm max-w-xs">
            {/* Audio icon */}
            <span className="text-base text-gray-800">🎵</span>

            {/* File name */}
            <span className="flex-1 mx-3  max-w-xs text-black truncate">
              {fileName || "Audio File"}
            </span>

            {/* Audio element */}
            <audio
              ref={audioRef}
              src={fileUrl}
              className="hidden"
              onEnded={() => setIsPlaying(false)}
              controls={false}
            />

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={togglePlay}
                className="p-1  text-purple-700  rounded-full hover:bg-purple-200 transition"
              >
                {isPlaying ? (
                  <FaPause className="w-3 h-3" />
                ) : (
                  <FaPlay className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={toggleMute}
                className="p-1 text-purple-700 rounded-full hover:bg-purple-200 transition"
              >
                {isMuted ? (
                  <FaVolumeMute className="w-4 h-4" />
                ) : (
                  <FaVolumeUp className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Media menu */}
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
                    {isOwn &&
                      ["text", "image", "video", "audio", "file"].includes(
                        message.type
                      ) && (
                        <button
                          onClick={() => {
                            setEditingMessage(message);
                            setEditedText(message.text || "");
                            setEditPreview(
                              message.file_url
                                ? getFileUrl(safeDecrypt(message.file_url))
                                : null
                            );
                            setIsEditing(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-purple-600 hover:bg-purple-50 transition-all duration-150"
                        >
                          ✏️ Edit
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

        {/* Message Status Indicators */}
        {isOwn && (
          <span className="ml-1">
            {message.status === "sent" && "✓"}
            {message.status === "delivered" && "✓✓"}
            {message.status === "read" && (
              <span className="text-blue-500">✓✓</span>
            )}
          </span>
        )}
      </div>

      {/* Editing UI */}
     {isEditing && (
  <div
    style={{
      top: messagePosition?.top || "50%",
      left: messagePosition?.left || "10px", // fallback to left side
    }}
    className="absolute transform -translate-y-full w-72 bg-white border border-gray-300 rounded-2xl shadow-xl p-4 z-50 animate-slide-up transition-all duration-200 "
  >

          {/* Text input for text messages */}
          {editingMessage?.type === "text" && (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2 text-sm  h-[40px] resize-none shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-300"
              rows={3}
              placeholder="Edit your message..."
            />
          )}

          {/* Media preview */}
          {editingMessage?.type !== "text" && (
            <div className="relative mb-3">
              {/* Current media name */}
              {editPreview && (
                <div className="flex items-center justify-between bg-gray-100 rounded-xl p-2 mb-2 text-sm shadow-sm">
                  <span className="truncate">
                    {editPreview.split("/").pop()}
                  </span>
                  <button
                    onClick={() => {
                      setEditPreview(null);
                      setEditFile(null);
                    }}
                    className="text-white bg-red-500 rounded-full px-1 py-0.5 text-xs hover:bg-red-600 transition"
                    title="Remove Media"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Media preview thumbnails */}
              {editPreview && editPreview.match(/\.(jpg|jpeg|png|gif)$/i) && (
                <img
                  src={editPreview}
                  className="w-40 rounded-lg mb-2 shadow-md border border-gray-200"
                />
              )}
              {editPreview && editPreview.match(/\.(mp4|webm|mov)$/i) && (
                <video
                  src={editPreview}
                  controls
                  className="w-44 rounded-lg mb-2 shadow-md border border-gray-200"
                />
              )}
              {editPreview && editPreview.match(/\.(mp3|wav|ogg)$/i) && (
                <audio
                  src={editPreview}
                  controls
                  className="w-full mt-1 mb-2"
                />
              )}

              {/* Add/Replace media */}
              <label className="flex items-center gap-2 cursor-pointer text-purple-600 text-sm hover:underline">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828V16a2 2 0 11-4 0v-8a2 2 0 114 0v.172z"
                  />
                </svg>
                {editPreview ? "Replace Media" : "Add Media"}
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file instanceof File) {
                      setEditFile(file);
                      setEditPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-3">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 rounded-xl bg-gray-200 hover:bg-gray-300 text-sm transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMedia}
              className="px-3 py-1 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-sm transition"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
