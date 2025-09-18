import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import Header from "./components/Header";

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem("chatUserId")
  );

  const userId = Number(sessionStorage.getItem("chatUserId"));

  // Fetch users when authenticated
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    async function fetchUsers() {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.filter((u) => u.id !== userId));
    }
    fetchUsers();
  }, [isAuthenticated, userId]);

  // Fetch chat messages
  useEffect(() => {
    if (!isAuthenticated || !selectedUser) return;

    async function fetchChat() {
      const res = await fetch(`/api/chats/${userId}/${selectedUser.id}`);
      const data = await res.json();
      setMessages(data);
    }
    fetchChat();
  }, [isAuthenticated, selectedUser, userId]);

  // Handle login/register success
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    window.location.reload(); // reload ensures sessionStorage updates
  };

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col">
      {!isAuthenticated ? (
        // Show Login & Register
        <div className="flex-1 flex items-center justify-center gap-4 p-4">
          <Login onLogin={handleAuthSuccess} />
          <Register onRegister={handleAuthSuccess} />
        </div>
      ) : (
        // Show Chat UI
        <>
          {/* Header */}
          <Header selectedUser={selectedUser} />

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-72 min-w-[250px] border-r border-gray-200 overflow-y-auto">
              <Sidebar
                users={users}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
              />
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ChatWindow
                selectedUser={selectedUser}
                messages={messages}
                currentUserId={userId}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
