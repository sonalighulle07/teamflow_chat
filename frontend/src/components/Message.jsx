import React, { useState } from "react";
import { FaSmile, FaEllipsisV } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react"; // ✅ emoji-picker-react वापरलं

export default function Message({
  message,
  isOwn,
  searchQuery,
  onReact,
  onDelete,
  onEdit,
  onForward,
  onReply,
}) {
  const BASE_URL = "http://localhost:3000";
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

export default function Message({ message, isOwn, searchQuery }) {
  const BASE_URL = "http://localhost:3000"; // backend server

  const bubbleClasses = isOwn
    ? "bg-purple-600 text-white self-end rounded-tr-none"
    : "bg-gray-200 text-gray-900 self-start rounded-tl-none";

  const getFileUrl = (url) =>
    url.startsWith("http") ? url : `${BASE_URL}${url}`;

  // Build full file URL
  const getFileUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${BASE_URL}${url}`;
  };

  // Highlight search text
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
  const handleReaction = (emoji) => {
    if (onReact) onReact(message.id, emoji);
  };

  const handleZoomIn = () => setZoom((z) => z + 0.2);
  const handleZoomOut = () => setZoom((z) => Math.max(1, z - 0.2));
  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setZoom(1);
  };

  const renderContent = () => {
    switch (message.type) {
      case "image":
        if (!message.file_url) return null;
        const imgProgress = message.uploadProgress || 100;
        return (
          <div className="relative inline-block">
            {/* Image thumbnail */}
            <img
              src={getFileUrl(message.file_url)}
              alt="Sent image"
              className="max-w-xs rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setPreviewImage(getFileUrl(message.file_url));
                setMenuOpen(false);
              }}
              onDoubleClick={handleDoubleClick} // ✅ Correct
            />

            {/* 3 dots menu */}
            <div className="absolute top-2 right-2">
              <button
                className="p-1 rounded-full text-black hover:bg-gray-100 bg-white"
                onClick={() => {
                  setPreviewImage(getFileUrl(message.file_url));
                  setMenuOpen(false);
                  onDoubleClick = { handleDoubleClick };
                }}
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white shadow-lg rounded-lg z-10 border border-gray-100">
                  <a
                    href={getFileUrl(message.file_url)}
                    download={
                      message.file_name || message.file_url.split("/").pop()
                    }
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-purple-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Download
                  </a>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {imgProgress < 100 && (
              <div className="w-full h-1 bg-gray-200 rounded mt-1">
                <div
                  className="h-1 bg-purple-600 rounded"
                  style={{ width: `${imgProgress}%` }}
                ></div>
              </div>
            )}

            {/* Fullscreen */}
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

          <img
            src={getFileUrl(message.file_url)}
            alt="Sent image"
            className="max-w-xs rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
          />
        );
      case "video":
        if (!message.file_url) return null;
        const videoProgress = message.uploadProgress || 100;
        return (
          <div className="relative inline-block max-w-xs rounded-lg shadow-lg overflow-hidden bg-black group">
            <video
              src={getFileUrl(message.file_url)}
              className="w-full h-auto rounded-lg cursor-pointer"
              controls
              muted={true}
              onClick={() => setPreviewVideo(getFileUrl(message.file_url))}
            />

            {/* 3 dots menu */}
            <div className="absolute top-2 right-2">
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-white shadow-lg rounded-lg z-10 border border-gray-100">
                  <a
                    href={getFileUrl(message.file_url)}
                    download={
                      message.file_name || message.file_url.split("/").pop()
                    }
                    className="block px-3 py-1.5 text-sm text-gray-700 hover:bg-purple-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Download
                  </a>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {videoProgress < 100 && (
              <div className="w-full h-1 bg-gray-200 rounded mt-1">
                <div
                  className="h-1 bg-purple-600 rounded"
                  style={{ width: `${videoProgress}%` }}
                ></div>
              </div>
            )}
          </div>
          <video
            controls
            className="max-w-xs rounded-lg shadow-md"
            src={getFileUrl(message.file_url)}
          />
        );

      case "audio":
        if (!message.file_url) return null;
        const audioProgress = message.uploadProgress || 100;
        return (
          <div className="flex items-center gap-3 p-2 bg-gray-100 rounded-xl shadow-sm max-w-xs w-full">
            <span className="text-2xl">🎵</span>
            <audio
              controls
              className="w-full h-10 rounded-md"
              src={getFileUrl(message.file_url)}
            >
              <source
                src={getFileUrl(message.file_url)}
                type={message.file_type || "audio/mpeg"}
              />
              Your browser does not support audio.
            </audio>

            {/* 3 dots menu */}
            <div className="relative group">
              <button className="p-1 rounded-full text-gray-600 hover:bg-gray-200 bg-white/80 shadow-sm">
                ⋮
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white shadow-lg rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto z-10 border border-gray-100">
                <a
                  href={getFileUrl(message.file_url)}
                  download={
                    message.file_name || message.file_url.split("/").pop()
                  }
                  className="block px-3 py-1.5 text-sm text-gray-700 hover:bg-purple-50"
                >
                  Download
                </a>
              </div>
            </div>

            {/* Progress bar */}
            {audioProgress < 100 && (
              <div className="absolute bottom-1 left-12 right-2 h-1 bg-gray-200 rounded">
                <div
                  className="h-1 bg-purple-600 rounded"
                  style={{ width: `${audioProgress}%` }}
                ></div>
              </div>
            )}
          </div>
          <audio controls className="w-48 mt-1">
            <source
              src={getFileUrl(message.file_url)}
              type={message.file_type || "audio/mpeg"}
            />
            Your browser does not support audio.
          </audio>
        );

      case "file":
      case "application":
        if (!message.file_url) return null;
        const fileName = message.file_name || message.file_url.split("/").pop();
        const fileExt = fileName.split(".").pop().toLowerCase();

        const getFileIcon = () => {
          if (fileExt === "pdf") return "📕";
          if (["doc", "docx"].includes(fileExt)) return "📘";
          if (["xls", "xlsx"].includes(fileExt)) return "📊";
          return "📄";
        };

        return (
          <div className="flex items-center justify-between p-1 rounded-xl shadow-sm bg-white border border-gray-200 w-55">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-2xl">{getFileIcon()}</span>
              <span className="truncate text-sm font-medium text-gray-800">
                {fileName}
              </span>
            </div>

            <div className="relative group">
              <button className="p-1 rounded-full text-black  hover:bg-gray-100">
                ⋮
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white shadow-lg rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto z-10 border border-gray-100">
                <a
                  href={getFileUrl(message.file_url)}
                  download={fileName}
                  className="block px-3 py-1.5 text-sm text-gray-700 hover:bg-purple-50"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        );

          <a
            href={getFileUrl(message.file_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 border rounded-lg bg-white text-blue-600 hover:underline hover:bg-gray-100 transition"
          >
            📄 {message.file_url.split("/").pop()}
          </a>
        );
      default:
        return (
          <p className="break-words">{highlightText(message.text || "")}</p>
        );
    }
  };

  return (
    <div
      className={`flex flex-col mb-3 max-w-[75%] relative ${
        isOwn ? "items-end ml-auto" : "items-start mr-auto"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
        setShowEmojiPicker(false);
      }}
    >
      <div
        className={`px-4 py-2 rounded-2xl shadow-md ${bubbleClasses} relative`}
      >
        {renderContent()}
        {/* Hover action bar */}
        {hovered && (
          <div
            className="absolute -top-9 right-2 flex items-center gap-1 bg-white rounded-full shadow-md px-2 py-1 z-20"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* Quick reactions */}
            {["👍", "❤️", "😆", "😮", "😂"].map((emoji) => (
              <button
                key={emoji}
                className="px-1 hover:bg-gray-100 rounded-full"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </button>
            ))}

            {/* Emoji picker button */}
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
                    onEmojiClick={(emoji) => handleReaction(emoji.emoji)}
                    theme="light"
                  />
                </div>
              )}
            </div>

            {/* 3-dot menu */}
            <div className="relative">
              <button
                className="p-1 text-gray-600 hover:bg-gray-100 rounded-full"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <FaEllipsisV />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 w-40 bg-white shadow-lg rounded-lg z-30 border border-gray-200 text-gray-600">
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-purple-50"
                    onClick={() => onReply && onReply(message.id)}
                  >
                    Reply
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-purple-50"
                    onClick={() => onEdit && onEdit(message.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-purple-50"
                    onClick={() => onDelete && onDelete(message.id)}
                  >
                    Delete
                  </button>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-purple-50"
                    onClick={() => onForward && onForward(message.id)}
                  >
                    Forward
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs text-gray-400 mt-1 self-end">
        {new Date(message.created_at || message.timestamp).toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" }
        )}
      </span>
    </div>
  );
}
