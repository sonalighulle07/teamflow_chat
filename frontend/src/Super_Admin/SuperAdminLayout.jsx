import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function SuperAdminLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#F0F4FA]">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Topbar />

        {/* Main content: no scroll here */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
