import React, { useEffect, useRef, useState } from "react";
import Message from "./Message";
import { io } from "socket.io-client";
import Picker from "emoji-picker-react";
import { PaperClipIcon } from "@heroicons/react/24/outline";

export default function ChatWindow({
  selectedUser,
  messages,
  setMessages,
  currentUserId,
  searchQuery,
}) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const messageRefs = useRef({}); // for scrolling to searched message

  // Socket setup
  useEffect(() => {
    if (!currentUserId) return;
    socketRef.current = io("http://localhost:3000");
    socketRef.current.emit("register", { userId: currentUserId });

    socketRef.current.on("privateMessage", (msg) => {
      if (
        selectedUser &&
        (msg.sender_id === selectedUser.id ||
          msg.receiver_id === selectedUser.id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socketRef.current.disconnect();
  }, [currentUserId, selectedUser, setMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll to first message matching searchQuery
  useEffect(() => {
    if (!searchQuery) return;
    const lowerQuery = searchQuery.toLowerCase();
    const matchedMessage = messages.find((msg) =>
      msg.text?.toLowerCase().includes(lowerQuery)
    );
    if (matchedMessage) {
      const key = matchedMessage.id || messages.indexOf(matchedMessage);
      messageRefs.current[key]?.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [searchQuery, messages]);

  // File selection & preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (
      file.type.startsWith("image/") ||
      file.type.startsWith("video/") ||
      file.type.startsWith("audio/")
    ) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  // Emoji click
  const onEmojiClick = (emojiObject) => {
    setText((prev) => prev + emojiObject.emoji);
  };

  // Send message
  const handleSend = async () => {
    if (!text.trim() && !selectedFile) return;
    if (!selectedUser) return;

    const formData = new FormData();
    formData.append("senderId", currentUserId);
    formData.append("receiverId", selectedUser.id);
    formData.append("text", text);
    if (selectedFile) formData.append("file", selectedFile);
    formData.append(
      "type",
      selectedFile ? selectedFile.type.split("/")[0] : "text"
    );

    try {
      const res = await fetch("/api/chats/send", {
        method: "POST",
        body: formData,
      });
      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
      socketRef.current.emit("privateMessage", newMessage);
      setText("");
      removeFile();
      setShowEmoji(false);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
        {selectedUser ? (
          messages.length > 0 ? (
            messages.map((msg, index) => {
              const key = msg.id || index;
              messageRefs.current[key] =
                messageRefs.current[key] || React.createRef();
              return (
                <div key={key} ref={messageRefs.current[key]}>
                  <Message
                    message={msg}
                    isOwn={msg.sender_id === currentUserId}
                    searchQuery={searchQuery}
                  />
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-400 mt-10">
              No messages yet
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a user to start chatting
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input + File preview */}
      <div className="p-3 border-t flex flex-col gap-2 bg-white">
        {selectedFile && (
          <div className="relative mb-2 p-2 border rounded-md bg-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {filePreview && selectedFile.type.startsWith("image/") && (
                <img src={filePreview} className="max-h-40 rounded-md" />
              )}
              {filePreview && selectedFile.type.startsWith("video/") && (
                <video
                  src={filePreview}
                  className="max-h-40 rounded-md"
                  controls
                />
              )}
              {filePreview && selectedFile.type.startsWith("audio/") && (
                <audio src={filePreview} controls className="w-64" />
              )}
              {!filePreview && (
                <div className="flex items-center gap-2 p-2 bg-white rounded-md shadow-sm">
                  <span className="text-3xl">
                    {selectedFile.name.endsWith(".pdf")
                      ? "📕"
                      : ["doc", "docx"].includes(
                          selectedFile.name.split(".").pop()
                        )
                      ? "📘"
                      : ["xls", "xlsx"].includes(
                          selectedFile.name.split(".").pop()
                        )
                      ? "📊"
                      : "📄"}
                  </span>
                  <span className="truncate max-w-xs">{selectedFile.name}</span>
                </div>
              )}
            </div>
            <button
              onClick={removeFile}
              className="bg-red-500 text-white rounded-full px-2 hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 relative">
          <input
            type="text"
            placeholder={
              selectedUser ? "Type a message..." : "Select a user..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!selectedUser}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />

          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmoji((prev) => !prev)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-purple-200 transition-colors bg-purple-100"
            title="Emoji"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z"
              />
            </svg>
          </button>

          {/* Emoji picker */}
          {showEmoji && (
            <div className="absolute bottom-14 right-12 z-50">
              <Picker onEmojiClick={onEmojiClick} />
            </div>
          )}

          {/* File upload */}
          <label className="relative flex items-center justify-center w-12 h-12 bg-purple-100 text-purple-600 rounded-full cursor-pointer hover:bg-purple-200 transition">
            <PaperClipIcon className="w-6 h-6" />
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
          </label>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!selectedUser}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
