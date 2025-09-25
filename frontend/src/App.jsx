// src/App.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import Header from "./components/Header";
import IncomingCallModal from "./components/calls/IncomingCallModal";
import CallOverlay from "./components/calls/CallOverlay";
import CreateMeetingModal from "./components/calls/CreateMeetingModel";
import { useCall } from "./components/calls/hooks/useCall";
import { urlBase64ToUint8Array } from "./utils/pushUtils";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MeetingRoom from "./components/calls/MeetingRoom"; // ✅ Create this component


function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem("chatToken")
  );
  const [showRegister, setShowRegister] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Chat");

  const activeUser = JSON.parse(sessionStorage.getItem("chatUser") || "null");
  const userId = activeUser?.id;

  const call = useCall(userId);

  // register service worker for push
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("✅ Service Worker registered:", reg);
      });
    }
  }, []);

  // fetch user list
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.filter((u) => u.id !== userId)));
  }, [isAuthenticated, userId]);

  // fetch chat messages when selecting a user
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

  // subscribe to push notifications
  useEffect(() => {
    async function subscribeUser() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      try {
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.error("❌ VAPID key missing");
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        const user = JSON.parse(sessionStorage.getItem("chatUser"));
        await fetch("http://localhost:3000/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, subscription: sub }),
        });

        console.log("✅ Push subscription sent to backend");
      } catch (err) {
        console.error("Push subscription failed:", err);
      }
    }

    if (isAuthenticated && userId) {
      subscribeUser();
    }
  }, [isAuthenticated, userId]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    window.location.reload();
  };

 return (
  <Router>
    <div className="h-screen w-screen flex flex-col">
      {!isAuthenticated ? (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-tl from-white to-purple-600">
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
            onStartCall={(type) => call.startCall(type, selectedUser)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <Routes>
            {/* Main dashboard */}
            <Route
              path="/"
              element={
                <div className="flex flex-1 overflow-hidden w-full">
                  <div className="w-72 min-w-[250px] border-r border-gray-200 overflow-y-auto">
                    <Sidebar
                      users={users}
                      selectedUser={selectedUser}
                      onSelectUser={setSelectedUser}
                      activeNav={activeNav}
                      setActiveNav={setActiveNav}
                    />
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden w-full">
                    {activeNav === "Chat" && (
                      <ChatWindow
                        selectedUser={selectedUser}
                        messages={messages}
                        setMessages={setMessages}
                        currentUserId={userId}
                        searchQuery={searchQuery}
                      />
                    )}
                    {activeNav === "Meet" && (
                      <div className="flex items-center justify-center h-full">
                        <CreateMeetingModal userId={userId} />
                      </div>
                    )}
                    {activeNav === "Communities" && (
                      <div className="flex items-center justify-center h-full text-gray-500 text-xl">
                        👥 Communities tab coming soon!
                      </div>
                    )}
                    {activeNav === "Calendar" && (
                      <div className="flex items-center justify-center h-full text-gray-500 text-xl">
                        📅 Calendar tab coming soon!
                      </div>
                    )}
                    {activeNav === "Activity" && (
                      <div className="flex items-center justify-center h-full text-gray-500 text-xl">
                        🔔 Activity tab coming soon!
                      </div>
                    )}
                  </div>
                </div>
              }
            />

            {/* Meeting room route */}
            <Route path="/meet/:code" element={<MeetingRoom userId={userId} />} />
          </Routes>

          {call.callState.incoming && (
            <IncomingCallModal
              visible
              fromUser={call.callState.caller}
              callType={call.callState.type}
              onAccept={call.acceptCall}
              onReject={call.rejectCall}
            />
          )}

          {call.callState.type && (
            <CallOverlay
              callType={call.callState.type}
              localStream={call.localStream}
              remoteStreams={call.remoteStreams}
              onEndCall={call.endCall}
              onToggleMic={call.toggleMic}
              onToggleCam={call.toggleCam}
              onStartScreenShare={call.startScreenShare}
              onStopScreenShare={call.stopScreenShare}
              isScreenSharing={call.isScreenSharing}
              isMuted={call.isMuted}
              isVideoEnabled={call.isVideoEnabled}
              onMinimize={() => call.setIsMaximized(false)}
              onMaximize={() => call.setIsMaximized(true)}
              onClose={call.endCall}
              isMaximized={call.isMaximized}
            />
          )}
        </>
      )}
    </div>
  </Router>
);


}

export default App;

