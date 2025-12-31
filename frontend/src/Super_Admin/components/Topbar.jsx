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

return (
  <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
    {/* Left: Placeholder */}
    <div className="w-72 min-h-[36px]">
      {/* You can leave it empty or put a logo/title here if needed */}
    </div>

    {/* Right: Icons / Image */}
    <div className="flex items-center gap-6 text-gray-500 text-xl font-bold mr-5">
  {/* Notification image */}
  <img
    src="/tdesign_notification.png"
    alt="Notification"
    className="w-5.5 h-5.5 cursor-pointer"
  />
  
  {/* Logout image */}
  <img
    src="/humbleicons_logout.png"
    alt="Logout"
    className="w-6 h-6 cursor-pointer"
    onClick={handleLogout}
  />
</div>

  </header>
);

}

