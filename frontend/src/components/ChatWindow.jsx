import React, { useEffect, useRef, useState } from "react";
import Message from "./Message";
import { io } from "socket.io-client";

export default function ChatWindow({
  selectedUser,
  currentUserId,
  searchQuery,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.IO
  useEffect(() => {
    if (!currentUserId) return;

    socketRef.current = io("http://localhost:3000");
    socketRef.current.emit("register", { userId: currentUserId });

    // Receive messages from server
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
  }, [currentUserId, selectedUser]);

  // Fetch chat history
  useEffect(() => {
    if (!selectedUser) return;


    const fetchChatHistory = async () => {
      try {
        const res = await fetch(
          `/api/chats/${currentUserId}/${selectedUser.id}`
        );
        const data = await res.json();
        setMessages(data);
        if(messages.length > 0) 
          {
            for(msg in messages){
              console.log("URL:"+msg.file_url);
            }
          }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };

    fetchChatHistory();
  }, [selectedUser, currentUserId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message or file
  const handleSend = async () => {
    if (!text.trim() && !file) return;
    if (!selectedUser) return;

    const formData = new FormData();
    formData.append("senderId", currentUserId);
    formData.append("receiverId", selectedUser.id);
    formData.append("text", text);
    if (file) formData.append("file", file);
    formData.append("type", file ? file.type.split("/")[0] : "text");

    try {
      const res = await fetch("/api/chats/send", {
        method: "POST",
        body: formData,
      });

      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);

      // Emit to Socket.IO
      socketRef.current.emit("privateMessage", newMessage);

      // Reset
      setText("");
      setFile(null);
      setFilePreview(null);
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

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);

    if (
      selected.type.startsWith("image/") ||
      selected.type.startsWith("video/")
    ) {
      setFilePreview(URL.createObjectURL(selected));
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
        {selectedUser ? (
          messages.length > 0 ? (
            messages.map((msg, index) => (
              <Message
                key={msg.id ? `msg-${msg.id}` : `msg-${index}`} // unique key
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                searchQuery={searchQuery}
              />
            ))
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

      {/* Input area */}
      <div className="p-3 border-t flex flex-col gap-2 bg-white">
        {/* File preview */}
        {filePreview && (
          <div className="relative mb-2">
            {file.type.startsWith("image/") && (
              <img
                src={filePreview}
                alt="preview"
                className="max-h-40 rounded-md"
              />
            )}
            {file.type.startsWith("video/") && (
              <video
                src={filePreview}
                className="max-h-40 rounded-md"
                controls
              />
            )}
            <button
              onClick={removeFile}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full px-2 hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2">
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

          <label className="bg-gray-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-300 transition">
            📎
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>

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
