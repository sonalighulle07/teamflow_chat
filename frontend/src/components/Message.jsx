import React from "react";

export default function Message({ message, isOwn, searchQuery }) {
  const BASE_URL = "http://localhost:3000"; // backend server

  const bubbleClasses = isOwn
    ? "bg-purple-600 text-white self-end rounded-tr-none"
    : "bg-gray-200 text-gray-900 self-start rounded-tl-none";

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

  const renderContent = () => {
    switch (message.type) {
      case "image":
        if (!message.file_url) return null;
        return (
          <img
            src={getFileUrl(message.file_url)}
            alt="Sent image"
            className="max-w-xs rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
          />
        );

      case "video":
        if (!message.file_url) return null;
        return (
          <video
            controls
            className="max-w-xs rounded-lg shadow-md"
            src={getFileUrl(message.file_url)}
          />
        );

      case "audio":
        if (!message.file_url) return null;
        return (
          <audio controls className="w-48 mt-1">
            <source
              src={getFileUrl(message.file_url)}
              type={message.file_type || "audio/mpeg"}
            />
            Your browser does not support audio.
          </audio>
        );

      case "file":
        if (!message.file_url) return null;
        const fileName = message.file_name || message.file_url.split("/").pop();
        return (
          <div className="flex items-center gap-3 p-2 border rounded-lg bg-gray-100">
            <span className="text-2xl">📄</span>
            <span className="flex-1 break-words">{fileName}</span>
            <a
              href={getFileUrl(message.file_url)}
              download={fileName}
              className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
            >
              ⬇️
            </a>
          </div>
        );

      default:
        return (
          <p className="break-words">{highlightText(message.text || "")}</p>
        );
    }
  };

  return (
    <div
      className={`flex flex-col mb-3 max-w-[75%] px-1 ${
        isOwn ? "items-end ml-auto" : "items-start mr-auto"
      }`}
    >
      <div className={`px-4 py-2 rounded-2xl shadow-md ${bubbleClasses}`}>
        {renderContent()}
      </div>
      <span className="text-xs text-gray-400 mt-1 self-end">
        {new Date(message.created_at || message.timestamp).toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" }
        )}
      </span>
    </div>
  );
}
