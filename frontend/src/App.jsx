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
import TeamsSidebar from "./components/TeamsSidebar";
import { useSelector, useDispatch } from "react-redux";
import { rehydrateUser } from "./Store/Features/Users/userSlice";
import ProtectedRoute from "./utils/ProtectedRoute";

function AppRoutes({
  isAuthenticated,
  currentUser,
  userId,
  call,
  userList,
  handleAuthSuccess,
}) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [userMessages, setUserMessages] = useState([]);
  const [teamMessages, setTeamMessages] = useState([]);
  const [activeNav, setActiveNav] = useState("Chat");
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
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Register onRegister={handleAuthSuccess} />
          )
        }
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
                selectedUser={selectedUser}
                onStartCall={(type) => call.startCall(type, selectedUser)}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />

              <div className="flex flex-1 overflow-hidden w-full">
                {/* Sidebar */}
                <div className="w-72 min-w-[250px] border-r border-gray-200 overflow-y-auto">
                  <Sidebar
                    selectedUser={selectedUser}
                    onSelectUser={() => setSelectedTeam(null)}
                    activeNav={activeNav}
                    setActiveNav={setActiveNav}
                  />
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden w-full">
                  {activeNav === "Chat" && (
                    <ChatWindow
                      selectedTeam={selectedTeam}
                      selectedUser={selectedUser}
                      messages={selectedTeam ? teamMessages : userMessages}
                      setMessages={
                        selectedTeam ? setTeamMessages : setUserMessages
                      }
                      currentUserId={userId}
                      searchQuery={searchQuery}
                      usersList={userList}
                      onForward={handleOpenForwardModal}
                    />
                  )}

                  {activeNav === "Meet" && (
                    <div className="flex items-center justify-center h-full">
                      <CreateMeetingModal
                        userId={userId}
                        setActiveNav={setActiveNav}
                      />
                    </div>
                  )}

                  {activeNav === "Communities" && (
                    <TeamsSidebar
                      currentUser={currentUser}
                      currentUserId={userId}
                      selectedTeam={selectedTeam}
                      onSelectTeam={(team) => setSelectedTeam(team)}
                    />
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
                  fromUser={call.callState.caller}
                  callType={call.callState.type}
                  onAccept={call.acceptCall}
                  onReject={call.rejectCall}
                />
              )}

              {/* Ongoing call overlay */}
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

  return (
    <Router>
      <AppRoutes
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        userId={userId}
        call={call}
        userList={userList}
        handleAuthSuccess={() => setIsAuthenticated(true)}
      />
    </Router>
  );
}

export default App;
