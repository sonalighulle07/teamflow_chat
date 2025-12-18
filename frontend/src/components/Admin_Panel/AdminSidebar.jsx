import { NavLink, useNavigate } from "react-router-dom";
import { Grid2x2, User, Users, Settings, MessageSquare, LogOut } from "lucide-react";


export default function AdminSidebar({ setIsAuthenticated }) {
  const navigate = useNavigate();

  const menu = [
    { label: "Dashboard", icon: <Grid2x2 size={18} />, to: "/org-admin" },

    { label: "Users", icon: <User size={18} />, to: "/org-admin/users" },
    { label: "Admins", icon: <User size={18} />, to: "/org-admin/admins" },
    { label: "Teams", icon: <Users size={18} />, to: "/org-admin/teams" },
    { label: "Organization Settings", icon: <Settings size={18} />, to: "/org-admin/organizations" },
    { label: "Messages", icon: <MessageSquare size={18} />, to: "/org-admin/messages" },
  ];

  // ---------------- Logout Handler ----------------
  const handleLogout = () => {
    // Clear session and local storage
    sessionStorage.clear();
    localStorage.removeItem("chatToken");
    localStorage.removeItem("chatUser");

    // Update authentication state in App
    if (setIsAuthenticated) setIsAuthenticated(false);

    // Redirect to login page
    navigate("/login");
  };

  return (
    <div className="flex flex-col w-60 min-h-screen bg-white shadow-md p-6 rounded-r-3xl space-y-8">
      {/* Logo */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="w-4 h-4 rounded-md bg-gray-300"></div>
        <div className="w-6 h-[3px] rounded-sm bg-blue-500"></div>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-2">
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-xl text-sm transition-all ${
                isActive ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center space-x-3 text-gray-600 hover:text-red-600 p-3 rounded-xl mt-auto"
      >
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </div>
  );
}
