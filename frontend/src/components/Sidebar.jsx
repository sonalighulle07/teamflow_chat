import { useState, useEffect, useMemo } from "react";
import { FaCommentDots, FaVideo, FaUsers, FaCalendar, FaBell, FaSearch } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "../Store/Features/Users/userSlice";
import { fetchUsers } from "../Store/Features/Users/userThunks";
import UserList from "./UserList";

export default function Sidebar({ activeNav, setActiveNav }) {
  const dispatch = useDispatch();
  const { currentUser, userList, selectedUser, loading, error } = useSelector((state) => state.user);

  const [searchQuery, setSearchQuery] = useState("");

  // Fetch users periodically
  useEffect(() => {
    if (!currentUser) return;
    dispatch(fetchUsers(currentUser.id));
    const interval = setInterval(() => {
      dispatch(fetchUsers(currentUser.id));
    }, 10000);
    return () => clearInterval(interval);
  }, [dispatch, currentUser]);

  // Handle selecting a user
  const handleSelectUser = (user) => {
    dispatch(setSelectedUser(user));
  };

  // Keep selected user on top, preserve references for memoization
  const orderedUsers = useMemo(() => {
    if (!userList) return [];
    const others = userList.filter((u) => !selectedUser || u.id !== selectedUser.id);
    return selectedUser ? [selectedUser, ...others] : others;
  }, [userList, selectedUser]);

  // Filter by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return orderedUsers;
    return orderedUsers.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orderedUsers, searchQuery]);

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
          <img src="/logo - no background.png" alt="Logo" className="w-12 h-12 object-contain" />
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
                    isActive ? "text-purple-600" : "text-gray-500 group-hover:text-purple-600"
                  }`}
                >
                  {icon}
                </div>
                <span
                  className={`mt-1 text-xs font-semibold transition-colors ${
                    isActive ? "text-purple-600" : "text-gray-600 group-hover:text-purple-600"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>


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

          {/* User List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {loading && <p className="p-4 text-sm text-gray-500">Loading users…</p>}
            {error && <p className="p-4 text-sm text-red-500">{error}</p>}
            {!loading && !error && (
              <UserList
                users={filteredUsers}
                selectedUser={selectedUser}
                onSelectUser={handleSelectUser}
              />
            )}
            {!loading && !error && filteredUsers.length === 0 && (
              <p className="p-4 text-sm text-gray-500">No users found</p>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
