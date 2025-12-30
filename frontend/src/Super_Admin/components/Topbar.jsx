import { FiLogOut, FiSearch } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();

    if (window.store) {
      window.store.dispatch({ type: "user/setCurrentUser", payload: null });
      window.store.dispatch({ type: "auth/setAuthenticated", payload: false });
    }

    window.location.href = "/login";
  };

  // Only show search on dashboard route
  const showSearch = location.pathname === "/super-admin/dashboard";

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {/* Left: Search or placeholder */}
      <div className="w-72 relative min-h-[36px]">
        {showSearch ? (
          <>
            <FiSearch className="absolute left-4 top-4 -translate-y-1/2 text-gray-400 text-base" />
            <input
              placeholder="Search here..."
              className="w-full pl-10 pr-4 py-1 rounded-md outline-none 
                   text-gray-700 placeholder-gray-400 text-sm
                   border border-gray-300 focus:border-indigo-500"
            />
          </>
        ) : (
          <div className="w-full h-full invisible">
            {/* invisible keeps the space */}
            placeholder
          </div>
        )}
      </div>

      {/* Right: Icons / Image */}
      <div className="flex items-center gap-7 text-gray-500 text-xl font-bold mr-3">
        {/* Replace notification icon with image */}
        <img
          src="/tdesign_notification.png"   // <-- your notification image path
          alt="Notification"
          className="w-5.5 h-5.5 cursor-pointer"
        />
        <FiLogOut className="cursor-pointer text-gray-500" onClick={handleLogout} />
      </div>
    </header>
  );
}
