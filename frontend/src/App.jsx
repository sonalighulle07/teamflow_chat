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

  const activeUser = JSON.parse(sessionStorage.getItem("chatUser") || "null");
  const userId = activeUser?.id;

  // Only initialize call hook if user is authenticated
  const call = userId ? useCall(userId) : null;

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

  useEffect(() => {
    console.log("Call type changed:", call?.callState.type);
  }, [call?.callState.type]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    window.location.reload(); // ensures sessionStorage updates
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
                currentUserId={userId}
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
