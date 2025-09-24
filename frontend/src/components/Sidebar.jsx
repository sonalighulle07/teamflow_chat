import { useState, useEffect } from "react";
import UserList from "./UserList";
import {
  FaCommentDots,
  FaVideo,
  FaUsers,
  FaCalendar,
  FaBell,
  FaGem,
} from "react-icons/fa";

export default function Sidebar({ selectedUser, onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [activeNav, setActiveNav] = useState("Chat");

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

  const logout = () => {
    sessionStorage.clear();
    window.location.href = "/login.html";
  };

  const navItems = [
    { icon: <FaCommentDots />, label: "Chat" },
    { icon: <FaVideo />, label: "Meet" },
    { icon: <FaUsers />, label: "Communities" },
    { icon: <FaCalendar />, label: "Calendar" },
    { icon: <FaBell />, label: "Activity" },
  ];

  return (
    <div className="flex relative">
      {/* Left Sidebar (fixed under header) */}
      {/* top-16 assumes header height = 4rem; adjust if needed */}
      <div className="fixed left-0 top-16 w-20 h-[calc(100vh-4rem)] flex flex-col justify-between bg-slate-200 shadow-md px-4 py-6 overflow-hidden">
        {/* Top Icons */}
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

        {/* Bottom Icons */}
        <div className="flex flex-col items-center gap-4">
          <div className="group relative flex flex-col items-center cursor-pointer">
            <FaGem className="text-yellow-400 text-xl" />
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-white text-gray-800 text-xs px-2 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
              Premium
            </span>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content (user list area) - pushed right of sidebar and below header */}
      <div className="ml-20 mt-16 flex-1 bg-gray-100 border-l border-gray-300 relative h-[calc(100vh-4rem)]">
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={onSelectUser}
        />
      </div>
    </div>
  );
}
