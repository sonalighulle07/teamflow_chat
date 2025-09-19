import { useState } from "react";
import {
  FaSearch,
  FaPhone,
  FaVideo,
  FaUsersCog,
  FaEllipsisV,
} from "react-icons/fa";

export default function Header({ selectedUser, onStartCall }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
        {/* Inline Search Box */}
        <div className="relative w-64">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-3 py-1.5 rounded-[10px] bg-white border-2 border-gray-200  text-sm placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

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
            <div className="absolute right-0 mt-2 w-64 bg-white border shadow-lg rounded-md p-2">
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
                  className="w-full pl-8 pr-2 py-1.5 rounded-2xl bg-gray-100 text-sm placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Other actions */}
        <button
          className="p-2 hover:bg-gray-100 rounded-full text-gray-700"
          title="Manage Group"
        >
          <FaUsersCog />
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded-full text-gray-700"
          title="More Options"
        >
          <FaEllipsisV />
        </button>

        {/* User Avatar */}
        <div className="ml-4 h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
          {selectedUser ? selectedUser.username[0].toUpperCase() : "U"}
        </div>
      </div>
    </div>
  );
}
