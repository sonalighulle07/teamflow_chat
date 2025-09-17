import React from 'react';
import Message from "./Message";
import Header from "./Header";

export default function ChatWindow({ selectedUser, messages, currentUserId }) {
  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Select a user to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <Header selectedUser={selectedUser} />

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {messages.map((msg, index) => (
          <Message
            key={index}
            message={msg}
            isOwn={msg.sender_id === currentUserId}
          />
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
          Send
        </button>
      </div>
    </div>
  );
}
