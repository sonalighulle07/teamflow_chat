import React from "react";
 
export default function Message({ message, isOwn }) {
  const bubbleClasses = isOwn
    ? "bg-purple-600 text-white self-end"
    : "bg-gray-200 text-gray-900 self-start";
 
  const renderContent = () => {
    switch (message.type) {
      case "image":
        return (
          <img
            src={message.file_url}
            alt="Sent image"
            className="max-w-xs rounded-lg shadow"
          />
        );
      case "video":
        return (
          <video
            controls
            className="max-w-xs rounded-lg shadow"
            src={message.file_url}
          />
        );
      case "audio":
        return (
          <audio controls className="w-48">
            <source
              src={message.file_url}
              type={message.file_type || "audio/mpeg"}
            />
            Your browser does not support the audio element.
          </audio>
        );
      case "file":
        return (
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 border rounded-lg bg-white text-blue-600 hover:underline"
          >
            📄 {message.file_url.split("/").pop()}
          </a>
        );
      default:
        return <p>{message.text}</p>;
    }
  };
 
  return (
    <div
      className={`flex flex-col mb-3 max-w-[75%] ${
        isOwn ? "items-end ml-auto" : "items-start mr-auto"
      }`}
    >
      <div className={`px-4 py-2 rounded-2xl shadow ${bubbleClasses}`}>
        {renderContent()}
      </div>
      <span className="text-xs text-gray-500 mt-1">
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