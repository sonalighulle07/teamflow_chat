import React, { useEffect, useRef, useState } from "react";
import Message from "./Message";
import { io } from "socket.io-client";
import Picker from "emoji-picker-react";
import { PaperClipIcon } from "@heroicons/react/24/outline";
import ForwardModal from "./ForwardModal";
import { useSelector } from "react-redux";
import { URL } from "../config";

export default function ChatWindow({
  selectedTeam,
  messages,
  setMessages,
  currentUserId,
  searchQuery,
}) {
  const { selectedUser, currentUser } = useSelector((state) => state.user);

  const token = sessionStorage.getItem("chatToken");
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [filteredMessages, setFilteredMessages] = useState([]);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const messageRefs = useRef({});

  // Reset messageRefs when conversation changes
  useEffect(() => {
    messageRefs.current = {};
  }, [selectedUser, selectedTeam]);

  // Fetch messages
  const fetchMessages = async () => {
    if (!selectedUser && !selectedTeam) return;
    const endpoint = selectedUser
      ? `/api/chats/${currentUserId}/${selectedUser.id}`
      : `/api/chats/team/${selectedTeam.id}`;
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  // Initialize Socket.IO
  useEffect(() => {
    const socket = io(URL);
    socketRef.current = socket;

    if (currentUserId) socket.emit("register", { userId: currentUserId });

    // Listen for private messages
    socket.on("privateMessage", (msg) => {
      if (
        selectedUser &&
        (msg.sender_id === selectedUser.id ||
          msg.receiver_id === selectedUser.id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // Listen for team messages
    socket.on("teamMessage", (msg) => {
      if (selectedTeam && msg.team_id === selectedTeam.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // Listen for reactions
    socket.on("reaction", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, reactions } : msg))
      );
    });

    // Listen for deleted messages
    socket.on("messageDeleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });

    // Listen for edited messages
    socket.on("messageEdited", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
      );
    });

    return () => socket.disconnect();
  }, [currentUserId, selectedUser, selectedTeam]);

  // Fetch messages when conversation changes
  useEffect(() => {
    fetchMessages();
  }, [selectedUser, selectedTeam]);

  // Handle reactions
  const handleReact = async (messageId, emoji) => {
    try {
      await fetch(`${URL}/api/chats/${messageId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      // Server will emit updated reaction, no local update needed
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  // Delete message
  const handleDelete = async (messageId) => {
    try {
      const res = await fetch(`${URL}/api/chats/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) socketRef.current.emit("deleteMessage", { messageId });
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Edit message
  const handleEdit = async (updatedMsg) => {
    try {
      const res = await fetch(`${URL}/api/chats/${updatedMsg.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: updatedMsg.text }),
      });
      if (res.ok) {
        const updated = await res.json();
        socketRef.current.emit("editMessage", updated);
      }
    } catch (err) {
      console.error("Edit failed:", err);
    }
  };

  // Forward message
  const handleForward = async (messageId, toUserIds) => {
    if (!messageId || !toUserIds?.length) return;
    try {
      const res = await fetch(`${URL}/api/chats/${messageId}/forward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toUserIds, senderId: currentUser?.id }),
      });
      const data = await res.json();
      if (data.success) alert("Message forwarded successfully! ✅");
      else alert("Forward failed! ❌");
    } catch (err) {
      console.error("Forward failed", err);
      alert("Forward failed due to server error!");
    }
  };

  // Filter messages for search
  useEffect(() => {
    if (!searchQuery) setFilteredMessages(messages);
    else {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredMessages(
        messages.filter(
          (msg) =>
            msg.text?.toLowerCase().includes(lowerQuery) ||
            (msg.forwarded_from &&
              msg.forwarded_from.toLowerCase().includes(lowerQuery))
        )
      );
    }
  }, [messages, searchQuery]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll to first search match
  useEffect(() => {
    if (!searchQuery) return;
    if (filteredMessages.length > 0) {
      const firstMsg = filteredMessages[0];
      const key = firstMsg.id || messages.indexOf(firstMsg);
      messageRefs.current[key]?.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [searchQuery, filteredMessages]);

  // Handle file selection
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
    } else setFilePreview(null);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const onEmojiClick = (emojiObject) =>
    setText((prev) => prev + emojiObject.emoji);

  // Send message
  const handleSend = async () => {
    if (!text.trim() && !selectedFile) return;
    if (!selectedUser && !selectedTeam) return;

    const formData = new FormData();
    formData.append("senderId", currentUser.id);
    if (selectedUser) formData.append("receiverId", selectedUser.id);
    if (selectedTeam) formData.append("teamId", selectedTeam.id);
    formData.append("text", text);
    if (selectedFile) formData.append("file", selectedFile);
    formData.append(
      "type",
      selectedFile ? selectedFile.type.split("/")[0] : "text"
    );

    try {
      const res = await fetch(`${URL}/api/chats/send`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const newMessage = await res.json();

      // Emit to server for real-time
      if (selectedUser) socketRef.current.emit("privateMessage", newMessage);
      else if (selectedTeam) socketRef.current.emit("teamMessage", newMessage);

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
      {/* Chat messages */}
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
        {selectedUser || selectedTeam ? (
          (searchQuery ? filteredMessages : messages).length > 0 ? (
            (searchQuery ? filteredMessages : messages).map((msg, index) => {
              const key = msg.id || index;
              const prevMsg = (searchQuery ? filteredMessages : messages)[
                index - 1
              ];
              const msgDate = new Date(
                msg.created_at || msg.timestamp
              ).toDateString();
              const prevDate = prevMsg
                ? new Date(
                    prevMsg.created_at || prevMsg.timestamp
                  ).toDateString()
                : null;
              const showDateSeparator = msgDate !== prevDate;
              messageRefs.current[key] =
                messageRefs.current[key] || React.createRef();

              return (
                <div key={key} ref={messageRefs.current[key]}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-3">
                      <span className="text-gray-500 text-xs">{msgDate}</span>
                    </div>
                  )}
                  <Message
                    message={msg}
                    isOwn={msg.sender_id === currentUserId}
                    onReact={handleReact}
                    searchQuery={searchQuery}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onForward={(msg) => setForwardMsg(msg)}
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
            Select a user or team to start chatting
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
              selectedUser || selectedTeam
                ? "Type a message..."
                : "Select a user or team..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!selectedUser && !selectedTeam}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />

          {/* Emoji picker */}
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

          <button
            onClick={handleSend}
            disabled={!selectedUser && !selectedTeam}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>

      {/* Forward Modal */}
      {forwardMsg && (
        <ForwardModal
          open={!!forwardMsg}
          message={forwardMsg}
          onClose={() => setForwardMsg(null)}
          onForward={handleForward}
        />
      )}
    </div>
  );
}
