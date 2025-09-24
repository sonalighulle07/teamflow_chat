import React, { useState, useEffect, useRef } from "react";
import Message from "./Message";
import { io } from "socket.io-client";

export default function ChatWindow({ selectedUser, currentUserId, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.IO
  useEffect(() => {
    socketRef.current = io("http://localhost:3000"); // your backend URL
    socketRef.current.emit("register", { userId: currentUserId });

    // Listen for incoming messages
    socketRef.current.on("privateMessage", (msg) => {
      // Only show messages relevant to the current conversation
      if (
        selectedUser &&
        (msg.sender_id === selectedUser.id || msg.receiver_id === selectedUser.id)
      ) {
        setMessages((prev) => [...prev, msg]);
        if (onNewMessage) onNewMessage(msg);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [currentUserId, selectedUser, onNewMessage]);

  // Fetch initial conversation
  useEffect(() => {
    if (!selectedUser) return;

    const fetchConversation = async () => {
      try {
        const res = await fetch(`/api/chats/${currentUserId}/${selectedUser.id}`);
        if (!res.ok) throw new Error("Failed to fetch conversation");
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchConversation();
  }, [selectedUser, currentUserId]);

  const handleSend = async () => {
    if (!text.trim() || !selectedUser) return;

    const msg = {
      senderId: currentUserId,
      receiverId: selectedUser.id,
      text,
      type: "text",
    };

    // Emit message via socket
    socketRef.current.emit("privateMessage", msg);
    setText(""); // clear input
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {selectedUser ? (
          messages.map((msg) => (
            <Message key={msg.id} message={msg} isOwn={msg.sender_id === currentUserId} />
          ))
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={!selectedUser}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={!selectedUser}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
