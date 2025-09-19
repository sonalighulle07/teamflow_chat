import { useState } from "react";

export default function Header({ selectedUser, onStartCall }) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#e5e7eb] shadow-sm">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-black text-lg">Chat</h2>
        <h6 className="text-gray-600 text-sm flex items-center gap-1">
          Recent <span className="text-xs">▼</span>
        </h6>

        {/* Selected user name */}
        <div className="text-sm text-gray-700 font-medium">
          {selectedUser ? selectedUser.username : "Select a chat"}
        </div>
      </div>


      {/* Right actions */}
      <div className="flex items-center gap-3">

         {/* Search box (inline) */}
      <div className="flex-1 mx-4">
        <input
          type="text"
          placeholder="🔍 Search..."
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

        <button
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Audio Call"
          disabled={!selectedUser}
          onClick={() => onStartCall("audio", selectedUser)}
        >
          <i className="fas fa-phone"></i>
        </button>

        <button
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Video Call"
          disabled={!selectedUser}
          onClick={() => onStartCall("video", selectedUser)}
        >
          <i className="fas fa-video"></i>
        </button>

        {/* Toggleable search form */}
        <div className="relative">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Search in Chat"
          >
            <i className="fas fa-search"></i>
          </button>
          {showSearch && (
            <div className="absolute right-0 mt-2 w-48 bg-white border shadow-lg rounded-md p-2">
              <label
                htmlFor="chatSearchInput"
                className="text-xs font-semibold text-gray-500"
              >
                Search Chat:
              </label>
              <input
                id="chatSearchInput"
                type="text"
                placeholder="Type to search 🔍..."
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        <button className="p-2 hover:bg-gray-100 rounded-full" title="Manage Group">
          <i className="fas fa-users-cog"></i>
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full" title="More Options">
          <i className="fas fa-ellipsis-v"></i>
        </button>

        {/* User Avatar placeholder */}
        <div className="ml-4 h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
          {selectedUser ? selectedUser.username[0] : "U"}
        </div>
      </div>
    </div>
  );
}
