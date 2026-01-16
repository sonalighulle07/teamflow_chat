import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { connectSocket } from "./components/calls/hooks/socket";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { rehydrateUser, setActiveNav } from "./Store/Features/Users/userSlice";
import { urlBase64ToUint8Array } from "./utils/pushUtils";
import { useCall } from "./components/calls/hooks/useCall";
import socket from "./components/calls/hooks/socket";

// Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import IncomingCallModal from "./components/calls/PrivateCalls/IncomingCallModal";
import CallOverlay from "./components/calls/PrivateCalls/CallOverlay";
import CreateMeetingModal from "./components/calls/GroupCalls/MeetingUtils/CreateMeetingModel";
import MeetingRoom from "./components/calls/GroupCalls/MeetingRoom";
import MediaConfirmation from "./components/calls/GroupCalls/MeetingUtils/MediaConfirmation";
import MyCalendar from "./components/calender/MyCalender";
import TeamChat from "./components/TeamChat";
import CreateTeam from "./components/CreateTeams";
import TaskManagement from "./components/TaskManagement";
import TeamInvites from "./components/TeamInvites";
import ForwardModal from "./components/ForwardModal";
// Super Admin
import SuperAdminLayout from "./Super_Admin/SuperAdminLayout";
import SuperAdminDashboard from "./Super_Admin/pages/Dashboard";
import Organizations from "./Super_Admin/components/Organization"; // adjust path
import Plans from "./Super_Admin/components/Plans";
import SecureRoutes from "./components/SecureRoutes";

// Org Admin
import AdminOrgUsersPage from "./components/Admin_Panel/AdminOrgUsersPage";
import AdminOrgAdminsPage from "./components/Admin_Panel/AdminOrgAdminsPage";
import OrgAdminLayout from "./components/Admin_Panel/OrgAdminLayout";
import Dashboard from "./components/Admin_Panel/Dashboard";
import OrganizationAdminTeamsModule from "./components/Admin_Panel/OrganizationAdminTeamsModule";
import OrganizationSettings from "./components/Admin_Panel/OrganizationSettings";

import ProtectedRoute from "./utils/ProtectedRoute";
import { URL } from "./config";

function AppRoutes({
  isAuthenticated,
  currentUser,
  userId,
  call,
  userList,
  handleAuthSuccess,
  setIsAuthenticated,
}) {
  const dispatch = useDispatch(); //  add dispatch here
  const { activeNav } = useSelector((state) => state.user); //  get activeNav

  const [userMessages, setUserMessages] = useState([]);
  const [teamMessages, setTeamMessages] = useState([]);
  const [showTeamInvites, setShowTeamInvites] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [teamToEdit, setTeamToEdit] = useState(null);

  const location = useLocation();

  const handleOpenForwardModal = (message) => {
    setMessageToForward(message);
    setForwardModalOpen(true);
  };

  const handleForwardComplete = () => {
    setMessageToForward(null);
    setForwardModalOpen(false);
  };

  const onCommunitiesClick = () => setShowTeamInvites((prev) => !prev);

  return (
    <Routes>
      <Route
        path="/super-admin"
        element={
          <SecureRoutes
            isAuthenticated={isAuthenticated}
            role={currentUser?.role}
            allowedRoles={["super_admin"]}
          >
            <SuperAdminLayout />
          </SecureRoutes>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="plans" element={<Plans />} />
      </Route>

      {/* Redirect /admin to org-admin/dashboard */}
      <Route
        path="/admin"
        element={<Navigate to="/org-admin/dashboard" replace />}
      />

      {/* ORG ADMIN ROUTES */}
      <Route
        path="/org-admin"
        element={
          <SecureRoutes
            isAuthenticated={isAuthenticated}
            role={currentUser?.role}
            allowedRoles={["org_admin"]}
          >
            <OrgAdminLayout setIsAuthenticated={setIsAuthenticated} />
          </SecureRoutes>
        }
      >
        {/* Dashboard */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Users */}
        <Route
          path="users"
          element={<AdminOrgUsersPage orgId={currentUser?.organization_id} />}
        />

        {/* Admins */}
        <Route
          path="admins"
          element={<AdminOrgAdminsPage orgId={currentUser?.organization_id} />}
        />

        {/* Teams */}
        <Route
          path="teams"
          element={<OrganizationAdminTeamsModule adminId={currentUser?.id} />}
        />

        {/* Organization Settings */}
        <Route path="organizations" element={<OrganizationSettings />} />

        {/* Messages */}
        <Route path="messages" element={<div>Messages</div>} />
      </Route>

      {/* LOGIN */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            currentUser?.role === "super_admin" ? (
              <Navigate to="/super-admin/dashboard" replace />
            ) : currentUser?.role === "org_admin" ? (
              <Navigate to="/org-admin/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Login onLogin={handleAuthSuccess} />
          )
        }
      />

      {/* REGISTER */}
      <Route
        path="/register"
        element={<Register onRegister={handleAuthSuccess} />}
      />

      {/* PREJOIN */}
      <Route
        path="/prejoin/:credentials"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MediaConfirmation userId={userId} currentUser={currentUser} />
          </ProtectedRoute>
        }
      />

      {/* MEETING ROOM */}
      <Route
        path="/meet/:credentials"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <MeetingRoom userId={userId} currentUser={currentUser} />
          </ProtectedRoute>
        }
      />

      {/* MAIN APP — NORMAL USERS */}
      <Route
        path="/"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : currentUser === null ? (
            <div className="flex-1 flex items-center justify-center text-xl text-gray-600">
              Loading your account...
            </div>
          ) : currentUser.role === "super_admin" ? (
            <Navigate to="/super-admin" replace />
          ) : currentUser.role === "org_admin" ? (
            <Navigate to="/org-admin/dashboard" replace />
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
                <Sidebar
                  setShowModal={setShowModal}
                  activeNav={activeNav} //  activeNav defined full here
                  onCommunitiesClick={onCommunitiesClick}
                />

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

                  {activeNav === "Teams" && (
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
                        setSearchQuery={setSearchQuery}
                        setTeamToEdit={setTeamToEdit}
                      />
                    </div>
                  )}

                  {activeNav === "Meet" && (
                    <div className="flex items-center justify-center h-full">
                      <CreateMeetingModal
                        userId={userId}
                        setActiveNav={(nav) => dispatch(setActiveNav(nav))}
                      />
                    </div>
                  )}

                  {activeNav === "Calendar" && (
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <MyCalendar />
                    </div>
                  )}

                  {activeNav === "Tasks" && (
                    <div className="flex-1 overflow-auto">
                      <TaskManagement />
                    </div>
                  )}

                  {showModal && (
                    <CreateTeam
                      currentUser={currentUser}
                      showModal={showModal}
                      setShowModal={setShowModal}
                      socket={socket}
                      existingTeam={teamToEdit}
                    />
                  )}
                </div>
              </div>

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
                  fromUser={call.callState.incoming.fromUsername}
                  callType={call.callState.type}
                  onAccept={call.acceptCall}
                  onReject={call.rejectCall}
                />
              )}

              {call.callState.type && (
                <CallOverlay
                  callId={call.callState.callId}
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
                  inCall={call.inCall}
                  addUser={call.addUserToCall}
                  cancelInvite={call.cancelInviteFor}
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
  const dispatch = useDispatch(); // ✅ dispatch for App
  const { currentUser, userList } = useSelector((state) => state.user);

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem("chatToken")
  );
  const userId = currentUser?.id;
  const call = useCall(userId, currentUser?.username);

  // Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("Service Worker registered:", reg);
      });
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
      connectSocket(userId);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    const saved = sessionStorage.getItem("chatUser");
    if (isAuthenticated && saved && !currentUser) {
      dispatch(rehydrateUser(JSON.parse(saved))); // ✅ dispatch defined
    }
  }, [isAuthenticated, currentUser, dispatch]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;

    async function subscribeUser() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      try {
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) return console.error("VAPID key missing");

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        await fetch(`${URL}/api/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, subscription: sub }),
        });

        console.log("Push subscription sent to backend");
      } catch (err) {
        console.error("Push subscription failed:", err);
      }
    }

    subscribeUser();
  }, [isAuthenticated, currentUser]);

  return (
    <Router>
      {/* Always mounted ToastContainer */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
        style={{ zIndex: 99999 }}
      />

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
