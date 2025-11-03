import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaPhone, FaVideo } from "react-icons/fa";
import { useSelector } from "react-redux";
import ProfileModal from "./ProfileModal";
import ErrorBoundary from "./ErrorBoundary";
import { URL } from "../config";

export default function Header({
  activeUser,
  onStartCall,
  searchQuery,
  setSearchQuery,
  setIsAuthenticated,
}) {
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const searchInputRef = useRef(null);
  const { selectedUser } = useSelector((state) => state.user);
  const { selectedTeam } = useSelector((state) => state.team);

  const username = activeUser?.username || "Guest";

  const [profileImage, setProfileImage] = useState(
    () => localStorage.getItem(`profileImage_${activeUser?.id}`) || null
  );

  // Update profile image when activeUser changes
  useEffect(() => {
    if (activeUser?.profile_image) {
      const imgUrl = `${URL}${activeUser.profile_image}`;
      setProfileImage(imgUrl);
      localStorage.setItem(`profileImage_${activeUser.id}`, imgUrl);
    }
  }, [activeUser]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) searchInputRef.current.focus();
  }, [showSearch]);

  const toggleSearch = () => {
    if (showSearch) setSearchQuery("");
    setShowSearch((prev) => !prev);
  };

  const logout = () => {
    sessionStorage.clear();
    localStorage.removeItem(`profileImage_${activeUser?.id}`);
    setIsAuthenticated(false);
    navigate("/");
  };

  // Determine display name and profile image
  const displayName = selectedTeam
    ? selectedTeam.name
    : selectedUser
    ? selectedUser.username
    : "Select a chat";

  const displayProfileImage =
    selectedUser && !selectedTeam && selectedUser.profile_image
      ? `${URL}${selectedUser.profile_image}`
      : null;

  // Enable call buttons only if a user is selected and not a team
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
          <h2 className="font-bold text-gray-600 text-[15px]">Chat</h2>

          {/* Selected user/team pill */}
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
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Audio Call */}
          <button
            className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            title="Audio Call"
            disabled={!canCall}
            onClick={() => onStartCall("audio", selectedUser)}
          >
            <FaPhone size={15} />
          </button>

          {/* Video Call */}
          <button
            className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            title="Video Call"
            disabled={!canCall}
            onClick={() => onStartCall("video", selectedUser)}
          >
            <FaVideo />
          </button>

          {/* Search */}
          <div className="relative">
            <button
              onClick={toggleSearch}
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

          {/* Profile Avatar */}
          <div
            className="flex flex-col items-center justify-center p-1 rounded-full cursor-pointer hover:bg-purple-100 transition-all duration-300 relative"
            title={username}
            onClick={() => setShowProfileModal(true)}
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
            setIsAuthenticated={setIsAuthenticated}
          />
        </ErrorBoundary>
      )}
    </>
  );
}
