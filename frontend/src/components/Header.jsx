import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaPhone, FaVideo } from "react-icons/fa";
import { FaUsers, FaUser, FaUserPlus, FaCrown, FaShieldAlt } from "react-icons/fa";

import { useSelector } from "react-redux";
import ProfileModal from "./ProfileModal";
import ErrorBoundary from "./ErrorBoundary";
import { URL } from "../config";
import axios from "axios";
import socket from "./calls/hooks/socket";


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

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const searchInputRef = useRef(null);
  const { selectedUser, activeNav } = useSelector((state) => state.user);
  const username = activeUser?.username || "Guest";
  const { selectedTeam } = useSelector((state) => state.team);
  const isChatVisible = activeNav === "Chat" || activeNav === "Communities";
  const token = sessionStorage.getItem("chatToken");
  const [profileImage, setProfileImage] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const { selectedTeamMembers } = useSelector((state) => state.team);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSearchQuery("");
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

      if (!res.data.active) {
        setActiveMeeting(null);
        setHasJoinedMeeting(false);
        return;
      }

      // Meeting exists
      const meeting = res.data.meeting;
      setActiveMeeting(meeting);

      // Extract room code
      const parts = meeting.meeting_code.split("-");
      const roomCode = parts.slice(2).join("-");
      console.log("Room Code:", roomCode);

      // Ask server if this user has joined
      socket.emit("header-checkJoined", {
        roomCode,
        userId: String(activeUser.id),
        requesterSocketId: socket.id,   // ONLY SEND THE ID
      });

    } catch (err) {
      console.error("Failed to check active meeting:", err);
    }
  };

  // FIRST CALL
  fetchActiveMeeting();

  // POLL EVERY 10 SECONDS
  const interval = setInterval(fetchActiveMeeting, 10000);

  return () => clearInterval(interval);

}, [selectedTeam, token, activeUser.id]);


// ---------------- LISTENER (REGISTER ONCE) ----------------
// Wee need this listner(checkJoined response as there are multiple sockets connecting from different tabs )
// and backend will emit only to socket of meetingRoom tab so we have sent the socketId from above header-checkJoined and needs a reciever here
// to update hasJoinedStatus
useEffect(() => {
  const handleCheckJoined = ({ joined }) => {
    console.log("Check joined res:", joined);
    setHasJoinedMeeting(joined);
  };

  socket.on("checkJoinedResponse", handleCheckJoined);

  return () => {
    socket.off("checkJoinedResponse", handleCheckJoined);
  };
}, []);


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

  // --------------------------------------------------------
  // TOAST SYSTEM
  // --------------------------------------------------------
  useEffect(() => {
    const handler = (e) => {
      setToastMsg(e.detail?.message || "");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };

    window.addEventListener("user-left-toast", handler);
    window.addEventListener("user-joined-toast", handler);
    return () => {
      window.removeEventListener("user-left-toast", handler);
      window.removeEventListener("user-joined-toast", handler);
    };
  }, []);
  // --------------------------------------------------------
  // TOAST SYSTEM
  // --------------------------------------------------------
  useEffect(() => {
    const handler = (e) => {
      setToastMsg(e.detail?.message || "");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };

    window.addEventListener("user-left-toast", handler);
    window.addEventListener("user-joined-toast", handler);
    return () => {
      window.removeEventListener("user-left-toast", handler);
      window.removeEventListener("user-joined-toast", handler);
    };
  }, []);

  // ----------------- Logout -----------------
  const logout = () => {
    sessionStorage.clear(); // clear session data
    localStorage.removeItem("chatToken");
    localStorage.removeItem("chatUser");
    //  Keep profile image in localStorage
    
    setIsAuthenticated(false);

    socket.disconnect();

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
      console.error(" Failed to create meeting:", err);
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
      console.error(" Failed to validate meeting status:", err);
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

        <div>
          {/* TOAST */}
          {showToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-purple-600 text-white rounded shadow-lg z-[3000]">
              {toastMsg}
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {isChatVisible && renderMeetingButton()}
          {/* 👥 Group Members Button */}

          {isChatVisible && selectedTeam && (
            <div className="relative" ref={dropdownRef}>
              {/* Members Button */}
              <button
                onClick={() => setShowMembers((prev) => !prev)}
                className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm transform "
                title="View Group Members"
              >
                <FaUsers size={18} />
              </button>

              {showMembers && (
                <div
                  className="absolute right-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl 
                   shadow-2xl z-50 overflow-hidden animate-fadeIn"
                >
                  {/* Dropdown Header */}
                  <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 text-sm font-semibold flex items-center gap-2">
                    <FaUsers size={14} className="opacity-90" />
                    <span>{selectedTeam?.name} Members</span>
                  </div>

                  {/* Members List */}
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
                                {member.username?.[0] || "?"}
                              </div>
                            )}

                            <span className="text-gray-900 text-sm font-semibold">
                              {member.username}
                            </span>
                          </div>

                          {/* ICON showing role */}
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

                  {/* Add Member Button */}
                  <button
                    onClick={() => {
                      setShowMembers(false);

                      const myRole = selectedTeamMembers.find(
                        (m) => m.user_id === activeUser.id
                      )?.role;

                      if (myRole === "owner" || myRole === "admin") {
                        handleOpenAddMember();
                      } else {
                        toast.error("Only admins can add members");
                      }
                    }}
                    className="w-full bg-purple-100 py-3 flex items-center justify-center gap-2 text-purple-700  
                     font-semibold hover:bg-purple-200 border-t border-gray-100 transition-all"
                  >
                    <FaUserPlus size={16} />
                    <span>Add / Remove Member</span>
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

// import { useState, useRef, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { FaSearch, FaPhone, FaVideo } from "react-icons/fa";
// import { FaUsers, FaUser, FaUserPlus, FaCrown, FaShieldAlt } from "react-icons/fa";

// import { useSelector } from "react-redux";
// import ProfileModal from "./ProfileModal";
// import ErrorBoundary from "./ErrorBoundary";
// import { URL } from "../config";
// import axios from "axios";
// import socket from "./calls/hooks/socket";

// // Assuming CreateTeams is imported elsewhere or not needed here, 
// // but keeping the dependency structure clean.
// // import CreateTeams from "./CreateTeams"; 
// // You may need to import `toast` if you are using it in handleOpenAddMember
// // import { toast } from 'react-toastify'; 


// export default function Header({
//   activeUser,
//   onStartCall,
//   searchQuery,
//   setSearchQuery,
//   setIsAuthenticated,
// }) {
//   const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
//   const navigate = useNavigate();
//   const [showSearch, setShowSearch] = useState(false);
//   const [activeMeeting, setActiveMeeting] = useState(null);
//   const [showProfileModal, setShowProfileModal] = useState(false);
//   const [hasJoinedMeeting, setHasJoinedMeeting] = useState(false);
  
//   // ✅ NEW STATE: To show the meeting permission selection dropdown
//   const [showMeetingTypeSelection, setShowMeetingTypeSelection] = useState(false); 

//   const [showToast, setShowToast] = useState(false);
//   const [toastMsg, setToastMsg] = useState("");

//   const searchInputRef = useRef(null);
//   const { selectedUser, activeNav } = useSelector((state) => state.user);
//   const username = activeUser?.username || "Guest";
//   const { selectedTeam, selectedTeamMembers } = useSelector((state) => state.team);
//   const isChatVisible = activeNav === "Chat" || activeNav === "Communities";
//   const token = sessionStorage.getItem("chatToken");
//   const [profileImage, setProfileImage] = useState(null);
//   const [showMembers, setShowMembers] = useState(false);
//   const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
//   const [teamToEdit, setTeamToEdit] = useState(null);
  
//   const dropdownRef = useRef(null);
//   const searchRef = useRef(null);
//   // ✅ NEW REF: For the meeting button/selection container
//   const meetingButtonRef = useRef(null); 

//   // --- Utility Effect (Keep Existing) ---
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (searchRef.current && !searchRef.current.contains(e.target)) {
//         setShowSearch(false);
//         setSearchQuery("");
//       }
//     };
//     if (showSearch) {
//       document.addEventListener("mousedown", handleClickOutside);
//     } else {
//       document.removeEventListener("mousedown", handleClickOutside);
//     }
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, [showSearch, searchQuery]);

//   // --- Utility Effect (Keep Existing) ---
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//         setShowMembers(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);
  
//   // ✅ NEW EFFECT: Hide meeting type selection on outside click
//   useEffect(() => {
//     const handleOutsideClick = (e) => {
//       if (meetingButtonRef.current && !meetingButtonRef.current.contains(e.target)) {
//         setShowMeetingTypeSelection(false);
//       }
//     };
//     document.addEventListener("mousedown", handleOutsideClick);
//     return () => document.removeEventListener("mousedown", handleOutsideClick);
//   }, []);

// // ----------------- Poll Active Meeting & Check Joined (Keep Existing) -----------------
// useEffect(() => {
//   if (!selectedTeam || !token) return;

//   const fetchActiveMeeting = async () => {
//     try {
//       const res = await axios.get(
//         `${URL}/api/teams/team/${selectedTeam.id}/active`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       if (!res.data.active) {
//         setActiveMeeting(null);
//         setHasJoinedMeeting(false);
//         return;
//       }

//       // Meeting exists
//       const meeting = res.data.meeting;
//       setActiveMeeting(meeting);

//       // Extract room code
//       const parts = meeting.meeting_code.split("-");
//       const roomCode = parts.slice(2).join("-");
//       console.log("Room Code:", roomCode);

//       // Ask server if this user has joined
//       socket.emit("header-checkJoined", {
//         roomCode,
//         userId: String(activeUser.id),
//         requesterSocketId: socket.id, // ONLY SEND THE ID
//       });

//     } catch (err) {
//       console.error("Failed to check active meeting:", err);
//     }
//   };

//   // FIRST CALL
//   fetchActiveMeeting();

//   // POLL EVERY 10 SECONDS
//   const interval = setInterval(fetchActiveMeeting, 10000);

//   return () => clearInterval(interval);

// }, [selectedTeam, token, activeUser.id]);


// // ---------------- LISTENER (REGISTER ONCE) (Keep Existing) ----------------
// useEffect(() => {
//   const handleCheckJoined = ({ joined }) => {
//     console.log("Check joined res:", joined);
//     setHasJoinedMeeting(joined);
//   };

//   socket.on("checkJoinedResponse", handleCheckJoined);

//   return () => {
//     socket.off("checkJoinedResponse", handleCheckJoined);
//   };
// }, []);


//   // ----------------- Profile Image (Keep Existing) -----------------

//   useEffect(() => {
//     if (!activeUser) {
//       setProfileImage(null);
//       return;
//     }

//     const stored = localStorage.getItem(`profileImage_${activeUser.id}`);
//     if (stored) {
//       setProfileImage(stored);
//     } else if (activeUser.profile_image) {
//       const imgUrl = `${URL}${activeUser.profile_image}`;
//       setProfileImage(imgUrl);
//       localStorage.setItem(`profileImage_${activeUser.id}`, imgUrl);
//     } else {
//       setProfileImage(null);
//     }
//   }, [activeUser]);

//   // ----------------- Search Focus (Keep Existing) -----------------
//   useEffect(() => {
//     if (showSearch && searchInputRef.current) searchInputRef.current.focus();
//   }, [showSearch]);

//   // ----------------- TOAST SYSTEM (Keep Existing) -----------------
//   useEffect(() => {
//     const handler = (e) => {
//       setToastMsg(e.detail?.message || "");
//       setShowToast(true);
//       setTimeout(() => setShowToast(false), 3000);
//     };

//     window.addEventListener("user-left-toast", handler);
//     window.addEventListener("user-joined-toast", handler);
//     return () => {
//       window.removeEventListener("user-left-toast", handler);
//       window.removeEventListener("user-joined-toast", handler);
//     };
//   }, []);

//   // ----------------- Logout (Keep Existing) -----------------
//   const logout = () => {
//     sessionStorage.clear(); // clear session data
//     localStorage.removeItem("chatToken");
//     localStorage.removeItem("chatUser");
//     // Keep profile image in localStorage
    
//     setIsAuthenticated(false);

//     socket.disconnect();

//     navigate("/");
//   };

//   // ----------------- Meeting Functions (MODIFIED) -----------------
  
//   // ✅ MODIFIED: This function now just shows the selection UI
//   const startGroupCall = () => {
//     if (!selectedTeam || isCreatingMeeting || hasJoinedMeeting) return;
    
//     // Toggle the selection UI
//     setShowMeetingTypeSelection((prev) => !prev); 
//   };
  
//   // ✅ NEW FUNCTION: Handles the creation after permission is selected
//   const createMeetingWithPermission = async (isControlled) => {
//     if (!selectedTeam || isCreatingMeeting) return;

//     // The value you need to send to the backend
//     console.log("Starting meeting with permission:", isControlled ? "Controlled" : "Open");

//     setIsCreatingMeeting(true);
//     setShowMeetingTypeSelection(false); // Close selection immediately
    
//     try {
//       // 1. Send the `isControlled` value to the backend
//       // Using POST for resource creation is best practice
//       const response = await axios.post(
//         `${URL}/api/teams/${selectedTeam.id}/meeting-link`,
//         { isControlled }, // <-- Data payload with the required permission
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
      
//       const { meetingUrl, meetingCode } = response.data;
//       console.log("Created meeting code:", meetingCode);

//       // 2. Open the meeting link
//       window.open(`${window.location.origin}/prejoin/${meetingCode}`, "_blank");
      
//     } catch (err) {
//       console.error(" Failed to create meeting:", err);
//       // alert("Failed to start meeting. Please try again.");
//     } finally {
//       setIsCreatingMeeting(false);
//     }
//   };

//   const joinActiveMeeting = async () => {
//     if (!activeMeeting?.meeting_code || !selectedTeam) return;

//     try {
//       const response = await axios.get(
//         `${URL}/api/teams/team/${selectedTeam.id}/active`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const { active, meeting } = response.data;

//       console.log("Active meeting data:", response.data);

//       if (active && meeting?.meeting_code === activeMeeting.meeting_code) {
//         window.open(
//           `${window.location.origin}/prejoin/${meeting.meeting_code}`,
//           "_blank"
//         );
//       } else {
//         alert("⚠️ This meeting is no longer active.");
//       }
//     } catch (err) {
//       console.error(" Failed to validate meeting status:", err);
//       alert("Unable to verify meeting status. Please try again.");
//     }
//   };

//   // ----------------- Render Meeting Button (MODIFIED) -----------------
//   const renderMeetingButton = () => {
//     if (!selectedTeam || activeNav !== "Communities") return null;

//     const buttonClass = hasJoinedMeeting
//       ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
//       : activeMeeting
//       ? "bg-green-500 text-white hover:bg-green-600 animate-pulse"
//       : "text-purple-600 bg-gray-100 hover:bg-purple-300";

//     const buttonText = isCreatingMeeting
//       ? "Creating..."
//       : hasJoinedMeeting
//       ? "Joined"
//       : activeMeeting
//       ? "Join Meeting"
//       : "Start Meeting";

//     return (
//       // ✅ Wrap the button in a div with a ref to handle outside clicks for the dropdown
//       <div className="relative" ref={meetingButtonRef}> 
//         <button
//           className={`p-2 rounded-full transition-all duration-300 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait ${buttonClass}`}
//           title={
//             hasJoinedMeeting
//               ? "You have already joined"
//               : activeMeeting
//               ? "Join Meeting"
//               : "Start Meeting"
//           }
//           onClick={
//             hasJoinedMeeting
//               ? null
//               : activeMeeting
//               ? joinActiveMeeting
//               : startGroupCall // <-- Call the function to show selection
//           }
//           disabled={isCreatingMeeting || hasJoinedMeeting}
//         >
//           <FaVideo size={18} className="text-purple-600" />
//           <span className="text-sm font-medium">{buttonText}</span>
//         </button>

//         {/* ✅ NEW: Meeting Type Selection Dropdown */}
//         {showMeetingTypeSelection && (
//           <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-fadeIn">
//             <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-100 bg-gray-50">
//               Select Sharing Mode:
//             </div>
//             {/* Option: Controlled (isControlled: true) */}
//             <button
//               onClick={() => createMeetingWithPermission(true)}
//               className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-3 transition-colors duration-150"
//             >
//               <FaShieldAlt className="text-purple-600" size={14} />
//               <div className="flex flex-col items-start">
//                 <span className="font-semibold">Controlled</span>
//                 <span className="text-xs text-gray-500">Owner decides who shares screen</span>
//               </div>
//             </button>
//             {/* Option: Open (isControlled: false) */}
//             <button
//               onClick={() => createMeetingWithPermission(false)}
//               className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-3 transition-colors duration-150"
//             >
//               <FaUsers className="text-green-600" size={14} />
//               <div className="flex flex-col items-start">
//                 <span className="font-semibold">Open</span>
//                 <span className="text-xs text-gray-500">All participants can share</span>
//               </div>
//             </button>
//           </div>
//         )}
//       </div>
//     );
//   };

//   // ----------------- Render (Keep Existing) -----------------
//   const displayName =
//     selectedTeam && activeNav === "Communities"
//       ? selectedTeam.name
//       : selectedUser && activeNav === "Chat"
//       ? selectedUser.username
//       : "Select a chat";

//   const displayProfileImage =
//     selectedUser && !selectedTeam && selectedUser.profile_image
//       ? `${URL}${selectedUser.profile_image}`
//       : null;

//   const canCall = selectedUser && !selectedTeam;
  
//   // Placeholder function for handleOpenAddMember (assuming it exists elsewhere)
//   const handleOpenAddMember = () => {
//     // Logic to open the add member modal
//     console.log("Opening Add Member modal...");
//     // setShowCreateTeamModal(true); // Assuming this is reused for add member
//   };

//   return (
//     <>
//       <div className="flex items-center justify-between px-4 py-2 pt-[20px] bg-slate-200 shadow-md border-b border-gray-200">
//         {/* Left Section (Keep Existing) */}
//         <div className="flex items-center gap-4 ml-[5px]">
//           <img
//             src="/logo - no background.png"
//             alt="Logo"
//             className="w-12 h-12 object-contain"
//           />
//           <h2 className="font-bold text-gray-600 text-[15px]">{activeNav}</h2>

//           {isChatVisible && (selectedTeam || selectedUser) && (
//             <div className="flex items-center gap-2 ml-[170px]">
//               {displayProfileImage ? (
//                 <img
//                   src={displayProfileImage}
//                   alt={displayName}
//                   className="w-8 h-8 rounded-full object-cover border border-gray-300"
//                 />
//               ) : (
//                 <div className="w-8 h-8 bg-blue-400 text-white rounded-full flex items-center justify-center text-xs font-semibold uppercase">
//                   {displayName?.[0] || "?"}
//                 </div>
//               )}
//               <span className="text-gray-600 font-medium text-[15px] truncate max-w-[120px]">
//                 {displayName}
//               </span>
//             </div>
//           )}
//         </div>

//         <div>
//           {/* TOAST (Keep Existing) */}
//           {showToast && (
//             <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-purple-600 text-white rounded shadow-lg z-[3000]">
//               {toastMsg}
//             </div>
//           )}
//         </div>

//         {/* Right Section */}
//         <div className="flex items-center gap-3">
//           {/* ✅ RENDER MODIFIED MEETING BUTTON */}
//           {isChatVisible && renderMeetingButton()} 
          
//           {/* 👥 Group Members Button (Keep Existing) */}

//           {isChatVisible && selectedTeam && (
//             <div className="relative" ref={dropdownRef}>
//               {/* Members Button */}
//               <button
//                 onClick={() => setShowMembers((prev) => !prev)}
//                 className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm transform "
//                 title="View Group Members"
//               >
//                 <FaUsers size={18} />
//               </button>

//               {showMembers && (
//                 <div
//                   className="absolute right-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl 
//                     shadow-2xl z-50 overflow-hidden animate-fadeIn"
//                 >
//                   {/* Dropdown Header */}
//                   <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 text-sm font-semibold flex items-center gap-2">
//                     <FaUsers size={14} className="opacity-90" />
//                     <span>{selectedTeam?.name} Members</span>
//                   </div>

//                   {/* Members List */}
//                   <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
//                     {selectedTeamMembers?.length > 0 ? (
//                       selectedTeamMembers.map((member) => (
//                         <li
//                           key={member.user_id}
//                           className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-all"
//                         >
//                           <div className="flex items-center gap-3">
//                             {member.profile_image ? (
//                               <img
//                                 src={`${URL}${member.profile_image}`}
//                                 alt={member.username}
//                                 className="w-9 h-9 rounded-full object-cover border border-gray-300 shadow-sm"
//                               />
//                             ) : (
//                               <div className="w-9 h-9 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold uppercase shadow-sm">
//                                 {member.username?.[0] || "?"}
//                               </div>
//                             )}

//                             <span className="text-gray-900 text-sm font-semibold">
//                               {member.username}
//                             </span>
//                           </div>

//                           {/* ICON showing role */}
//                           <div>
//                             {member.role === "owner" && (
//                               <FaCrown
//                                 className="text-yellow-500"
//                                 title="Owner"
//                                 size={16}
//                               />
//                             )}
//                             {member.role === "admin" && (
//                               <FaShieldAlt
//                                 className="text-purple-500"
//                                 title="Admin"
//                                 size={16}
//                               />
//                             )}
//                             {member.role === "member" && (
//                               <FaUser
//                                 className="text-gray-400"
//                                 title="Member"
//                                 size={16}
//                               />
//                             )}
//                           </div>
//                         </li>
//                       ))
//                     ) : (
//                       <li className="text-center text-gray-500 text-sm py-4">
//                         No members found
//                       </li>
//                     )}
//                   </ul>

//                   {/* Add Member Button */}
//                   <button
//                     onClick={() => {
//                       setShowMembers(false);

//                       const myRole = selectedTeamMembers.find(
//                         (m) => m.user_id === activeUser.id
//                       )?.role;

//                       if (myRole === "owner" || myRole === "admin") {
//                         // Assuming handleOpenAddMember is defined elsewhere or should be implemented
//                         // handleOpenAddMember(); 
//                         alert("Handle Add Member logic needs to be implemented/imported.");
//                       } else {
//                         // Assuming toast is imported
//                         // toast.error("Only admins can add members");
//                         alert("Only admins can add members");
//                       }
//                     }}
//                     className="w-full bg-purple-100 py-3 flex items-center justify-center gap-2 text-purple-700  
//                       font-semibold hover:bg-purple-200 border-t border-gray-100 transition-all"
//                   >
//                     <FaUserPlus size={16} />
//                     <span>Add / Remove Member</span>
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Individual call buttons (Keep Existing) */}
//           {isChatVisible && selectedUser && !selectedTeam && (
//             <>
//               <button
//                 className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm transform rotate-45"
//                 title="Audio Call"
//                 disabled={!canCall}
//                 onClick={() => onStartCall("audio", selectedUser)}
//               >
//                 <FaPhone style={{ transform: "rotate(45deg)" }} size={15} />
//               </button>

//               <button
//                 className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
//                 title="Video Call"
//                 disabled={!canCall}
//                 onClick={() => onStartCall("video", selectedUser)}
//               >
//                 <FaVideo />
//               </button>
//             </>
//           )}

//           {/* Search (Keep Existing) */}
//           {isChatVisible && (selectedUser || selectedTeam) && (
//             <div className="relative" ref={searchRef}>
//               <button
//                 onClick={() => {
//                   if (showSearch) setSearchQuery("");
//                   setShowSearch((prev) => !prev);
//                 }}
//                 className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-all duration-200 shadow-sm"
//                 title="Search in Chat"
//               >
//                 <FaSearch />
//               </button>

//               {showSearch && (
//                 <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-3 flex flex-col gap-2 transition-all duration-300 z-50">
//                   <label
//                     htmlFor="chatSearchInput"
//                     className="text-xs font-semibold text-gray-500"
//                   >
//                     Search Chat:
//                   </label>
//                   <div className="relative mt-1">
//                     <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
//                     <input
//                       id="chatSearchInput"
//                       type="text"
//                       placeholder="Type to search..."
//                       value={searchQuery}
//                       onChange={(e) => setSearchQuery(e.target.value)}
//                       ref={searchInputRef}
//                       className="w-full pl-8 pr-2 py-1.5 rounded-2xl bg-gray-200 text-sm placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Profile Avatar (Keep Existing) */}
//           <div
//             className="flex flex-col items-center justify-center p-1 rounded-full cursor-pointer hover:bg-purple-100 transition-all duration-300 relative"
//             title={username}
//             onClick={() => setShowProfileModal((prev) => !prev)} // ✅ toggle
//           >
//             {profileImage ? (
//               <img
//                 src={profileImage}
//                 alt="Profile"
//                 className="h-8 w-8 rounded-full object-cover"
//               />
//             ) : (
//               <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold border-2 border-purple-500">
//                 {username?.[0]?.toUpperCase() || "G"}
//               </div>
//             )}
//             <div className="text-black font-semibold text-xs mt-1">
//               {username}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Profile Modal (Keep Existing) */}
//       {showProfileModal && activeUser && (
//         <ErrorBoundary>
//           <ProfileModal
//             user={activeUser}
//             onClose={() => setShowProfileModal(false)}
//             onLogout={logout}
//             setProfileImage={(img) => {
//               setProfileImage(img);
//               if (img)
//                 localStorage.setItem(`profileImage_${activeUser.id}`, img);
//               else localStorage.removeItem(`profileImage_${activeUser.id}`);
//             }}
//           />
//         </ErrorBoundary>
//       )}
//       {/* Assuming CreateTeams component is available */}
//       {showCreateTeamModal && (
//         // <CreateTeams
//         //   currentUser={activeUser}
//         //   showModal={showCreateTeamModal}
//         //   setShowModal={setShowCreateTeamModal}
//         //   socket={socket}
//         //   existingTeam={teamToEdit}
//         // />
//         null // Replace with CreateTeams if imported
//       )}
//     </>
//   );
// }