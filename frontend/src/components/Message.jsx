import React from "react";

export default function Message({ message, isOwn, searchQuery }) {
  const bubbleClasses = isOwn
    ? "bg-purple-600 text-white self-end rounded-tr-none"
    : "bg-gray-200 text-gray-900 self-start rounded-tl-none";

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
    if (message.type === "image" && message.file_url) {
      return (
        <img
          src={message.file_url}
          alt="Sent"
          className="max-w-xs max-h-60 rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
        />
      );
    }

    if (message.type === "video" && message.file_url) {
      return (
        <video
          controls
          className="max-w-xs max-h-60 rounded-lg shadow-md"
          src={message.file_url}
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    if (message.type === "audio" && message.file_url) {
      return (
        <audio controls className="w-48 mt-1">
          <source
            src={message.file_url}
            type={message.file_type || "audio/mpeg"}
          />
          Your browser does not support audio.
        </audio>
      );
    }

    if (message.type === "file" && message.file_url) {
      const fileName = message.file_url.split("/").pop();
      const ext = fileName.split(".").pop().toLowerCase();

      let icon;
      if (["pdf"].includes(ext)) icon = "📄";
      else if (["doc", "docx"].includes(ext)) icon = "📝";
      else if (["xls", "xlsx"].includes(ext)) icon = "📊";
      else if (["ppt", "pptx"].includes(ext)) icon = "📈";
      else icon = "📁";

      return (
        <a
          href={message.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 border rounded-lg bg-purple-100 text-gray-800 hover:bg-purple-200 transition"
        >
          <span className="text-2xl">{icon}</span>
          <span className="break-words max-w-xs">{fileName}</span>
        </a>
      );
    }

    // Default: text message
    return <p className="break-words">{highlightText(message.text || "")}</p>;
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
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )}
      </span>
    </div>
  );
}
