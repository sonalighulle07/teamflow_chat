import { useState } from "react";
import { FiLogOut } from "react-icons/fi";
import Notifications from "./Notifications"; // import your notifications component

export default function Topbar() {
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    if (window.store) {
      window.store.dispatch({ type: "user/setCurrentUser", payload: null });
      window.store.dispatch({ type: "auth/setAuthenticated", payload: false });
    }
    window.location.href = "/login";
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {/* Left: Placeholder */}
      <div className="w-72 min-h-[36px]"></div>

      {/* Right: Icons / Image */}
      <div className="flex items-center gap-6 text-gray-500 text-xl font-bold mr-5 relative">
        {/* Notification */}
        <div className="relative">
          <img
            src="/Icons/tdesign_notification.png"
            alt="Notification"
            className="w-5.5 h-5.5 cursor-pointer"
            onClick={() => setShowNotifications((prev) => !prev)}
          />

          {/* Show Notifications dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 z-50">
              <Notifications />
            </div>
          )}
        </div>

        {/* Logout */}
        <img
          src="/Icons/humbleicons_logout.png"
          alt="Logout"
          className="w-6 h-6 cursor-pointer"
          onClick={handleLogout}
        />
      </div>
    </header>
  );
}
