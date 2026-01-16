// src/components/admin/OrgAdminLayout.jsx
import AdminSidebar from "./AdminSidebar";
import TopBar from "./TopBar";
import { Outlet } from "react-router-dom";

export default function OrgAdminLayout({ setIsAuthenticated, userName }) {
  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar setIsAuthenticated={setIsAuthenticated} />

      <div className="flex-1 flex flex-col">
        {/* TopBar */}
        <TopBar setIsAuthenticated={setIsAuthenticated} userName={userName} />

        {/* Main Content */}
        <div className="flex-1 p-6 bg-[#F0F4FA]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
