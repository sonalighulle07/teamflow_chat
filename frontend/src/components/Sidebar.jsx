import { useState, useEffect } from "react";
import UserList from "./UserList";

export default function Sidebar({ selectedUser, onSelectUser }) {
  const [users, setUsers] = useState([]);

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000); // Optional: auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    sessionStorage.clear();
    window.location.href = "/login.html";
  };

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="flex w-20 flex-col items-center justify-between bg-gray-200 py-6 text-white shadow-lg">
        <div className="flex flex-col items-center gap-8">
          <div className="sidebar-icon">
            <img
              src="/Tapsoft.jpeg"
              alt="Tapsoft Logo"
              className="h-12 w-12 rounded-full object-contain"
            />
          </div>

          <div className="flex flex-col gap-8 text-center">
  <div className="sidebar-icon group cursor-pointer" title="Chat">
    <i className="fa-solid fa-comment-dots text-[18px] text-gray-500 group-hover:text-purple-600"></i>
    <span className="block text-[12px] text-gray-500 group-hover:text-purple-600">Chat</span>
  </div>

  <div className="sidebar-icon group cursor-pointer" title="Meet">
    <i className="fa-solid fa-video text-[18px] text-gray-500 group-hover:text-purple-600"></i>
    <span className="block text-[12px] text-gray-500 group-hover:text-purple-600">Meet</span>
  </div>

  <div className="sidebar-icon group cursor-pointer" title="Communities">
    <i className="fa-solid fa-users text-[18px] text-gray-500 group-hover:text-purple-600"></i>
    <span className="block text-[12px] text-gray-500 group-hover:text-purple-600">Communities</span>
  </div>

  <div className="sidebar-icon group cursor-pointer" title="Calendar">
    <i className="fa-regular fa-calendar text-[18px] text-gray-500 group-hover:text-purple-600"></i>
    <span className="block text-[12px] text-gray-500 group-hover:text-purple-600">Calendar</span>
  </div>

  <div className="sidebar-icon group cursor-pointer" title="Activity">
    <i className="fa-regular fa-bell text-[18px] text-gray-500 group-hover:text-purple-600"></i>
    <span className="block text-[12px] text-gray-500 group-hover:text-purple-600">Activity</span>
  </div>
</div>

        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="sidebar-icon" title="Premium">
            <i className="fa-solid fa-gem text-2xl text-yellow-400"></i>
            <span className="block text-sm">Premium</span>
          </div>
          <button
            onClick={logout}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Right User List */}
      <div className="flex-1 max-w-xs bg-gray-200 py-6 border-l border-gray-200">
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={onSelectUser}
        />
      </div>
    </div>
  );
}
