import React from 'react';
import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);

  const userId = Number(sessionStorage.getItem("chatUserId")) || 1;

  // useEffect(() => {
  //   async function fetchUsers() {
  //     const res = await fetch("/api/users");
  //     const data = await res.json();
  //     setUsers(data.filter((u) => u.id !== userId));
  //   }
  //   fetchUsers();
  // }, [userId]);

  // useEffect(() => {
  //   if (!selectedUser) return;
  //   async function fetchChat() {
  //     const res = await fetch(`/api/chats/${userId}/${selectedUser.id}`);
  //     const data = await res.json();
  //     setMessages(data);
  //   }
  //   fetchChat();
  // }, [selectedUser, userId]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        users={users}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
      />
      <ChatWindow
        selectedUser={selectedUser}
        messages={messages}
        currentUserId={userId}
      />
    </div>
  );
}

export default App;
