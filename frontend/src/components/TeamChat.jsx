import { useEffect, useState, useRef } from "react";
import socket from "./calls/hooks/socket";
import { URL } from "../config";

export default function TeamChat({ team, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch messages when team changes
  useEffect(() => {
    if (!team) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${URL}/api/teams/${team.id}/messages`);
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Error fetching messages:", err);
        setMessages([]);
      }
    };
    fetchMessages();
  }, [team]);

  // Join socket room for real-time updates
  useEffect(() => {
    if (!team || !currentUser) return;

    socket.emit("joinTeamRoom", team.id);

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on("teamMessage", handleNewMessage);

    return () => {
      socket.off("teamMessage", handleNewMessage);
      socket.emit("leaveTeamRoom", team.id);
    };
  }, [team, currentUser]);

  // Send message
  const handleSend = async () => {
    if (!newMsg.trim() || !team) return;

    const msgObj = {
      team_id: team.id,
      sender_id: currentUser.id,
      sender_username: currentUser.username,
      text: newMsg,
      file_url: null,
      type: "text",
      created_at: new Date().toISOString(),
    };

    // Optimistic UI
    setMessages((prev) => [...prev, msgObj]);
    setNewMsg("");

    try {
      await fetch(`${URL}/api/teams/${team.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: currentUser.id,
          text: newMsg,
          file_url: null,
          type: "text",
        }),
      });
      // Optionally, emit to socket
      socket.emit("sendTeamMessage", msgObj);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-300">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg ${
              msg.sender_id === currentUser.id
                ? "bg-blue-100 self-end"
                : "bg-gray-200 self-start"
            }`}
          >
            <strong>{msg.sender_username}:</strong> {msg.text}
            <div className="text-xs text-gray-500">
              {new Date(msg.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1"
          placeholder="Type a message..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
