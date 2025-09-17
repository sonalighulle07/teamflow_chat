// -------------------- Sidebar.jsx --------------------
import UserList from "./UserList";

const dummyUsers = [
  { id: 1, username: "Alice Johnson" },
  { id: 2, username: "Bob Smith" },
  { id: 3, username: "Charlie Brown" },
];

export default function Sidebar({
  users = dummyUsers,
  selectedUser,
  onSelectUser,
}) {
  const logout = () => {
    console.log("Logout clicked");
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
            <div className="sidebar-icon" title="Chat">
              <i className="fa-solid fa-comment-dots text-2xl"></i>
              <span className="block text-xs">Chat</span>
            </div>
            <div className="sidebar-icon" title="Meet">
              <i className="fa-solid fa-video text-2xl"></i>
              <span className="block text-xs">Meet</span>
            </div>
            <div className="sidebar-icon" title="Communities">
              <i className="fa-solid fa-users text-2xl"></i>
              <span className="block text-xs">Communities</span>
            </div>
            <div className="sidebar-icon" title="Calendar">
              <i className="fa-regular fa-calendar text-2xl"></i>
              <span className="block text-xs">Calendar</span>
            </div>
            <div className="sidebar-icon" title="Activity">
              <i className="fa-regular fa-bell text-2xl"></i>
              <span className="block text-xs">Activity</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="sidebar-icon" title="Premium">
            <i className="fa-solid fa-gem text-2xl text-yellow-400"></i>
            <span className="block text-xs">Premium</span>
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
      <div className="flex-1 max-w-xs bg-gray-200 border-l border-gray-200">
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={onSelectUser}
        />
      </div>
    </div>
  );
}
