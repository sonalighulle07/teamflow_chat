// src/components/admin/TopBar.jsx
import { LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { FaSearch } from "react-icons/fa";

export default function TopBar({
  setIsAuthenticated,
  userName,
  userAvatar,
  userId,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileImage, setProfileImage] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Show search only on dashboard page
  const showSearch = location.pathname === "/org-admin";

  // Load avatar from cache or fallback
  useEffect(() => {
    if (!userId) return setProfileImage(null);
    const stored = localStorage.getItem(`profileImage_${userId}`);
    if (stored) setProfileImage(stored);
    else if (userAvatar) {
      setProfileImage(userAvatar);
      localStorage.setItem(`profileImage_${userId}`, userAvatar);
    } else setProfileImage(null);
  }, [userAvatar, userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ").filter(Boolean);
    const initials = parts.map((part) => part[0].toUpperCase());
    return initials.slice(0, 2).join("");
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("chatToken");
    localStorage.removeItem("chatUser");
    if (setIsAuthenticated) setIsAuthenticated(false);
    navigate("/login");
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
      {/* Left: Search */}
      <div className="flex items-center gap-4 ">
        {showSearch && (
          <div className="relative w-72 ">
            {/* Search icon */}
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="pl-10 pr-3 w-full py-1 text-sm border bg-[#F5F5F580] border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        )}
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-5">
        {/* Notification */}
        <div className="relative cursor-pointer">
          <img
            src="/Icons/tdesign_notification.png" // replace with your notification image
            alt="Notifications"
            className="w-5 h-5"
          />
          {/* <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span> */}
        </div>

        {/* Profile */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((prev) => !prev)}
            className="flex items-center gap-2 focus:outline-none"
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="User Avatar"
                className="w-11 h-11 rounded-full object-cover border-2 border-gray-300"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-[12px] border-2 border-gray-100">
                {getInitials(userName) || "AM"}
              </div>
            )}
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-all"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
