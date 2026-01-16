import { useEffect, useState } from "react";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [newNotification, setNewNotification] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/notifications/expiring-plans");
        const data = await res.json();
        setNotifications(data);
        if (data.length > 0) setNewNotification(true); // show red dot
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <div className="relative">
      {/* Notification Icon */}
      <button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
        <img
          src="/Icons/material-symbols_notifications.png"
          alt="notifications"
          className="w-6 h-6"
        />
        {newNotification && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
        )}
      </button>

      {/* Notification dropdown */}
      <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
        <h3 className="p-3 text-sm font-medium border-b border-gray-200">
          Notification ({notifications.length})
        </h3>
        <div className="max-h-60 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="p-3 text-sm text-gray-500">No new notifications</p>
          )}
          {notifications.map((n, index) => (
            <div
              key={index}
              className="p-3 border-b border-gray-200 flex gap-3 items-start"
            >
              <img
                src="/Icons/material-symbols_mail-outline-rounded.png"
                alt="icon"
                className="w-5 h-5 mt-1"
              />
              <div>
                <p className="text-sm text-gray-700">{n.message}</p>
                <p className="text-xs text-gray-400">
                  {new Date(n.time).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
        <a
          href="/all-notifications"
          className="block p-3 text-center text-blue-500 text-sm font-medium border-t border-gray-200 hover:bg-gray-50"
        >
          See all notifications
        </a>
      </div>
    </div>
  );
}
