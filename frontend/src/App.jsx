import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import Header from "./components/Header";

import IncomingCallModal from "./components/calls/IncomingCallModal";
import CallOverlay from "./components/calls/CallOverlay";
import { useCall } from "./components/calls/hooks/useCall";// 👈 custom hook for calls

function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem("chatToken")
  );
  const [showRegister, setShowRegister] = useState(false);

  const userId = Number(sessionStorage.getItem("chatUserId"));

  const activeUser = JSON.parse(sessionStorage.getItem("chatUser"));

  // Call hook
  const { callState, startCall, acceptCall, rejectCall, endCall,localStream,remoteStream,isMaximized,setIsMaximized } = useCall(userId);

  // Fetch users when authenticated
  useEffect(() => {

    console.log("Active user"+JSON.stringify(activeUser))

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

  // // Fetch chat messages
  // useEffect(() => {
  //   if (!isAuthenticated || !selectedUser) return;

  //   async function fetchChat() {
  //     const res = await fetch(`/api/chats/${userId}/${selectedUser.id}`);
  //     const data = await res.json();
  //     setMessages(data);
  //   }
  //   fetchChat();
  // }, [isAuthenticated, selectedUser, userId]);


  // Handle login/register success
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    window.location.reload(); // ensures sessionStorage updates
  };

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
      {!isAuthenticated ? (
        // Full-screen Login/Register container
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
        // Chat UI
        <>
          {/* Header */}
          <Header
            activeUser={activeUser}
            selectedUser={selectedUser}
            onStartCall={startCall} // 👈 pass down call starter
          />

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden w-full">
            {/* Sidebar */}
            <div className="w-72 min-w-[250px] border-r border-gray-200 overflow-y-auto">
              <Sidebar
                users={users}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
              />
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col overflow-hidden w-full">
              <ChatWindow
                selectedUser={selectedUser}
                messages={messages}
                currentUserId={userId}
              />
            </div>
          </div>

          {callState.incoming && (
  <IncomingCallModal
    visible={true}
    fromUser={callState.caller}
    callType={callState.type}
    onAccept={acceptCall}
    onReject={rejectCall}
  />
)}




          {callState.type && (
  <CallOverlay
    callType={callState.type}
    localStream={localStream}
    remoteStream={remoteStream}
    onEndCall={() => endCall(selectedUser.id)}
    onToggleMic={() => {}}
    onToggleCam={() => {}}
    onMinimize={() => setIsMaximized(false)}
    onMaximize={() => setIsMaximized(true)}
    onClose={() => endCall(selectedUser.id)}
    isMaximized={isMaximized}
  />
)}

        </>
      )}
    </div>
  );
}

export default App;
