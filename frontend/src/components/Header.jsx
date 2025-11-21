import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaPhone, FaVideo } from "react-icons/fa";
import { useSelector } from "react-redux";
import ProfileModal from "./ProfileModal";
import ErrorBoundary from "./ErrorBoundary";
import { URL } from "../config";
import axios from "axios";

import socket from "./calls/hooks/socket";
import { FaUsers } from "react-icons/fa";

export default function Header({
  activeUser,
  onStartCall,
  searchQuery,
  setSearchQuery,
  setIsAuthenticated,
}) {
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hasJoinedMeeting, setHasJoinedMeeting] = useState(false);
  const searchInputRef = useRef(null);
  const { selectedUser, activeNav } = useSelector((state) => state.user);
  const username = activeUser?.username || "Guest";
  const { selectedTeam } = useSelector((state) => state.team);

  const isChatVisible = activeNav === "Chat" || activeNav === "Communities";

  const token = sessionStorage.getItem("chatToken");

  const [profileImage, setProfileImage] = useState(null);

  const [showMembers, setShowMembers] = useState(false);
  const { selectedTeamMembers } = useSelector((state) => state.team);
  const dropdownRef = useRef(null);

  const searchRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false); // close dropdown
        setSearchQuery(""); // clear input

        if (!searchQuery) return; // if nothing typed, don't show toast

        // Show toast if data not available
        setToast("Data not available");
        setTimeout(() => setToast(""), 3000); // hide after 3s
      }
    };

    if (showSearch) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSearch, searchQuery]);

  // Hide dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowMembers(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ----------------- Poll Active Meeting & Check Joined -----------------
  useEffect(() => {
    if (!selectedTeam || !token) return;

    const fetchActiveMeeting = async () => {
      try {
        const res = await axios.get(
          `${URL}/api/teams/team/${selectedTeam.id}/active`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.active) {
          setActiveMeeting(res.data.meeting);

          console.log("Active meeting data:", res.data);

          const roomCode = res.data.meeting.meeting_code?.split("-")[2] || null;
          console.log("Room code:", roomCode);

          // Ask server if user has joined this meeting
          socket.emit(
            "checkJoined",
            {
              roomCode: roomCode, // <-- Use roomCode consistently
              userId: String(activeUser.id),
            },
            ({ joined }) => {
              // <-- FIX callback destructuring
              console.log("Check joined res:", joined);
              setHasJoinedMeeting(joined);
            }
          );
        } else {
          setActiveMeeting(null);
          setHasJoinedMeeting(false);
        }
      } catch (err) {
        console.error("Failed to check active meeting:", err);
      }
    };

    fetchActiveMeeting();
    const interval = setInterval(fetchActiveMeeting, 10000);
    return () => clearInterval(interval);
  }, [selectedTeam, token, activeUser.id]);

  // ----------------- Profile Image -----------------

 useEffect(() => {
  if (!activeUser) {
    setProfileImage(null);
    return;
  }

  const stored = localStorage.getItem(`profileImage_${activeUser.id}`);
  if (stored) {
    setProfileImage(stored);
  } else if (activeUser.profile_image) {
    const imgUrl = `${URL}${activeUser.profile_image}`;
    setProfileImage(imgUrl);
    localStorage.setItem(`profileImage_${activeUser.id}`, imgUrl);
  } else {
    setProfileImage(null);
  }
}, [activeUser]);


  // ----------------- Search Focus -----------------
  useEffect(() => {
    if (showSearch && searchInputRef.current) searchInputRef.current.focus();
  }, [showSearch]);

  // ----------------- Logout -----------------
  const logout = () => {
  sessionStorage.clear();        // clear session data
  localStorage.removeItem("chatToken"); 
  localStorage.removeItem("chatUser");
  // ✅ Keep profile image in localStorage
  setIsAuthenticated(false);
  navigate("/");
};


  // ----------------- Meeting Functions -----------------
  const startGroupCall = async () => {
    if (!selectedTeam) return;

    setIsCreatingMeeting(true);
    try {
      const response = await axios.get(
        `${URL}/api/teams/${selectedTeam.id}/meeting-link`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { meetingUrl, meetingCode } = response.data;

      window.open(`${window.location.origin}/prejoin/${meetingCode}`, "_blank");
    } catch (err) {
      console.error("❌ Failed to create meeting:", err);
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const joinActiveMeeting = async () => {
    if (!activeMeeting?.meeting_code || !selectedTeam) return;

    try {
      const response = await axios.get(
        `${URL}/api/teams/team/${selectedTeam.id}/active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { active, meeting } = response.data;

      console.log("Active meeting data:", response.data);

      if (active && meeting?.meeting_code === activeMeeting.meeting_code) {
        window.open(
          `${window.location.origin}/prejoin/${meeting.meeting_code}`,
          "_blank"
        );
      } else {
        alert("⚠️ This meeting is no longer active.");
      }
    } catch (err) {
      console.error("❌ Failed to validate meeting status:", err);
      alert("Unable to verify meeting status. Please try again.");
    }
  };

  // ----------------- Render Meeting Button -----------------
  const renderMeetingButton = () => {
    if (!selectedTeam || activeNav !== "Communities") return null;

    const buttonClass = hasJoinedMeeting
      ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
      : activeMeeting
      ? "bg-green-500 text-white hover:bg-green-600 animate-pulse"
      : "text-purple-600 bg-gray-100 hover:bg-purple-300";

    const buttonText = isCreatingMeeting
      ? "Creating..."
      : hasJoinedMeeting
      ? "Joined"
      : activeMeeting
      ? "Join Meeting"
      : "Start Meeting";

    return (
      <button
        className={`p-2 rounded-full transition-all duration-300 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait ${buttonClass}`}
        title={
          hasJoinedMeeting
            ? "You have already joined"
            : activeMeeting
            ? "Join Meeting"
            : "Start Meeting"
        }
        onClick={
          hasJoinedMeeting
            ? null
            : activeMeeting
            ? joinActiveMeeting
            : startGroupCall
        }
        disabled={isCreatingMeeting || hasJoinedMeeting}
      >
        <FaVideo size={18} className="text-purple-600" />
        <span className="text-sm font-medium">{buttonText}</span>
      </button>
    );
  };

  // ----------------- Render -----------------
  const displayName =
    selectedTeam && activeNav === "Communities"
      ? selectedTeam.name
      : selectedUser && activeNav === "Chat"
      ? selectedUser.username
      : "Select a chat";

  const displayProfileImage =
    selectedUser && !selectedTeam && selectedUser.profile_image
      ? `${URL}${selectedUser.profile_image}`
      : null;

  const canCall = selectedUser && !selectedTeam;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 pt-[20px] bg-slate-200 shadow-md border-b border-gray-200">
        {/* Left Section */}
        <div className="flex items-center gap-4 ml-[5px]">
          <img
            src="/logo - no background.png"
            alt="Logo"
            className="w-12 h-12 object-contain"
          />
          <h2 className="font-bold text-gray-600 text-[15px]">{activeNav}</h2>

          {isChatVisible && (selectedTeam || selectedUser) && (
            <div className="flex items-center gap-2 ml-[170px]">
              {displayProfileImage ? (
                <img
                  src={displayProfileImage}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover border border-gray-300"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-400 text-white rounded-full flex items-center justify-center text-xs font-semibold uppercase">
                  {displayName?.[0] || "?"}
                </div>
              )}
              <span className="text-gray-600 font-medium text-[15px] truncate max-w-[120px]">
                {displayName}
              </span>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {isChatVisible && renderMeetingButton()}
          {/* 👥 Group Members Button */}

          {isChatVisible && selectedTeam && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowMembers((prev) => !prev)}
                className="p-2 hover:bg-gray-100 rounded-full text-purple-600 transition-all duration-200 shadow-sm"
                title="View Group Members"
              >
                <FaUsers size={18} />
              </button>

              {showMembers && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden">
                  <div className="bg-purple-600 text-white px-3 py-2 text-sm font-semibold flex justify-between items-center">
                    <span>{selectedTeam?.name} Members</span>
                  </div>

                  {/* Members List */}
                  <ul className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {selectedTeamMembers?.length > 0 ? (
                      selectedTeamMembers.map((member) => (
                        <li
                          key={member.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors duration-200"
                        >
                          {member.profile_image ? (
                            <img
                              src={`${URL}${member.profile_image}`}
                              alt={member.username}
                              className="w-7 h-7 rounded-full object-cover border border-gray-300"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-purple-400 text-white flex items-center justify-center text-xs font-semibold uppercase">
                              {member.username?.[0] || "?"}
                            </div>
                          )}
                          <span className="text-gray-700 text-sm font-medium truncate">
                            {member.username}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-center text-gray-500 text-sm py-3">
                        No members found
                      </li>
                    )}
                  </ul>

                  {/* ➕ Add Member Option */}
                  <button
                    onClick={() => {
                      setShowMembers(false);
                      handleAddMember(); // 👈 call your function (defined below)
                    }}
                    className="w-full px-3 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 border-t border-gray-100 flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    <span className="text-lg">➕</span> Add Member
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Individual call buttons */}
          {isChatVisible && selectedUser && !selectedTeam && (
            <>
              <button
                className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm transform rotate-45"
                title="Audio Call"
                disabled={!canCall}
                onClick={() => onStartCall("audio", selectedUser)}
              >
                <FaPhone style={{ transform: "rotate(45deg)" }} size={15} />
              </button>

              <button
                className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
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
                onClick={() => {
                  if (showSearch) setSearchQuery("");
                  setShowSearch((prev) => !prev);
                }}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-all duration-200 shadow-sm"
                title="Search in Chat"
              >
                <FaSearch />
              </button>

              {showSearch && (
                <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-3 flex flex-col gap-2 transition-all duration-300 z-50">
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
            className="flex flex-col items-center justify-center p-1 rounded-full cursor-pointer hover:bg-purple-100 transition-all duration-300 relative"
            title={username}
            onClick={() => setShowProfileModal((prev) => !prev)} // ✅ toggle
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold border-2 border-purple-500">
                {username?.[0]?.toUpperCase() || "G"}
              </div>
            )}
            <div className="text-black font-semibold text-xs mt-1">
              {username}
            </div>
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
    </>
  );
}
