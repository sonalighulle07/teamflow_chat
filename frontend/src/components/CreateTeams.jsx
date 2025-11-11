import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../config";
import { useSelector } from "react-redux";

export default function CreateTeam({ currentUser, showModal, setShowModal }) {
  const { userList } = useSelector((state) => state.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [teamName, setTeamName] = useState(""); // ✅ added this line
  const [selectedUsers, setSelectedUsers] = useState([]);
  const token = sessionStorage.getItem("chatToken");

  useEffect(() => {
    if (currentUser?.id && showModal) setSelectedUsers([currentUser.id]);
  }, [currentUser, showModal]);

  const toggleUser = (id) =>
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );

  const handleCreateTeam = async () => {
    if (!teamName || selectedUsers.length === 0) {
      alert("Enter team name and select members!");
      return;
    }
    if (!token) {
      alert("Authentication missing. Please login again.");
      return;
    }
    try {
      await axios.post(
        `${URL}/api/teams`,
        { name: teamName, created_by: currentUser.id, members: selectedUsers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert(
        "Failed to create team: " + (err.response?.data?.message || err.message)
      );
    }
  };

  const filteredUsers = userList.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-yellow-200 rounded px-1">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-none ">
      <div className="bg-white w-[450px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Create Team</h3>
          <button
            onClick={() => setShowModal(false)}
            className="text-gray-400 hover:text-red-500 text-lg transition-colors"
          >
            ✖
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          {/* Team Name */}
          <input
            type="text"
            placeholder="Team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 placeholder-gray-400 text-sm"
          />

          {/* Selected Users Tags */}
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((uid) => {
              const user = userList.find((u) => u.id === uid);
              if (!user) return null;
              return (
                <div
                  key={uid}
                  className="flex items-center bg-purple-50 text-purple-800 rounded-full px-2 py-1 text-xs font-medium shadow-sm"
                >
                  <span className="w-5 h-5 bg-purple-400 rounded-full flex items-center justify-center text-white text-[10px] mr-1 shadow">
                    {user.username[0].toUpperCase()}
                  </span>
                  {user.username}
                  {uid !== currentUser.id && (
                    <button
                      onClick={() => toggleUser(uid)}
                      className="ml-1 text-purple-600 hover:text-red-500 font-bold transition-colors"
                    >
                      ×
                    </button>
                  )}
                  {uid === currentUser.id && " (You)"}
                </div>
              );
            })}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 placeholder-gray-400 text-sm"
          />

          {/* User List */}
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50 hover:bg-gray-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <label
                  key={u.id}
                  className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-purple-50 text-sm transition-all ${
                    u.id === currentUser.id
                      ? "opacity-70 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    disabled={u.id === currentUser.id}
                    className="accent-purple-600 w-4 h-4"
                  />
                  <span className="text-gray-700">
                    {highlightText(u.username, searchQuery)}
                    {u.id === currentUser.id && " (You)"}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-1">
                No users found
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setShowModal(false)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateTeam}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:scale-105 transition-transform shadow-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
