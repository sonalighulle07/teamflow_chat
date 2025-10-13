import { useState, useRef, useEffect } from "react";
import { FiLogOut } from "react-icons/fi";
import {
  FaUserCog,
  FaSearch,
  FaPhone,
  FaVideo,
  FaEllipsisV,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import ProfileModal from "./ProfileModal";
import ErrorBoundary from "./ErrorBoundary";
import { URL } from "../config";

export default function Header({
  activeUser,
  onStartCall,
  searchQuery,
  setSearchQuery,
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileImage, setProfileImage] = useState(
    () => localStorage.getItem("profileImage") || null
  );

  const searchInputRef = useRef(null);
  const  { selectedUser } = useSelector((state) => state.user);

  const username = activeUser?.username || "Guest";

  const logout = () => {
    sessionStorage.clear();
    localStorage.removeItem("profileImage");
    window.location.href = "/login.html";
  };

  // Update profile image safely
  useEffect(() => {
    if (activeUser?.profile_image) {
      const imgUrl = `${URL}${activeUser.profile_image}`;
      setProfileImage(imgUrl);
      localStorage.setItem("profileImage", imgUrl);
    }

  }, [activeUser]);

  useEffect(()=>{
    console.log("Selected user from header"+JSON.stringify(selectedUser))
  },[selectedUser])

  useEffect(() => {
    if (showSearch && searchInputRef.current) searchInputRef.current.focus();
  }, [showSearch]);

  const toggleSearch = () => {
    if (showSearch) setSearchQuery("");
    setShowSearch((prev) => !prev);
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-200 shadow-md border-b border-gray-200">
        {/* Left */}
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-gray-800 text-lg">Chat</h2>
          <h6 className="text-gray-500 text-sm flex items-center gap-1">
            Recent <span className="text-xs">▼</span>
          </h6>
          <div className="text-sm text-gray-700 font-medium ml-2">
            {selectedUser ? selectedUser.username : "Select a chat"}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <button
            className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Audio Call"
            disabled={!selectedUser}
            onClick={() => onStartCall("audio", selectedUser)}
          >
            <FaPhone />
          </button>

          <button
            className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Video Call"
            disabled={!selectedUser}
            onClick={() => onStartCall("video", selectedUser)}
          >
            <FaVideo />
          </button>

          <div className="relative">
            <button
              onClick={toggleSearch}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
              title="Search in Chat"
            >
              <FaSearch />
            </button>
            {showSearch && (
              <div className="absolute right-0 mt-1 w-72 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-3 flex flex-col gap-2 transition-all duration-300 z-50">
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
                    className="w-full pl-8 pr-2 py-1.5 rounded-2xl bg-gray-200 text-sm placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
            title="Manage Group"
          >
            <FaUserCog />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
            title="More Options"
          >
            <FaEllipsisV />
          </button>

          <button
            onClick={logout}
            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition flex items-center justify-center"
            title="Logout"
          >
            <FiLogOut className="w-4 h-4" />
          </button>

          <div
            className="flex flex-col items-center justify-center p-1 rounded cursor-pointer hover:bg-purple-400/30 transition-all duration-300"
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
              <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                {username[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-black font-semibold text-xs mt-1">
              {username}
            </div>
          </div>
        </div>
      </div>

      {showProfileModal && activeUser && (
        <ErrorBoundary>
          <ProfileModal
            user={activeUser}
            onClose={() => setShowProfileModal(false)}
            onLogout={logout}
            setProfileImage={(img) => {
              setProfileImage(img);
              if (img) localStorage.setItem("profileImage", img);
              else localStorage.removeItem("profileImage");
            }}
          />
        </ErrorBoundary>
      )}
    </>
  );
}
