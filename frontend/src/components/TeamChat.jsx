import React, { useEffect, useRef, useState } from "react";

import { io } from "socket.io-client";
import Picker from "emoji-picker-react";
import { PaperClipIcon } from "@heroicons/react/24/outline";
import Message from "./Message";
import ForwardModal from "./ForwardModal";
import { URL } from "../config";
import axios from "axios";
import { useDispatch } from "react-redux";
import { fetchTeamMembers } from "../Store/Features/Teams/teamThunk";
import { useSelector } from "react-redux";
import CryptoJS from "crypto-js";
// import TeamInvites from "./TeamInvites";

export default function TeamChat({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [deleteAlert, setDeleteAlert] = useState("");
  const [forwardAlert, setForwardAlert] = useState("");
  const token = sessionStorage.getItem("chatToken");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const messageRefs = useRef({});
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const KEY = "12345678901234567890123456789012"; // same key as Node.js

  function safeDecrypt(text) {
    if (!text || !text.includes(":")) return text || "";

    try {
      const [ivHex, encrypted] = text.split(":");
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        CryptoJS.enc.Utf8.parse(KEY),
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }
      );
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (err) {
      console.error("Decryption error:", err, text);
      return text;
    }
  }

  const dispatch = useDispatch();
  const selectedTeamMembers = useSelector(
    (state) => state.team.selectedTeamMembers
  );

  useEffect(() => {
    console.log("Team members updated:", selectedTeamMembers);
  }, [selectedTeamMembers]);

  const selectedTeam = useSelector((state) => state.team.selectedTeam);

  // --- Initialize socket ---
  useEffect(() => {
    if (!selectedTeam || !currentUser) return;

    const socket = io(URL);
    socketRef.current = socket;

    // new team message
    socket.emit("register", { userId: currentUser.id });
    socket.emit("joinRoom", { teamId: selectedTeam.id }); // ✅ add this

    // Listen for new team messages
    socket.on("teamMessage", (msg) => {
      if (msg?.team_id === selectedTeam.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // message deleted (server should emit messageDeleted with { messageId, senderId, teamId })

    socket.on(
      "messageDeleted",
      ({ messageId, senderId, teamId }) => {
        if (teamId && teamId !== team.id) return; // ignore other teams
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        if (senderId === currentUser.id) {
          setDeleteAlert("Message deleted successfully");
          setTimeout(() => setDeleteAlert(""), 3000);
        }
      },
      [selectedTeam, currentUser, selectedTeamMembers]
    );

    // message edited (server should emit messageEdited with updated message)
    socket.on("messageEdited", (updatedMsg) => {
      if (updatedMsg?.team_id && updatedMsg.team_id !== selectedTeam.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );
      // optional toast only for the sender
      if (updatedMsg?.sender_id === currentUser.id) {
        setForwardAlert("Message edited successfully");
        setTimeout(() => setForwardAlert(""), 3000);
      }
    });

    return () => socket.disconnect();
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
  }, [messages]);
  useEffect(() => {
    if (!searchQuery) return;

    const query = searchQuery.toLowerCase();
    for (let key in messageRefs.current) {
      const msg = messages.find((m) => m.id === Number(key));
      if (!msg) continue;

      const text = msg.text || "";
      if (text.toLowerCase().includes(query)) {
        // scroll to first matched message
        messageRefs.current[key]?.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        break; // scroll to first match only
      }
    }
  }, [searchQuery, messages]);

  // --- File handling ---
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

      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);

      // broadcast new message
      socketRef.current?.emit("teamMessage", newMessage);

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
      // optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === updatedMsg.id
            ? { ...m, text: updatedMsg.text, edited: 1 }
            : m
        )
      );

      socketRef.current?.emit("messageEdited", {
        ...updatedMsg,
        team_id: selectedTeam.id,
      });
    } catch (err) {
      console.error("Edit failed:", err);
    }
  };

  // --- Delete message (team) ---
  const handleDelete = async (messageId) => {
    if (!selectedTeam?.id) return;
    try {
      let teamId = selectedTeam.id;
      const res = await fetch(
        `${URL}/api/teams/${teamId}/messages/${messageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        // remove message from state
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        const data = await res.json();
        console.error("Delete failed:", data);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // --- Forward team message ---
  // If you want to forward a team message to users (private chats) reuse your chats forward endpoint:
  // POST /api/chats/:messageId/forward { toUserIds: [...], senderId }
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

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {deleteAlert && (
        <div className="fixed top-5 right-5 bg-green-500 text-white p-3 rounded shadow z-50">
          {deleteAlert}
        </div>
      )}
      {forwardAlert && (
        <div className="fixed top-16 right-5 bg-blue-500 text-white p-3 rounded shadow z-50">
          {forwardAlert}
        </div>
      )}
      {/* <TeamInvites socket={socketRef.current} /> */}

      {/* Messages */}
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto border border-gray-300 rounded-lg shadow-md">
        {selectedTeam ? (
          messages.length > 0 ? (
            (() => {
              let lastDate = null; // track last message date
              return messages.map((msg, index) => {
                const key = msg.id || index;
                messageRefs.current[key] =
                  messageRefs.current[key] || React.createRef();

                const rawDate = msg.createdAt || msg.timestamp || msg.date;
                const messageDate = rawDate ? new Date(rawDate) : new Date();

                // Change this line
                const messageDateStr = messageDate.toDateString(); // Mon Nov 03 2025

                const showDateSeparator = lastDate !== messageDateStr;
                lastDate = messageDateStr;

                return (
                  <React.Fragment key={key}>
                    {showDateSeparator && (
                      <div className="w-full flex justify-center my-4">
                        <span className="text-gray-500  py-1 rounded-full text-xs  select-none">
                          {messageDateStr}
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
                          text: highlightText(
                            safeDecrypt(msg.text), // <-- decrypt here
                            searchQuery
                          ),
                          username:
                            msg.sender_id !== currentUser.id
                              ? selectedTeamMembers?.find(
                                  (u) =>
                                    Number(u.user_id) === Number(msg.sender_id)
                                )?.username
                              : undefined,
                        }}
                        isOwn={msg.sender_id === currentUser.id}
                        socket={socketRef.current}
                        onForward={(m) => setForwardMsg(m)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReact={async (messageId, emoji) => {
                          try {
                            await fetch(
                              `${URL}/api/teams/messages/${messageId}/react`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ emoji }),
                              }
                            );
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === messageId
                                  ? { ...m, reactions: m.reactions || null }
                                  : m
                              )
                            );
                            socketRef.current?.emit("reaction", {
                              messageId,
                              teamId: selectedTeam.id,
                              emoji,
                              userId: currentUser.id,
                            });
                          } catch (err) {
                            console.error("Reaction error:", err);
                          }
                        }}
                      />
                    </div>
                  </React.Fragment>
                );
              });
            })()
          ) : (
            <div className="text-center text-gray-400 mt-10">
              No messages yet
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
                  <span className="text-3xl">📄</span>
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
