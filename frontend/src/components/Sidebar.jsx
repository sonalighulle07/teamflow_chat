import { useState, useEffect } from "react";
import UserList from "./UserList";
import {
  FaCommentDots,
  FaVideo,
  FaUsers,
  FaCalendar,
  FaBell,
  FaGem,
  FaSearch,
} from "react-icons/fa";

export default function Sidebar({ selectedUser, onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [activeNav, setActiveNav] = useState("Chat");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { icon: <FaCommentDots />, label: "Chat" },
    { icon: <FaVideo />, label: "Meet" },
    { icon: <FaUsers />, label: "Communities" },
    { icon: <FaCalendar />, label: "Calendar" },
    { icon: <FaBell />, label: "Activity" },
  ];

  // Filter users based on search query
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar */}
      <div className="flex flex-col justify-between w-20 bg-slate-200 shadow-md px-4 py-6 h-full">
        <div className="flex flex-col items-center gap-6">
          <img
            src="/logo - no background.png"
            alt="Logo"
            className="w-12 h-12 object-contain"
          />
          {navItems.map(({ icon, label }) => {
            const isActive = activeNav === label;
            return (
              <div
                key={label}
                className="group flex flex-col items-center cursor-pointer relative"
                onClick={() => setActiveNav(label)}
              >
                <div
                  className={`text-xl transition-colors ${
                    isActive
                      ? "text-purple-600"
                      : "text-gray-500 group-hover:text-purple-600"
                  }`}
                >
                  {icon}
                </div>
                <span
                  className={`mt-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? "text-purple-600"
                      : "text-gray-600 group-hover:text-purple-600"
                  }`}
                >
                  {label}
                </span>
                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-white text-gray-800 text-xs px-2 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* User List Section */}
      <div className="flex-1 bg-gray-100 border-l border-gray-500 relative overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="p-2">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-3 py-1.5 rounded bg-white border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          <UserList
            users={filteredUsers}
            selectedUser={selectedUser}
            onSelectUser={onSelectUser}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  );
}
