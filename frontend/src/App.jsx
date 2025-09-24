import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import Header from "./components/Header";

import IncomingCallModal from "./components/calls/IncomingCallModal";
import CallOverlay from "./components/calls/CallOverlay";
import { useCall } from "./components/calls/hooks/useCall";

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem("chatToken")
  );
  const [showRegister, setShowRegister] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeUser = JSON.parse(sessionStorage.getItem("chatUser") || "null");
  const userId = activeUser?.id;

  const call = userId ? useCall(userId) : null;

  // Fetch users
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data.filter((u) => u.id !== userId));
      } catch (err) {
        console.error(err);
      }
    }

    fetchUsers();
  }, [isAuthenticated, userId]);

  // Fetch messages for selected user
  useEffect(() => {
    if (!isAuthenticated || !selectedUser) return;

    async function fetchChat() {
      try {
        const res = await fetch(`/api/chats/${userId}/${selectedUser.id}`);
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error(err);
      }
    }

    fetchChat();
  }, [isAuthenticated, selectedUser, userId]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    window.location.reload();
  };

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
      {!isAuthenticated ? (
        <div className="flex-1 w-full min-h-screen flex items-center justify-center p-4 bg-gradient-to-tl from-white to-purple-600">
          {!showRegister ? (
            <Login
              onLogin={handleAuthSuccess}
              onSwitch={() => setShowRegister(true)}
            />
          ) : (
            <Register
              onRegister={handleAuthSuccess}
              onSwitch={() => setShowRegister(false)}
            />
          )}
        </div>
      ) : (
        <>
          <Header
            activeUser={activeUser}
            selectedUser={selectedUser}
            onStartCall={call?.startCall}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <div className="flex flex-1 overflow-hidden w-full">
            <div className="w-72 min-w-[250px] border-r border-gray-200 overflow-y-auto">
              <Sidebar
                users={users}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
              />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden w-full">
              <ChatWindow
                selectedUser={selectedUser}
                messages={messages}
                setMessages={setMessages} // 👈 important for real-time updates
                currentUserId={userId}
                searchQuery={searchQuery}
              />
            </div>
          </div>

          {call?.callState.incoming && (
            <IncomingCallModal
              visible={true}
              fromUser={call.callState.caller}
              callType={call.callState.type}
              onAccept={call.acceptCall}
              onReject={call.rejectCall}
            />
          )}

          {call?.callState.type && (
            <CallOverlay
              callType={call.callState.type}
              localStream={call.localStream}
              remoteStream={call.remoteStream}
              onEndCall={call.endCall}
              onToggleMic={() => {}}
              onToggleCam={() => {}}
              onMinimize={() => call.setIsMaximized(false)}
              onMaximize={() => call.setIsMaximized(true)}
              onClose={call.endCall}
              isMaximized={call.isMaximized}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
