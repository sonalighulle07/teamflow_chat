import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function SuperAdminLayout() {
  return (
    <div className="flex h-screen bg-[#F0F4FA]">
      {/* Sidebar: fixed width */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />

        {/* Main scrollable area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
