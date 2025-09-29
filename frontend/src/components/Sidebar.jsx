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
  const [searchQuery, setSearchQuery] = useState("");
  const [recentChats, setRecentChats] = useState([]);

  // Load recentChats from localStorage on mount
  useEffect(() => {
    const storedChats = localStorage.getItem("recentChats");
    if (storedChats) setRecentChats(JSON.parse(storedChats));
  }, []);

  // Save recentChats to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("recentChats", JSON.stringify(recentChats));
  }, [recentChats]);

  // Fetch users from API and merge with recentChats
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/users");
        const data = await res.json();

        setUsers((prevUsers) => {
          // Merge: keep recentChats order first, append remaining users
          const merged = [
            ...recentChats,
            ...data.filter((u) => !recentChats.find((r) => r.id === u.id)),
          ];
          return merged;
        });
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, [recentChats]);

  const handleSelectUser = (user) => {
    // Update recentChats
    setRecentChats((prev) => {
      const filtered = prev.filter((u) => u.id !== user.id);
      return [user, ...filtered];
    });
    onSelectUser(user);
  };

  // Merge users for display: selected user first, then recentChats, then others
  const mergedUsers = users
    .map((user) => ({
      ...user,
      isSelected: selectedUser?.id === user.id,
    }))
    .sort((a, b) => {
      if (selectedUser?.id === a.id) return -1;
      if (selectedUser?.id === b.id) return 1;

      const indexA = recentChats.findIndex((u) => u.id === a.id);
      const indexB = recentChats.findIndex((u) => u.id === b.id);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return 0;
    });

  // Filter users by search
  const filteredUsers = mergedUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems = [
    { icon: <FaCommentDots />, label: "Chat" },
    { icon: <FaVideo />, label: "Meet" },
    { icon: <FaUsers />, label: "Communities" },
    { icon: <FaCalendar />, label: "Calendar" },
    { icon: <FaBell />, label: "Activity" },
  ];

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar Navigation */}
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
                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-white text-gray-800 text-xs px-2 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Chat Users */}
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
                placeholder="Search users..."
                className="w-full pl-10 pr-3 py-1.5 rounded bg-white border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Scrollable User List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <UserList
              users={filteredUsers}
              selectedUser={selectedUser}
              onSelectUser={handleSelectUser}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      )}
    </div>
  );
}
