import { useState } from "react";
import {
  FaSearch,
  FaPhone,
  FaVideo,
} from "react-icons/fa";

export default function Header({
  activeUser,
  selectedUser,
  onStartCall,
  searchQuery,
  setSearchQuery,
}) {
  const [showSearch, setShowSearch] = useState(false);

  const username = activeUser?.username || "Guest";

  const logout = () => {
    sessionStorage.clear();
    window.location.href = "/login.html";
  };
  return (
    <div className="flex items-center justify-between px-4 py-2 mb-0.5 bg-slate-200 shadow-md border-b border-gray-200">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-gray-800 text-lg">Chat</h2>
        <h6 className="text-gray-500 text-sm flex items-center gap-1">
          Recent <span className="text-xs">▼</span>
        </h6>

        {/* Selected user name */}
        <div className="text-sm text-gray-700 font-medium ml-2">
          {selectedUser ? selectedUser.username : "Select a chat"}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Audio Call */}
        <button
          className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Audio Call"
          disabled={!selectedUser}
          onClick={() => onStartCall("audio", selectedUser)}
        >
          <FaPhone />
        </button>

        {/* Video Call */}
        <button
          className="p-2 hover:bg-gray-100 rounded-full text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Video Call"
          disabled={!selectedUser}
          onClick={() => onStartCall("video", selectedUser)}
        >
          <FaVideo />
        </button>

        {/* Toggleable search */}
        <div className="relative">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
            title="Search in Chat"
          >
            <FaSearch />
          </button>
          {showSearch && (
            <div
              className="absolute right-0 mt-2 w-72 bg-white/80 backdrop-blur-md border border-gray-200
               rounded-2xl shadow-xl p-3 flex flex-col gap-2
               transition-all duration-300 hover:shadow-2xl"
            >
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
                  value={searchQuery} // controlled from parent
                  onChange={(e) => setSearchQuery(e.target.value)} // update parent
                  className="w-full pl-8 pr-2 py-1.5 rounded-2xl bg-gray-200 text-sm placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Manage Group */}
        <button
          className="p-1 hover:bg-gray-100 rounded-full"
          title="Manage Group"
        >
          <FaUsersCog />
        </button>

        {/* More Options */}
        <button
          className="p-1 hover:bg-gray-100 rounded-full"
          title="More Options"
        >
          <FaEllipsisV />
        </button>
        <button
          onClick={logout}
          className="bg-red-600 text-white text-sm px-3 py-1 mb-3.5 rounded hover:bg-red-700 transition"
        >
          Logout
        </button>

        {/* User Avatar */}
        <div
          className="flex flex-col items-center justify-center p-1 
            rounded hover:rounded-t-full 
            hover:bg-purple-500/50 hover:shadow-lg hover:shadow-purple-500/50 hover:cursor-pointer 
            transition-all duration-300"
        >
          <div className="h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
            {username[0]?.toUpperCase()}
          </div>
          <div className="text-black font-bold text-sm">
            <span className="text-xs">{username}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
