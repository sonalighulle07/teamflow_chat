import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import Header from "./components/Header";
import IncomingCallModal from "./components/calls/PrivateCalls/IncomingCallModal";
import CallOverlay from "./components/calls/PrivateCalls/CallOverlay";
import CreateMeetingModal from "./components/calls/GroupCalls/MeetingUtils/CreateMeetingModel";
import { useCall } from "./components/calls/hooks/useCall";
import socket from "./components/calls/hooks/socket";
import ForwardModal from "./components/ForwardModal";
import MeetingRoom from "./components/calls/GroupCalls/MeetingRoom";
import MediaConfirmation from "./components/calls/GroupCalls/MeetingUtils/MediaConfirmation";
import MyCalendar from "./components/calender/MyCalender";
import { useSelector, useDispatch } from "react-redux";
import { rehydrateUser } from "./Store/Features/Users/userSlice";
import ProtectedRoute from "./utils/ProtectedRoute";
import { urlBase64ToUint8Array } from "./utils/pushUtils";
import TeamChat from "./components/TeamChat";
import { setActiveNav } from "./Store/Features/Users/userSlice";
import CreateTeam from "./components/CreateTeams";
import TaskManagement from "./components/TaskManagement";
import TeamInvites from "./components/TeamInvites";

function AppRoutes({
  isAuthenticated,
  currentUser,
  userId,
  call,
  userList,
  handleAuthSuccess,
  setIsAuthenticated,
}) {
  const [userMessages, setUserMessages] = useState([]);
  const [teamMessages, setTeamMessages] = useState([]);
  const { activeNav } = useSelector((state) => state.user);
  const [showTeamInvites, setShowTeamInvites] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null); // ✅ local state for selected team
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);

  const location = useLocation();

  const handleOpenForwardModal = (message) => {
    setMessageToForward(message);
    setForwardModalOpen(true);
  };

  const handleForwardComplete = () => {
    setMessageToForward(null);
    setForwardModalOpen(false);
  };

  const onCommunitiesClick = () => {
    setShowTeamInvites((prev) => !prev);
  };

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={location.state?.from || "/"} replace />
          ) : (
            <Login onLogin={handleAuthSuccess} />
          )
        }
      />

      {/* Register */}
      <Route
        path="/register"
        element={<Register onRegister={handleAuthSuccess} />}
      />

      {/* Prejoin media page */}
      <Route
        path="/prejoin/:code"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MediaConfirmation userId={userId} currentUser={currentUser} />
          </ProtectedRoute>
        }
      />

      {/* Meeting Room */}
      <Route
        path="/meet/:code"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MeetingRoom userId={userId} currentUser={currentUser} />
          </ProtectedRoute>
        }
      />

      {/* Main App */}
      <Route
        path="/"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : !currentUser ? (
            <div className="flex-1 flex items-center justify-center text-xl text-gray-600">
              Loading your account...
            </div>
          ) : (
            <div className="flex flex-col h-screen w-screen">
              <Header
                activeUser={currentUser}
                onStartCall={(type, selectedUser) =>
                  call.startCall(type, selectedUser)
                }
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                setIsAuthenticated={setIsAuthenticated}
              />

              <div className="flex flex-1 overflow-hidden w-full">
                {/* Sidebar */}
                <div className="w-72 min-w-[250px] border-r border-gray-200 overflow-y-auto">
                  <Sidebar
                    setShowModal={setShowModal}
                    activeNav={activeNav}
                    onCommunitiesClick={onCommunitiesClick}
                  />
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden w-full">
                  {activeNav === "Chat" && (
                    <ChatWindow
                      selectedTeam={selectedTeam}
                      messages={selectedTeam ? teamMessages : userMessages}
                      setMessages={
                        selectedTeam ? setTeamMessages : setUserMessages
                      }
                      currentUserId={userId}
                      searchQuery={searchQuery}
                      usersList={userList}
                      socket={socket}
                      onForward={handleOpenForwardModal}
                    />
                  )}

                  {activeNav === "Communities" && (
                    <div className="relative flex-1">
                      <TeamInvites
                        socket={socket}
                        show={showTeamInvites}
                        setShow={setShowTeamInvites}
                      />
                      <TeamChat
                        team={selectedTeam}
                        currentUser={currentUser}
                        searchQuery={searchQuery}
                      />
                    </div>
                  )}

                  {activeNav === "Meet" && (
                    <div className="flex items-center justify-center h-full">
                      <CreateMeetingModal
                        userId={userId}
                        setActiveNav={setActiveNav}
                      />
                    </div>
                  )}

                  {activeNav === "Calendar" && (
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <MyCalendar />
                    </div>
                  )}

                  {activeNav === "Tasks" && (
                    <div className="flex-1 overflow-auto ">
                      <TaskManagement />
                    </div>
                  )}

                  {showModal && (
                    <CreateTeam
                      currentUser={currentUser}
                      showModal={showModal}
                      setShowModal={setShowModal}
                      socket={socket}
                    />
                  )}
                </div>
              </div>

              {/* Forward Modal */}
              {forwardModalOpen && messageToForward && (
                <ForwardModal
                  open={forwardModalOpen}
                  onClose={handleForwardComplete}
                  message={messageToForward}
                  users={userList}
                  onForward={handleForwardComplete}
                />
              )}

              {/* Incoming call */}
              {call.callState.incoming && (
                <IncomingCallModal
                  visible
                  fromUser={call.callState.callerUsername}
                  callType={call.callState.type}
                  onAccept={call.acceptCall}
                  onReject={call.rejectCall}
                />
              )}

              {/* Ongoing call overlay */}
              {call.callState.type && (
                <CallOverlay
                  socket={socket}
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
            </div>
          )
        }
      />
    </Routes>
  );
}

function App() {
  const { currentUser, userList } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem("chatToken")
  );
  const userId = currentUser?.id;
  const call = useCall(userId);

  // Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("✅ Service Worker registered:", reg);
      });
    }
  }, []);

  // Socket connection
  useEffect(() => {
    if (isAuthenticated && userId && !socket.connected) {
      socket.connect();
    }
  }, [isAuthenticated, userId]);

  // Redux rehydrate
  useEffect(() => {
    if (isAuthenticated && !currentUser) {
      dispatch(rehydrateUser());
    }
  }, [isAuthenticated, currentUser, dispatch]);

  // Push subscription
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

  return (
    <Router>
      <AppRoutes
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        userId={userId}
        call={call}
        userList={userList}
        handleAuthSuccess={() => setIsAuthenticated(true)}
        setIsAuthenticated={setIsAuthenticated}
      />
    </Router>
  );
}

export default App;
