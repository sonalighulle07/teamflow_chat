import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { MdDashboard, MdPersonOutline, MdOutlineMessage } from "react-icons/md";
import { UserCog, Settings } from "lucide-react";

export default function AdminSidebar({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    { label: "Dashboard", icon: <MdDashboard size={20} />, to: "/org-admin" },
    {
      label: "Users",
      icon: <MdPersonOutline size={24} />,
      to: "/org-admin/users",
    },
    { label: "Admin", icon: <UserCog size={22} />, to: "/org-admin/admins" },
    {
      label: "Organizational Settings",
      icon: <Settings size={22} />,
      to: "/org-admin/organizations",
    },

    {
      label: "Messages",
      icon: <MdOutlineMessage size={22} />,
      to: "/org-admin/messages",
    },
  ];

  

  return (
    <aside className="w-70 flex-shrink-0 bg-white shadow-sm border-r border-gray-200 px-6 py-6 mt-10 flex flex-col space-y-4 min-h-screen">
      {/* Menu */}
      <nav className="flex-1 space-y-2 w-full">
        {menu.map((item) => {
          // Active if current path starts with item.to
          const isActive =
            item.to === "/org-admin"
              ? location.pathname === "/org-admin"
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center mt-6 gap-3 px-4 py-2 rounded-[10px] w-full transition-all ${
                isActive
                  ? "bg-[#e9f0fb] text-[#1924FF]"
                  : "text-[#4A4A4A] hover:bg-[#F2F2F2]"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
