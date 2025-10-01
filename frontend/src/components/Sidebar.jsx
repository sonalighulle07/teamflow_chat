import { useState, useEffect } from "react";
import UserList from "./UserList";
import {
  FaCommentDots,
  FaVideo,
  FaUsers,
  FaCalendar,
  FaBell,
  FaSearch,
} from "react-icons/fa";

export default function Sidebar({
  selectedUser,
  onSelectUser,
  activeNav,
  setActiveNav,
}) {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/users");
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/teams");
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setTeams([]);
      }
    };
    fetchTeams();
  }, []);

  const handleSelectUser = (item) => {
    if (onSelectUser) onSelectUser(item);
  };

  const navItems = [
    { icon: <FaCommentDots />, label: "Chat" },
    { icon: <FaVideo />, label: "Meet" },
    { icon: <FaUsers />, label: "Communities" },
    { icon: <FaCalendar />, label: "Calendar" },
    { icon: <FaBell />, label: "Activity" },
  ];

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar navigation */}
      <div className="flex flex-col justify-between w-20 min-w-[5rem] bg-slate-200 shadow-md px-4 py-6 flex-shrink-0">
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Users & Teams */}
      {activeNav === "Chat" && (
        <div className="flex-1 bg-gray-100 border-l border-gray-300 flex flex-col overflow-hidden">
          {/* Search Input */}
          <div className="p-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users or teams..."
                className="w-full pl-10 pr-3 py-1.5 rounded bg-white border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Scrollable User List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <UserList
              users={Array.isArray(users) ? users : []}
              teams={Array.isArray(teams) ? teams : []}
              onSelectUser={handleSelectUser}
              searchQuery={searchQuery || ""}
            />
          </div>
        </div>
      )}
    </div>
  );
}
