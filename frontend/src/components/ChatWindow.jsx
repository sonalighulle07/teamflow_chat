import React, { useState } from "react";
import Message from "./Message";
import Header from "./Header";

export default function ChatWindow({ selectedUser, messages, currentUserId, onNewMessage }) {
  const [text, setText] = useState("");



  const handleSend = async () => {
    if (!text.trim()) return;

    try {
      const res = await fetch("/api/chats/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: selectedUser.id,
          text,
        }),
      });
      const data = await res.json();

      // update frontend messages
      if (onNewMessage) onNewMessage(data);
      setText("");
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="flex-1 flex flex-col">

      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {messages.map((msg, index) => (
          <Message key={index} message={msg} isOwn={msg.senderId === currentUserId} />
        ))}
      </div>

      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleSend}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
