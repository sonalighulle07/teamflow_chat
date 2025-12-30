import { MdDashboard } from "react-icons/md";
import { HiUsers } from "react-icons/hi";
import { FaTags } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 flex-shrink-0 bg-white px-6 py-6 shadow-sm border-r border-gray-200">
      {/* Logo */}
      <div className="flex justify-center mb-10 w-full">
        <img
          src="/tapsoft_logo.png"
          alt="Logo"
          className="h-11 w-auto object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="space-y-2 w-full">
        <Link
          to="/super-admin/dashboard"
          className={`flex items-center gap-3 px-4 py-2 rounded-xl w-full ${
            location.pathname === "/super-admin/dashboard"
              ? "bg-[#D9D9D966] text-[#1924FF]"
              : "text-gray-700 hover:bg-[#F2F2F2]"
          }`}
        >
          <MdDashboard size={20} />
          Dashboard
        </Link>

        <Link
          to="/super-admin/organizations"
          className={`flex items-center gap-3 px-4 py-2 rounded-xl w-full ${
            location.pathname === "/super-admin/organizations"
              ? "bg-[#D9D9D966] text-[#1924FF] "
              : "text-gray-700 hover:bg-[#F2F2F2]"
          }`}
        >
          <HiUsers size={20} />
          Organization
        </Link>

        <Link
          to="/super-admin/plans"
          className={`flex items-center gap-3 px-4 py-2 rounded-xl w-full ${
            location.pathname === "/super-admin/plans"
              ? "bg-[#D9D9D966] text-[#1924FF]"
              : "text-gray-700 hover:bg-[#F2F2F2]"
          }`}
        >
          <FaTags size={18} />
          Plans
        </Link>
      </nav>
    </aside>
  );
}
