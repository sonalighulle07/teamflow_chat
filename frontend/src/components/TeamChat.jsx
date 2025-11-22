import React, { useEffect, useRef, useState } from "react";

import Picker from "emoji-picker-react";
import { PaperClipIcon } from "@heroicons/react/24/outline";
import Message from "./Message";
import ForwardModal from "./ForwardModal";
import { URL } from "../config";
import axios from "axios";
import { useDispatch } from "react-redux";
import { fetchTeamMembers } from "../Store/Features/Teams/teamThunk";
import { useSelector } from "react-redux";
import socket from "./calls/hooks/socket";

export default function TeamChat({
  currentUser,
  searchQuery = "",
  setSearchQuery,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [forwardAlert, setForwardAlert] = useState("");
  const token = sessionStorage.getItem("chatToken");
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [toasts, setToasts] = useState([]);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const messageRefs = useRef({});
 
  const dispatch = useDispatch();
  const selectedTeamMembers = useSelector(
    (state) => state.team.selectedTeamMembers
  );

  // --- Filter Messages by Search ---

  useEffect(() => {
    console.log("Team members updated:", selectedTeamMembers);
  }, [selectedTeamMembers]);

  const selectedTeam = useSelector((state) => state.team.selectedTeam);
  // --- Initialize socket ---
  useEffect(() => {
    if (!selectedTeam || !currentUser) return;

    socketRef.current = socket;

    // Register user & join room
    socket.emit("register", { userId: currentUser.id });
    socket.emit("joinRoom", { teamId: selectedTeam.id });
    socketRef.current = socket;

    // ========= REAL-TIME TEAM MESSAGE =========
    socket.on("teamMessage", (msg) => {
      if (msg.team_id === selectedTeam.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // ========= MESSAGE EDITED =========
    socket.on("teamMessageEdited", (msg) => {
      if (msg.team_id !== selectedTeam.id) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m))
      );
    });

    // ========= MESSAGE DELETED =========
    socket.on("teamMessageDeleted", ({ messageId, teamId }) => {
      if (teamId !== selectedTeam.id) return;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    // ========= REACTION UPDATED =========
    socket.on("teamReactionUpdated", (data) => {
      if (data.teamId !== selectedTeam.id) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? {
                ...m,
                reactions: {
                  ...(m.reactions || {}),
                  [data.userId]: data.emoji,
                },
              }
            : m
        )
      );
    });

    return () => {
      socket.emit("leaveRoom", { teamId: selectedTeam.id });
      socket.disconnect();
    };
  }, [selectedTeam, currentUser]);

  // --- Fetch messages ---
  useEffect(() => {
    if (!selectedTeam?.id || !token) return;

    console.log("Fetching team members for team:", selectedTeam.id);
    dispatch(fetchTeamMembers());

    const fetchMessages = async () => {
      console.log("Fetching messages for team:", selectedTeam.id);
      try {
        const res = await axios.get(
          `${URL}/api/teams/${selectedTeam.id}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const messagesData = Array.isArray(res.data) ? res.data : [];
        console.log("Fetched messages:", messagesData);
        setMessages(messagesData);
        messageRefs.current = {};
      } catch (err) {
        console.error(
          "Fetch messages error:",
          err.response?.data || err.message
        );
        setMessages([]);
      }
    };

    fetchMessages();
  }, [selectedTeam, token, dispatch]);

  // --- Scroll to bottom ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    console.log(messages);
  }, [messages]);

  // Filter messages for search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredMessages(messages);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredMessages(
        messages.filter((m) => (m.text || "").toLowerCase().includes(q))
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

    requestAnimationFrame(() => {
      const first = filteredMessages[0];
      const ref = messageRefs.current[first.id];

      if (ref?.current) {
        ref.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  }, [searchQuery, filteredMessages]);

  const showToast = (msg, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000); // auto-hide after 3 seconds
  };

  // --- File handling ---
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (typeof window !== "undefined" && typeof window.URL?.createObjectURL === "function") {
    const url = window.URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setFilePreview(url);
  } else {
    console.error("Browser does not support URL.createObjectURL");
    // fallback: maybe just store file name, skip preview
    setSelectedFile(file);
    setPreviewUrl(null);
    setFilePreview(null);
  }
};




  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const onEmojiClick = (emojiObject) =>
    setText((prev) => prev + emojiObject.emoji);

  // --- Send message ---
  const handleSend = async () => {
    if (!text.trim() && !selectedFile) return;
    if (!selectedTeam?.id) return;
    if (!token) return alert("Not authorized");

    const formData = new FormData();
    if (text.trim()) formData.append("text", text);
    if (selectedFile) formData.append("file", selectedFile);

    try {
      const res = await fetch(`${URL}/api/teams/${selectedTeam.id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Send message error:", errText);
        return;
      }

      // The saved message returned from backend
      const newMessage = await res.json();

      socketRef.current?.emit("sendTeamMessage", {
        ...newMessage,
        team_id: selectedTeam.id,
      });

      // Reset UI
      setText("");
      removeFile();
      setShowEmoji(false);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageDate = (rawDate) => {
    if (!rawDate) return "";
    const date = new Date(rawDate);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // Compare only the dates (ignore time)
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    // Otherwise show short date like 'Oct 16, 2025'
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // --- Edit message (team) ---
  const handleEdit = async (updatedMsg) => {
    if (!updatedMsg?.id) return;

    try {
      const res = await fetch(
        `${URL}/api/teams/${selectedTeam.id}/messages/${updatedMsg.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: updatedMsg.text }),
        }
      );

      if (!res.ok) {
        console.error("Edit failed:", await res.text());
        return;
      }

      // Optimistic UI update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === updatedMsg.id
            ? { ...m, text: updatedMsg.text, edited: 1 }
            : m
        )
      );
      showToast("Message edited successfully", "success");

      // 🔥 Correct real-time emit
      socketRef.current?.emit("editTeamMessage", {
        id: updatedMsg.id,
        text: updatedMsg.text,
        team_id: selectedTeam.id,
        sender_id: currentUser.id,
      });
    } catch (err) {
      console.error("Edit failed:", err);
    }
  };

  // --- Delete message (team) ---
  const handleDelete = async (messageId) => {
    if (!selectedTeam?.id) return;

    const teamId = selectedTeam.id;

    try {
      const res = await fetch(
        `${URL}/api/teams/${teamId}/messages/${messageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.text();
        console.error("Delete failed:", data);
        return;
      }

      // 🔥 Optimistic UI (remove from current screen)
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      showToast("Message deleted successfully", "success");

      // 🔥 REAL-TIME DELETE EMIT (correct event name)
      socketRef.current?.emit("deleteTeamMessage", {
        messageId,
        teamId,
      });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleForward = async (messageId, toUserIds) => {
    if (!messageId || !Array.isArray(toUserIds) || toUserIds.length === 0)
      return;
    try {
      const res = await fetch(`${URL}/api/chats/${messageId}/forward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toUserIds, senderId: currentUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        setForwardAlert("Message forwarded successfully");
        setTimeout(() => setForwardAlert(""), 3000);
      } else {
        setForwardAlert("Forward failed");
        setTimeout(() => setForwardAlert(""), 3000);
      }
    } catch (err) {
      console.error("Forward failed:", err);
      setForwardAlert("Forward failed due to server error");
      setTimeout(() => setForwardAlert(""), 3000);
    }
  };
  // --- Handle Reaction (Team) ---
  const handleReaction = async (messageId, emoji) => {
    if (!selectedTeam?.id || !token) return;

    try {
      // Optimistic UI update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: {
                  ...(m.reactions || {}),
                  [currentUser.id]: emoji,
                },
              }
            : m
        )
      );

      // Call API to save reaction
      const res = await fetch(
        `${URL}/api/teams/${selectedTeam.id}/messages/${messageId}/reactions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reactions: { [currentUser.id]: emoji } }),
        }
      );

      if (!res.ok) {
        console.error("Reaction API failed:", await res.text());
        // Optionally revert optimistic update
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: {
                    ...(m.reactions || {}),
                    [currentUser.id]: emoji,
                  },
                }
              : m
          )
        );
      } else {
        // Emit via socket for real-time updates
        socketRef.current?.emit("reactTeamMessage", {
          messageId,
          teamId: selectedTeam.id,
          userId: currentUser.id,
          emoji,
        });
      }
    } catch (err) {
      console.error("handleReaction error:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="fixed top-5 right-5 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${
              t.type === "success"
                ? "bg-green-500"
                : t.type === "error"
                ? "bg-red-500"
                : "bg-blue-500"
            } text-white px-4 py-2 rounded shadow`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Messages */}
      <div
        className="flex-1 p-4 bg-gray-50 border border-gray-300 rounded-lg shadow-md overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 200px)" }} // adjust according to your layout
      >
        {selectedTeam ? (
          filteredMessages.length > 0 ? (
            filteredMessages.map((msg, index) => {
              const key = msg.id;

              if (!messageRefs.current[key]) {
                messageRefs.current[key] = React.createRef();
              }

              // Determine if date separator should be shown
              const msgDate = new Date(
                msg.created_at || msg.timestamp
              ).toDateString();
              const prevMsg = filteredMessages[index - 1];
              const prevDate = prevMsg
                ? new Date(
                    prevMsg.created_at || prevMsg.timestamp
                  ).toDateString()
                : null;
              const showDateSeparator = msgDate !== prevDate;

              return (
                <React.Fragment key={key}>
                  {showDateSeparator && (
                    <div className="w-full flex justify-center my-4">
                      <span className="text-gray-500 py-1 rounded-full text-xs select-none">
                        {msgDate}
                      </span>
                    </div>
                  )}

                  <div
                    ref={messageRefs.current[key]}
                    className="flex flex-col items-start gap-1"
                  >
                    <Message
                      message={{
                        ...msg,
                        username:
                          msg.sender_id !== currentUser.id
                            ? selectedTeamMembers?.find(
                                (u) =>
                                  Number(u.user_id) === Number(msg.sender_id)
                              )?.username
                            : undefined,
                      }}
                      searchQuery={searchQuery}
                      highlightText={highlightText}
                      isOwn={msg.sender_id === currentUser.id}
                      socket={socketRef.current}
                      onForward={(m) => setForwardMsg(m)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      chatType="team"
                      teamId={selectedTeam.id}
                      setMessages={setMessages}
                      token={token}
                      onReact={handleReaction}
                    />
                  </div>
                </React.Fragment>
              );
            })
          ) : (
            <div className="text-center text-gray-400 mt-10">
              No messages found
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a team to start chatting
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input + File */}
      {/* Input + File preview */}
<div className="p-3 border-t border-gray-300 flex flex-col gap-2 bg-white">
  {selectedFile && (
  <div className="relative mb-1 p-1 border rounded-md bg-gray-100 flex items-center justify-between">
    <div className="flex items-center gap-2 overflow-hidden">
      {previewUrl && selectedFile.type.startsWith("image/") && (
        <img src={previewUrl} className="max-h-40 rounded-md" />
      )}
      {previewUrl && selectedFile.type.startsWith("video/") && (
        <video src={previewUrl} className="max-h-40 rounded-md" controls />
      )}
      {previewUrl && selectedFile.type.startsWith("audio/") && (
        <audio src={previewUrl} controls className="w-64" />
      )}
      {!previewUrl && (
        <div className="flex items-center gap-2 p-1 bg-white rounded-md shadow-sm">
          <span className="text-3xl">
            {selectedFile.name.endsWith(".pdf")
              ? "📕"
              : ["doc", "docx"].includes(selectedFile.name.split(".").pop())
              ? "📘"
              : ["xls", "xlsx"].includes(selectedFile.name.split(".").pop())
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

  <div className="flex items-center gap-2 relative bg-white dark:bg-gray-900 px-3 py-1 rounded-[10px] border text-[15px] border-gray-300 dark:border-gray-700 shadow-sm">
    <input
  type="text"
  placeholder={
    selectedTeam ? "Type a message..." : "Select a team..."
  }
  value={text}
  onChange={(e) => setText(e.target.value)}
  onKeyDown={handleKeyPress}
  disabled={!selectedTeam}
  className="flex-1 bg-transparent px-3 py-1 border-0 border-b-2 border-transparent focus:outline-none focus:ring-0 placeholder-gray-400
    focus:border-transparent focus:bg-gradient-to-r focus:from-purple-400 focus:to-purple-600 focus:[background-position:0_100%] focus:[background-size:100%_2px] focus:[background-repeat:no-repeat] rounded-full"
/>


    {/* Emoji Picker */}
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowEmoji((prev) => !prev)}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-purple-100 transition-all duration-200"
        title="Emoji"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-gray-500 hover:text-purple-700"
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
    <label className="relative flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:bg-purple-100 transition">
      <PaperClipIcon className="w-5 h-5 text-gray-600 hover:text-purple-700" />
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileChange}
      />
    </label>

    {/* Send Button */}
    <button
  onClick={handleSend}
  disabled={!selectedTeam}
  className="flex items-center justify-center p-[4px] bg-white text-purple-600 rounded-full hover:bg-purple-100 transition disabled:cursor-not-allowed"
>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-gray-500 hover:text-purple-700"
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
