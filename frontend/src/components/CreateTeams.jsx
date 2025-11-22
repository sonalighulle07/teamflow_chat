import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../config";
import { useSelector } from "react-redux";

export default function CreateTeam({
  currentUser,
  showModal,
  setShowModal,
  socket,
}) {
  const { userList } = useSelector((state) => state.user || {});
  const [searchQuery, setSearchQuery] = useState("");
  const [teamName, setTeamName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const token = sessionStorage.getItem("chatToken");

  // Pre-select current user
  useEffect(() => {
    if (currentUser?.id && showModal) setSelectedUsers([currentUser.id]);
  }, [currentUser, showModal]);


  // Toggle user selection
  const toggleUser = (id) => {
    if (id === currentUser.id) return;
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  // Create team & send invites
  const handleCreateTeam = async () => {
    if (!teamName || selectedUsers.length === 0) {
      return alert("Enter team name and select members!");
    }

    try {
      // 1️ Create team
      const { data: team } = await axios.post(
        `${URL}/api/teams`,
        { name: teamName, created_by: currentUser.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const teamId = team.id;

      // 2️ Invite only other users
      const inviteUsers = selectedUsers.filter((uid) => uid !== currentUser.id);

      if (inviteUsers.length > 0) {
        // 3️ Send invites via API
        await axios.post(
          `${URL}/api/teams/send-invites`,
          {
            teamId,
            teamName,
            members: inviteUsers,
            inviter_id: currentUser.id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // 4️ Emit single socket event for all invited users
        socket.emit("teamInviteReceived", {
          teamId,
          teamName,
          invitedUsers: inviteUsers,
          inviter_id: currentUser.id,
          invited_by_name: currentUser.username,
        });
      }

      // Reset form
      setShowModal(false);
      setTeamName("");
      setSelectedUsers([currentUser.id]);
    } catch (err) {
      console.error("Failed to create team:", err);
      alert(
        "Failed to create team: " + (err.response?.data?.error || err.message)
      );
    }
  };

  const filteredUsers =
    userList?.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white w-[450px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden relative">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Create Team
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-red-500 text-lg"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              {/* Selected Users */}
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((uid) => {
                  const user = userList.find((u) => u.id === uid);
                  if (!user) return null;
                  return (
                    <div
                      key={uid}
                      className="flex items-center bg-purple-50 text-purple-800 rounded-full px-2 py-1 text-xs font-medium shadow-sm"
                    >
                      {user.username} {uid === currentUser.id && "(You)"}
                      {uid !== currentUser.id && (
                        <button
                          onClick={() => toggleUser(uid)}
                          className="ml-1 text-red-500"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Search Users */}
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              {/* User List */}
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                {filteredUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-purple-50 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                      disabled={u.id === currentUser.id}
                      className="accent-purple-600 w-4 h-4"
                    />
                    {u.username} {u.id === currentUser.id && "(You)"}
                  </label>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100"
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
      )}
    </>
  );
}
