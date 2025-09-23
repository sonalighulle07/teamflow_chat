import React, { useState, useRef, useEffect } from "react";
import Message from "./Message";
 
export default function ChatWindow({
  selectedUser,
  currentUserId,
  onNewMessage,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);
 
  // Fetch conversation when selectedUser changes
  useEffect(() => {
    if (!selectedUser) return;
 
    const fetchConversation = async () => {
      try {
        const res = await fetch(
          `/api/chats/${currentUserId}/${selectedUser.id}`
        );
        if (!res.ok) throw new Error("Failed to fetch conversation");
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Fetch conversation error:", err);
      }
    };
 
    fetchConversation();
  }, [selectedUser, currentUserId]);
 
  const handleSend = async () => {
    if (!text.trim() || !selectedUser) return;
 
    try {
      const res = await fetch("/api/chats/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: selectedUser.id,
          text,
          type: "text",
        }),
      });
 
      const data = await res.json();
 
      // update frontend messages
      setMessages((prev) => [...prev, data]);
      if (onNewMessage) onNewMessage(data);
      setText("");
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };
 
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
 
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
 
  return (
    <div className="flex-1 flex flex-col">
      {/* Chat messages area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {selectedUser ? (
          messages.map((msg) => (
            <Message
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
            />
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a user to start chatting
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
 
      {/* Input area */}
      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          type="text"
          placeholder={
            selectedUser
              ? "Type a message..."
              : "Select a user to start chatting..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={!selectedUser}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={!selectedUser}
          className={`bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
//chatwindow