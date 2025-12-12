import AdminSidebar from "./AdminSidebar";
import { Outlet } from "react-router-dom";

export default function OrgAdminLayout() {
  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />

      <div className="flex-1 p-6 bg-[#F5F7FA]">
        <Outlet />
      </div>
    </div>
  );
}
