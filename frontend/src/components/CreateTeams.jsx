import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../config";
import { useSelector } from "react-redux";

export default function CreateTeam({ currentUser, showModal, setShowModal }) {
  const { userList } = useSelector((state) => state.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [teamName, setTeamName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const token = sessionStorage.getItem("chatToken");

  // ✅ Add current user automatically when modal opens
  useEffect(() => {
    if (currentUser?.id && showModal) {
      setSelectedUsers([currentUser.id]);
    }
  }, [currentUser, showModal]);

  // Toggle user selection
  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id)
        ? prev.filter((uid) => uid !== id)
        : [...prev, id]
    );
  };

  // Create a new team
  const handleCreateTeam = async () => {
    if (!teamName || selectedUsers.length === 0) {
      alert("Please enter a team name and select members!");
      return;
    }

    if (!token) {
      alert("Authentication token is missing.Please login again.");
      return;
    }

    try {
      await axios.post(
        `${URL}/api/teams`,
        {
          name: teamName,
          created_by: currentUser.id,
          members: selectedUsers,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowModal(false);
    } catch (err) {
      console.error("Failed to create team:", err);
      alert(
        "Failed to create team: " + (err.response?.data?.message || err.message)
      );
    }
  };

  // Filter users for modal search
  const filteredUsers = userList.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Modal */}
      <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50 animate-fadeIn">
        <div className="bg-white w-[440px] rounded-2xl shadow-2xl border border-gray-100 transform transition-all duration-300 scale-100">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800">Create Team</h3>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-500 hover:text-red-500 transition-colors text-lg"
            >
              ✖
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-800 placeholder-gray-400 transition-all"
            />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-800 placeholder-gray-400 transition-all"
            />

            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover:bg-gray-100 transition-all ${
                      u.id === currentUser.id ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                      disabled={u.id === currentUser.id} // ✅ current user always included, can't uncheck
                      className="accent-purple-600 w-4 h-4"
                    />
                    <span className="text-gray-700 font-medium">
                      {u.username}
                      {u.id === currentUser.id && " (You)"}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  No users found
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTeam}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
