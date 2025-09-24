import React from "react";

export default function Message({ message, isOwn, searchQuery }) {
  const bubbleClasses = isOwn
    ? "bg-purple-600 text-white self-end rounded-tr-none"
    : "bg-gray-200 text-gray-900 self-start rounded-tl-none";

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
        return (
          <img
            src={message.file_url}
            alt="Sent image"
            className="max-w-xs rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
          />
        );
      case "video":
        return (
          <video
            controls
            className="max-w-xs rounded-lg shadow-md"
            src={message.file_url}
          />
        );
      case "audio":
        return (
          <audio controls className="w-48 mt-1">
            <source
              src={message.file_url}
              type={message.file_type || "audio/mpeg"}
            />
            Your browser does not support audio.
          </audio>
        );
      case "file":
        return (
          <a
            href={message.file_url}
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
