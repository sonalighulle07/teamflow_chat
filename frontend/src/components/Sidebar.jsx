import { useState, useEffect } from "react";
import UserList from "./UserList";

export default function Sidebar({ selectedUser, onSelectUser }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    sessionStorage.clear();
    window.location.href = "/login.html";
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Static Icon Column */}
      <div
        style={{
          width: "70px",
          backgroundColor: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "24px 12px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          flexShrink: 0
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
          <img
            src="/Tapsoft.jpeg"
            alt="Tapsoft Logo"
            style={{ height: "48px", width: "48px", borderRadius: "50%", objectFit: "contain" }}
          />

          {[
            { icon: "fa-comment-dots", label: "Chat" },
            { icon: "fa-video", label: "Meet" },
            { icon: "fa-users", label: "Communities" },
            { icon: "fa-calendar", label: "Calendar" },
            { icon: "fa-bell", label: "Activity" }
          ].map(({ icon, label }) => (
            <div key={label} title={label} style={{ textAlign: "center", cursor: "pointer" }}>
              <i className={`fa-solid ${icon}`} style={{ fontSize: "18px", color: "#6b7280" }}></i>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div title="Premium" style={{ textAlign: "center" }}>
            <i className="fa-solid fa-gem" style={{ fontSize: "20px", color: "#facc15" }}></i>
            <div style={{ fontSize: "12px", color: "#000" }}>Premium</div>
          </div>
          <button
            onClick={logout}
            style={{
              backgroundColor: "#dc2626",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Scrollable User List */}
      <div
        style={{
          flex: 1,
          maxWidth: "500px",
          backgroundColor: "#e5e7eb",
          borderLeft: "1px solid #d1d5db",
          overflowY: "scroll",
          position: "relative"
        }}
      >
        {/* Hidden scrollbar styling */}
        <style>
          {`
            ::-webkit-scrollbar {
              width: 0px;
              background: transparent;
            }
            div::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>

        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={onSelectUser}
        />
      </div>
    </div>
  );
}
