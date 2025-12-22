import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaPhone,
  FaVideo,
  FaUsers,
  FaUser,
  FaUserPlus,
  FaCrown,
  FaShieldAlt,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import ProfileModal from "./ProfileModal";
import ErrorBoundary from "./ErrorBoundary";
import { URL } from "../config";
import axios from "axios";
import socket from "./calls/hooks/socket";
import CreateTeams from "./CreateTeams";
import { toast, Toaster } from "react-hot-toast";

export default function Header({
  activeUser,
  onStartCall,
  searchQuery,
  setSearchQuery,
  setIsAuthenticated,
}) {
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hasJoinedMeeting, setHasJoinedMeeting] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const navigate = useNavigate();
  const { selectedUser, activeNav } = useSelector((state) => state.user);
  const { selectedTeam, selectedTeamMembers } = useSelector(
    (state) => state.team
  );

  const token = sessionStorage.getItem("chatToken");
  const isChatVisible = activeNav === "Chat" || activeNav === "Communities";

  // ----------------- Helper Functions -----------------
 function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(" ").filter(Boolean);
  const initials = parts.map((part) => part[0].toUpperCase()); // always uppercase
  return initials.slice(0, 2).join(""); // first 2 letters
}

  function getDisplayName(user) {
    if (!user) return "";
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.full_name || user.username || "";
  }

  const fullName =
    activeUser?.first_name && activeUser?.last_name
      ? `${activeUser.first_name} ${activeUser.last_name}`
      : activeUser?.username || "Guest";
  const username = fullName;

  const displayName =
    selectedTeam && activeNav === "Communities"
      ? selectedTeam.name
      : activeNav === "Chat"
      ? getDisplayName(selectedUser)
      : "Select a Chat";

  const displayProfileImage =
    selectedUser && !selectedTeam && selectedUser.profile_image
      ? `${URL}${selectedUser.profile_image}`
      : null;

  const canCall = selectedUser && !selectedTeam;
function capitalizeWords(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

const displayNameFormatted = capitalizeWords(displayName || username);

  // ----------------- Click Outside Handler -----------------
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowMembers(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  // ----------------- Profile Image -----------------
  useEffect(() => {
    if (!activeUser) return setProfileImage(null);

    const stored = localStorage.getItem(`profileImage_${activeUser.id}`);
    if (stored) setProfileImage(stored);
    else if (activeUser.profile_image) {
      const imgUrl = `${URL}${activeUser.profile_image}`;
      setProfileImage(imgUrl);
      localStorage.setItem(`profileImage_${activeUser.id}`, imgUrl);
    } else setProfileImage(null);
  }, [activeUser]);

  // ----------------- Meeting Poll -----------------
  useEffect(() => {
    if (!selectedTeam || !token) return;

    const fetchActiveMeeting = async () => {
      try {
        const res = await axios.get(
          `${URL}/api/teams/team/${selectedTeam.id}/active`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.data.active) {
          setActiveMeeting(null);
          setHasJoinedMeeting(false);
          return;
        }
        const meeting = res.data.meeting;
        setActiveMeeting(meeting);

        const parts = meeting.meeting_code.split("-");
        const roomCode = parts.slice(2).join("-");

        socket.emit("header-checkJoined", {
          roomCode,
          userId: String(activeUser.id),
          requesterSocketId: socket.id,
        });
      } catch (err) {
        console.error("Failed to check active meeting:", err);
      }
    };

    fetchActiveMeeting();
    const interval = setInterval(fetchActiveMeeting, 10000);
    return () => clearInterval(interval);
  }, [selectedTeam, token, activeUser?.id]);

  useEffect(() => {
    const handleCheckJoined = ({ joined }) => setHasJoinedMeeting(joined);
    socket.on("checkJoinedResponse", handleCheckJoined);
    return () => socket.off("checkJoinedResponse", handleCheckJoined);
  }, []);

  // ----------------- Logout -----------------
  const logout = () => {
    sessionStorage.clear();
    localStorage.removeItem("chatToken");
    localStorage.removeItem("chatUser");
    setIsAuthenticated(false);
    socket.disconnect();
    navigate("/");
  };

  // ----------------- Meetings -----------------
  const startGroupCall = async () => {
    if (!selectedTeam) return;
    setIsCreatingMeeting(true);
    try {
      const response = await axios.get(
        `${URL}/api/teams/${selectedTeam.id}/meeting-link`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { meetingCode } = response.data;
      window.open(`${window.location.origin}/prejoin/${meetingCode}`, "_blank");
    } catch (err) {
      console.error("Failed to create meeting:", err);
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const joinActiveMeeting = async () => {
    if (!activeMeeting?.meeting_code || !selectedTeam) return;
    try {
      const res = await axios.get(
        `${URL}/api/teams/team/${selectedTeam.id}/active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { active, meeting } = res.data;
      if (active && meeting?.meeting_code === activeMeeting.meeting_code) {
        window.open(
          `${window.location.origin}/prejoin/${meeting.meeting_code}`,
          "_blank"
        );
      } else alert("⚠️ This meeting is no longer active.");
    } catch (err) {
      console.error(err);
      alert("Unable to verify meeting status. Please try again.");
    }
  };

  const renderMeetingButton = () => {
    if (!selectedTeam || activeNav !== "Communities") return null;

    const buttonClass = hasJoinedMeeting
      ? "bg-red-600 text-white hover:bg-red-700"
      : activeMeeting
      ? "bg-green-600 text-white hover:bg-green-700"
      : "bg-gray-100 text-purple-600 hover:bg-purple-200";

    const iconColor =
      hasJoinedMeeting || activeMeeting ? "text-white" : "text-purple-600";

    const buttonText = isCreatingMeeting
      ? "Creating..."
      : hasJoinedMeeting
      ? "Joined"
      : activeMeeting
      ? "Join Meeting"
      : "Start Meeting";

    return (
      <button
        className={`px-4 py-2 flex items-center gap-2 rounded-full shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-wait ${buttonClass}`}
        onClick={
          hasJoinedMeeting
            ? null
            : activeMeeting
            ? joinActiveMeeting
            : startGroupCall
        }
        disabled={isCreatingMeeting || hasJoinedMeeting}
      >
        <FaVideo size={18} className={iconColor} />
        <span className="text-sm font-medium">{buttonText}</span>
      </button>
    );
  };

  // ----------------- Add Member -----------------
  const handleOpenAddMember = () => {
    if (!selectedTeam) return;
    const membersWithRoles =
      selectedTeam.members?.map((m) => ({
        user_id: m.user_id || m.id,
        role: m.role || "member",
        username: m.username,
        profile_image: m.profile_image,
      })) || [];
    setTeamToEdit({ ...selectedTeam, members: membersWithRoles });
    setShowCreateTeamModal(true);
  };

  // ----------------- JSX -----------------
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <div className="flex items-center justify-between px-4 py-4 bg-slate-200 shadow-md border-b border-gray-200">
        {/* Left */}
        <div className="flex items-center gap-4 ml-[5px]">
          <img
            src="/logo - no background.png"
            alt="Logo"
            className="w-12 h-12 object-contain"
          />
          <h2 className="font-semibold text-gray-600 text-[18px] ml-3.5">
            {activeNav}
          </h2>

          {isChatVisible && (selectedTeam || selectedUser) && (
            <div className="flex items-center gap-2 ml-[220px]">
              {displayProfileImage ? (
                <img
                  src={displayProfileImage}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover border border-gray-300"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-400 text-white rounded-full flex items-center justify-center text-xs font-semibold uppercase">
                 {getInitials(displayNameFormatted) || "?"}
                </div>
              )}
              <span className="text-gray-600 font-medium text-[15px] truncate max-w-[120px]">
                {displayNameFormatted}
              </span>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {isChatVisible && renderMeetingButton()}

          {/* Members Dropdown */}
          {isChatVisible && selectedTeam && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowMembers((prev) => !prev)}
                className="p-2 hover:bg-gray-100 rounded-full text-purple-600 transition-all duration-200 shadow-sm transform hover:scale-105"
                title="View Group Members"
              >
                <FaUsers size={18} />
              </button>

              {showMembers && (
                <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 text-sm font-semibold flex items-center gap-2">
                    <FaUsers size={14} />
                    <span>{selectedTeam?.name} Members</span>
                  </div>
                  <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {selectedTeamMembers?.length > 0 ? (
                      selectedTeamMembers.map((member) => (
                        <li
                          key={member.user_id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            {member.profile_image ? (
                              <img
                                src={`${URL}${member.profile_image}`}
                                alt={member.username}
                                className="w-9 h-9 rounded-full object-cover border border-gray-300 shadow-sm"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold uppercase shadow-sm">
                                {getInitials(member.username) || "?"}
                              </div>
                            )}
                            <span className="text-gray-900 text-sm font-semibold">
                              {member.username}
                            </span>
                          </div>
                          <div>
                            {member.role === "owner" && (
                              <FaCrown
                                className="text-yellow-500"
                                title="Owner"
                                size={16}
                              />
                            )}
                            {member.role === "admin" && (
                              <FaShieldAlt
                                className="text-purple-500"
                                title="Admin"
                                size={16}
                              />
                            )}
                            {member.role === "member" && (
                              <FaUser
                                className="text-gray-400"
                                title="Member"
                                size={16}
                              />
                            )}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-center text-gray-500 text-sm py-4">
                        No members found
                      </li>
                    )}
                  </ul>

                  <button
                    onClick={() => {
                      setShowMembers(false);
                      const myRole = selectedTeamMembers?.find(
                        (m) => m.user_id === activeUser.id
                      )?.role;

                      if (myRole === "owner" || myRole === "admin") {
                        handleOpenAddMember();
                      } else {
                        toast.custom((t) => (
                          <div
                            className={`${
                              t.visible ? "animate-enter" : "animate-leave"
                            } max-w-xs w-full bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2`}
                          >
                            <FaShieldAlt size={18} />
                            <span className="text-sm font-medium">
                              Only team admins can add members
                            </span>
                          </div>
                        ));
                      }
                    }}
                    className="w-full bg-purple-100 py-3 flex items-center justify-center gap-2 text-purple-700 font-semibold hover:bg-purple-200 border-t border-gray-100 transition-all"
                  >
                    <FaUserPlus size={16} />
                    <span>Add / Remove Member</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Audio / Video Call Buttons */}
          {isChatVisible && selectedUser && !selectedTeam && (
            <>
              <button
                className="p-2 hover:bg-gray-100 rounded-full text-purple-600 transition-all duration-200 shadow-sm transform rotate-45"
                title="Audio Call"
                disabled={!canCall}
                onClick={() => onStartCall("audio", selectedUser)}
              >
                <FaPhone style={{ transform: "rotate(45deg)" }} size={15} />
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded-full text-purple-600 transition-all duration-200 shadow-sm"
                title="Video Call"
                disabled={!canCall}
                onClick={() => onStartCall("video", selectedUser)}
              >
                <FaVideo />
              </button>
            </>
          )}

          {/* Search */}
          {isChatVisible && (selectedUser || selectedTeam) && (
            <div className="relative" ref={searchRef}>
              <button
                onClick={() => setShowSearch((prev) => !prev)}
                className="p-2 hover:bg-gray-100 rounded-full text-purple-600 transition-all duration-200 shadow-sm"
                title="Search in Chat"
              >
                <FaSearch />
              </button>
              {showSearch && (
                <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-3 flex flex-col gap-2 z-50">
                  <label
                    htmlFor="chatSearchInput"
                    className="text-xs font-semibold text-gray-500"
                  >
                    Search Chat:
                  </label>
                  <div className="relative mt-1">
                    <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      id="chatSearchInput"
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      ref={searchInputRef}
                      className="w-full pl-8 pr-2 py-1.5 rounded-2xl bg-gray-200 text-sm placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile Avatar */}
          <div
            className="relative group flex items-center justify-center p-1 rounded-full cursor-pointer hover:bg-white transition-all duration-300"
            onClick={() => setShowProfileModal((prev) => !prev)}
          >
            <div className="relative h-8 w-8">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
               <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
  {getInitials(displayNameFormatted) || "G"}
</div>

              )}
              

              <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                <svg
                  className="h-2 w-2 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.414l2.793 2.793 6.793-6.793a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>

            <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-xs bg-white text-gray-700 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none mt-19">
             {displayNameFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && activeUser && (
        <ErrorBoundary>
          <ProfileModal
            user={activeUser}
            onClose={() => setShowProfileModal(false)}
            onLogout={logout}
            setProfileImage={(img) => {
              setProfileImage(img);
              if (img)
                localStorage.setItem(`profileImage_${activeUser.id}`, img);
              else localStorage.removeItem(`profileImage_${activeUser.id}`);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Add / Remove Team Modal */}
      {showCreateTeamModal && (
        <CreateTeams
          currentUser={activeUser}
          showModal={showCreateTeamModal}
          setShowModal={setShowCreateTeamModal}
          socket={socket}
          existingTeam={teamToEdit}
        />
      )}
    </>
  );
}
