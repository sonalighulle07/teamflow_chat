import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import Header from "./components/Header";
import IncomingCallModal from "./components/calls/IncomingCallModal";
import CallOverlay from "./components/calls/CallOverlay";
import CreateMeetingModal from "./components/calls/CreateMeetingModel";
import { useCall } from "./components/calls/hooks/useCall";
import socket from "./components/calls/hooks/socket";
import { urlBase64ToUint8Array } from "./utils/pushUtils";

import ForwardModal from "./components/ForwardModal";
import MeetingRoom from "./components/calls/MeetingRoom";
import MyCalendar from "./components/calender/MyCalender";
import { useSelector } from "react-redux";

import { rehydrateUser } from "./Store/Features/Users/userSlice" // adjust path

import { useDispatch } from "react-redux";


function App() {
  const { selectedUser,currentUser, userList, loading } = useSelector((state) => state.user);
  const [messages, setMessages] = useState([]);

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem("chatToken")
  );

  const [showRegister, setShowRegister] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Chat");

  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);

  const dispatch = useDispatch();
  const userId = currentUser?.id;
  const call = useCall(userId);

  // Service Worker Registration
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("✅ Service Worker registered:", reg);
      });
    }
  }, []);

  // Connect socket once authenticated and userId available
  useEffect(() => {
    if (isAuthenticated && userId && !socket.connected) {
      socket.connect();
    }
  }, [isAuthenticated, userId]);

  // Fetch messages for selected user
  useEffect(() => {
    if (!isAuthenticated || !selectedUser || !userId) return;

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


  useEffect(() => {
    if (isAuthenticated && !currentUser) {
      dispatch(rehydrateUser());
    }
  }, [isAuthenticated, currentUser, dispatch]);


  // Push Notifications subscription
  useEffect(() => {
    async function subscribeUser() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        await fetch("http://localhost:3000/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, subscription: sub }),
        });

        console.log("✅ Push subscription sent");
      } catch (err) {
        console.error("Push subscription failed:", err);
      }
    }

    if (isAuthenticated && userId) subscribeUser();
  }, [isAuthenticated, userId]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    // Don’t reload, let Redux finish setting currentUser
  };

  const handleOpenForwardModal = (message) => {
    setMessageToForward(message);
    setForwardModalOpen(true);
  };

  const handleForwardComplete = () => {
    setMessageToForward(null);
    setForwardModalOpen(false);
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
        ) : !currentUser ? (
          // Wait until thunk sets currentUser
          <div className="flex-1 flex items-center justify-center text-xl text-gray-600">
            Loading your account...
          </div>
        ) : (
          <>
            <Header
              activeUser={currentUser}
              selectedUser={selectedUser}
              onStartCall={(type) => call.startCall(type, selectedUser)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            <Routes>
              <Route
                path="/"
                element={
                  <div className="flex flex-1 overflow-hidden w-full">
                    <div className="w-72 min-w-[250px] border-r border-gray-200 overflow-y-auto">
                      <Sidebar
                        selectedUser={selectedUser}
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
                          usersList={userList}
                          onForward={handleOpenForwardModal}
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
                        <div className="flex flex-col items-center justify-center h-full w-full">
                          <MyCalendar />
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
              <Route
                path="/meet/:code"
                element={<MeetingRoom userId={userId} />}
              />
            </Routes>

            {forwardModalOpen && messageToForward && (
              <ForwardModal
                open={forwardModalOpen}
                onClose={handleForwardComplete}
                message={messageToForward}
                users={userList}
                onForward={handleForwardComplete}
              />
            )}

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
