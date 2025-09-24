import React, { useEffect, useRef, useState } from "react";
import Message from "./Message";
import { io } from "socket.io-client";

export default function ChatWindow({
  selectedUser,
  currentUserId,
  searchQuery,
}) {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.IO once
  useEffect(() => {
    if (!currentUserId) return;

    socketRef.current = io("http://localhost:3000");
    socketRef.current.emit("register", { userId: currentUserId });

    socketRef.current.on("receiveMessage", (msg) => {
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

  // Fetch chat history when selectedUser changes
  useEffect(() => {
    if (!selectedUser) return;

    const fetchChatHistory = async () => {
      try {
        const res = await fetch(
          `/api/chats/${currentUserId}/${selectedUser.id}`
        );
        const data = await res.json();
        setMessages(data); // ← store fetched messages
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };

    fetchChatHistory();
  }, [selectedUser, currentUserId]);

  const handleSend = async (text) => {
    if (!text.trim() || !selectedUser) return;

    const msg = {
      senderId: currentUserId,
      receiverId: selectedUser.id,
      text,
      type: "text",
    };

    try {
      const res = await fetch("/api/chats/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
      const newMessage = await res.json();

      setMessages((prev) => [...prev, newMessage]);
      socketRef.current.emit("sendMessage", newMessage);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e.target.value);
      e.target.value = "";
    }
  };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
        {selectedUser ? (
          messages.length > 0 ? (
            messages.map((msg) => (
              <Message
                key={
                  msg.id || `${msg.sender_id}-${msg.receiver_id}-${msg.text}`
                }
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

      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          type="text"
          placeholder={selectedUser ? "Type a message..." : "Select a user..."}
          onKeyDown={handleKeyPress}
          disabled={!selectedUser}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={() => {
            const input = document.querySelector(
              'input[placeholder="Type a message..."]'
            );
            if (input) {
              handleSend(input.value);
              input.value = "";
            }
          }}
          disabled={!selectedUser}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
