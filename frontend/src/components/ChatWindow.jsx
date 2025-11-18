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
  const [forwardAlert, setForwardAlert] = useState("");
  const { selectedUser, currentUser } = useSelector((state) => state.user);

  const token = sessionStorage.getItem("chatToken");
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState("");
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
      ? `${URL}/api/chats/${currentUserId}/${selectedUser.id}`
      : `${URL}/api/chats/team/${selectedTeam.id}`;
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
  // single socket init -- put this once in your component
  useEffect(() => {
    const socket = io(URL);
    socketRef.current = socket;

    if (currentUserId) socket.emit("register", { userId: currentUserId });

    // private messages
    socket.on("privateMessage", (msg) => {
      if (
        selectedUser &&
        (msg.sender_id === selectedUser.id ||
          msg.receiver_id === selectedUser.id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("teamMessage", (msg) => {
      if (selectedTeam && msg.team_id === selectedTeam.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("reaction", ({ message }) => {
      if (!message || !message.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    });
    // message deleted (remove + toast)
    socket.on("messageDeleted", ({ messageId, senderId }) => {
      // Remove message from the list
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      // Show toast only for the user who deleted
      if (senderId === currentUserId) {
        setDeleteAlert("Message deleted successfully");
        setTimeout(() => setDeleteAlert(""), 3000);
      }
    });

    // message edited (update + toast)
    socket.on("messageEdited", (updatedMsg) => {
      console.log("🟣 messageEdited received on client", updatedMsg);
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );

      // optional: show toast only for sender
      if (updatedMsg.sender_id === currentUserId) {
        setDeleteAlert("Message edited successfully");
        setTimeout(() => setDeleteAlert(""), 3000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [
    currentUserId,
    selectedUser,
    selectedTeam /* leave these if you want socket re-init on change */,
  ]);

  // Fetch messages when conversation changes
  useEffect(() => {
    fetchMessages();
  }, [selectedUser, selectedTeam]);

  // Handle reactions
  const handleReact = async (messageId, emoji) => {
    try {
      // Call backend to store reaction
      await fetch(`${URL}/api/chats/${messageId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });

      // Emit to server for real-time update
      socketRef.current.emit("reaction", {
        messageId,
        emoji,
        userId: currentUserId,
      });
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  const handleDelete = (messageId) => {
    if (!socketRef.current) return;

    socketRef.current.emit("deleteMessage", { messageId });
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
      if (data.success) {
        setForwardAlert("Message forwarded successfully ");
        setTimeout(() => setForwardAlert(""), 3000); // hide after 3 sec
      } else {
        setForwardAlert("Forward failed ");
        setTimeout(() => setForwardAlert(""), 3000);
      }
    } catch (err) {
      console.error("Forward failed", err);
      setForwardAlert("Forward failed due to server error ");
      setTimeout(() => setForwardAlert(""), 3000);
    }
  };

  // Filter messages for search
  useEffect(() => {
    if (!searchQuery) setFilteredMessages(messages);
    else {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredMessages(
        messages.filter((msg) => {
          const textMatch = msg.text?.toLowerCase().includes(lowerQuery);
          const forwardedFromMatch =
            typeof msg.forwarded_from === "string" &&
            msg.forwarded_from.toLowerCase().includes(lowerQuery);
          return textMatch || forwardedFromMatch;
        })
      );
    }
  }, [messages, searchQuery]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll to first search match
  useEffect(() => {
    if (!searchQuery || filteredMessages.length === 0) return;

    // Wait for React to render filtered messages first
    const timer = setTimeout(() => {
      const firstMsg = filteredMessages[0];
      const key = firstMsg.id || messages.indexOf(firstMsg);

      const ref = messageRefs.current[key];
      if (ref?.current) {
        ref.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 300); // delay to allow render

    return () => clearTimeout(timer);
  }, [searchQuery, filteredMessages]);

  // Handle file selection
 const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setSelectedFile(file); // store actual file
  setFilePreview(URL.createObjectURL(file)); // preview
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
      // else if (selectedTeam) socketRef.current.emit("teamMessage", newMessage);

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
    <div className="flex-1 flex flex-col h-full relative">
      {/* Temporary delete alert */}
      {deleteAlert && (
        <div className="fixed top-[100px] right-[36%] bg-green-500 text-white p-3 rounded shadow z-50">
          {deleteAlert}
        </div>
      )}

      {/* Temporary forward alert */}
      {forwardAlert && (
        <div className="fixed top-[100px] right-[36%] bg-blue-400 text-white p-3 rounded shadow z-50">
          {forwardAlert}
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto border border-gray-300 rounded-lg ">
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
                    socket={socketRef.current} // <<< Pass socket here
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
      <div className="p-3 border-t border-gray-300 flex flex-col gap-2 bg-white">
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

        <div className="flex items-center gap-2 relative bg-white  dark:bg-gray-900 px-3 py-1 rounded-[10px] border text-[15px] border-gray-300 dark:border-gray-700 shadow-sm">
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
            className="flex-1 bg-transparent px-3 py-1 border-0 border-b-2 border-transparent focus:outline-none focus:ring-0 placeholder-gray-400
  focus:border-transparent focus:bg-gradient-to-r focus:from-purple-400 focus:to-purple-600 focus:[background-position:0_100%] focus:[background-size:100%_2px] focus:[background-repeat:no-repeat] rounded-full"
          />

          {/* Emoji Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmoji((prev) => !prev)}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-purple-100  transition-all duration-200"
              title="Emoji"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-gray-500  hover:text-purple-700"
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
              <div className="absolute bottom-14 right-0 z-30 transform scale-90 origin-bottom-right transition-all duration-200">
                <div className="rounded-xl shadow-lg border border-gray-200 bg-white/95 backdrop-blur-md">
                  <Picker
                    onEmojiClick={onEmojiClick}
                    theme="light"
                    width={260}
                    height={320}
                  />
                </div>
              </div>
            )}
          </div>

          {/* File upload */}
          <label className="relative flex items-center justify-center w-7 h-7  rounded-full cursor-pointer hover:bg-purple-100 transition">
            <PaperClipIcon className="w-5 h-5  text-gray-600  hover:text-purple-700" />
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
          </label>

          <button
            onClick={handleSend}
            disabled={!selectedUser && !selectedTeam}
            className="flex items-center justify-center p-[4px] bg-white text-purple-600 rounded-full hover:bg-purple-100 transition disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5  text-gray-500  hover:text-purple-700"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
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
