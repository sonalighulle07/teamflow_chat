import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../config";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { FaUsers, FaSearch, FaTimes, FaTrash, FaEdit } from "react-icons/fa";

export default function CreateTeam({
  currentUser,
  showModal,
  setShowModal,
  socket,
  existingTeam = null,
}) {
  const { userList } = useSelector((state) => state.user || {});
  const [searchQuery, setSearchQuery] = useState("");
  const [teamName, setTeamName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [initialMembers, setInitialMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teamNameEditMode, setTeamNameEditMode] = useState(false);
  const token = sessionStorage.getItem("chatToken");

  // Fixed isAdmin to handle both user_id and id
const isAdmin =
  existingTeam &&
  existingTeam.members?.some(
    (m) =>
      Number(m.user_id) === Number(currentUser.id) &&
      (m.role === "owner" || m.role === "admin")
  );



  // Load initial values
  useEffect(() => {
    if (!showModal) return;

    if (existingTeam) {
      setTeamName(existingTeam.name || "");
      const ids =
        existingTeam.members?.map((m) => Number(m.user_id || m.id)) || [];
      setInitialMembers(ids);
      setSelectedUsers(ids);
    } else {
      setTeamName("");
      setInitialMembers([currentUser.id]);
      setSelectedUsers([currentUser.id]);
    }
  }, [existingTeam, currentUser, showModal]);

  const toggleUser = (id) => {
    if (id === currentUser.id) return;
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Create team
  const handleCreateTeam = async () => {
    if (!teamName || selectedUsers.length === 0) {
      return toast.error("Enter team name and select members!");
    }

    setLoading(true);
    try {
      const { data: team } = await axios.post(
        `${URL}/api/teams`,
        { name: teamName, created_by: currentUser.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const inviteUsers = selectedUsers.filter((id) => id !== currentUser.id);
      if (inviteUsers.length > 0) {
        await axios.post(
          `${URL}/api/teams/send-invites`,
          {
            teamId: team.id,
            teamName,
            members: inviteUsers,
            inviter_id: currentUser.id,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      toast.success("Team created");
      setShowModal(false);
    } catch {
      toast.error("Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  // Rename team
  const handleRenameTeam = async () => {
    if (!teamName.trim()) return;

    try {
      await axios.put(
        `${URL}/api/teams/${existingTeam.id}/rename`,
        { name: teamName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Team name updated");
      setTeamNameEditMode(false);
    } catch {
      toast.error("Failed to update team name");
    }
  };

  // Delete team
  const handleDeleteTeam = async () => {
    if (!existingTeam) return;

    if (!window.confirm("Are you sure you want to delete this team?")) return;

    try {
      await axios.delete(`${URL}/api/teams/${existingTeam.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Team deleted");
      setShowModal(false);
    } catch {
      toast.error("Failed to delete team");
    }
  };

  // Update team members
  const handleUpdateTeam = async () => {
    const added = selectedUsers.filter((id) => !initialMembers.includes(id));
    const removed = initialMembers.filter((id) => !selectedUsers.includes(id));

    if (added.length === 0 && removed.length === 0) {
      toast("No changes made");
      return;
    }

    setLoading(true);
    try {
      if (added.length > 0) {
        await axios.post(
          `${URL}/api/teams/${existingTeam.id}/members`,
          { members: added },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      for (let uid of removed) {
        await axios.delete(
          `${URL}/api/teams/${existingTeam.id}/members/${uid}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      toast.success("Team updated");
      setShowModal(false);
    } catch {
      toast.error("Failed to update team");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers =
    userList?.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-[520px] max-h-[90vh] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50/60">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaUsers className="text-purple-600" />
                {existingTeam ? "Update Team" : "Create a Team"}
              </h3>

              <div className="flex items-center gap-4">
                {existingTeam && isAdmin && (
                  <>
                    <button
                      onClick={() => setTeamNameEditMode(true)}
                      className="text-blue-500 hover:text-blue-700 text-lg transition"
                      title="Edit Team Name"
                    >
                      <FaEdit />
                    </button>

                    <button
                      onClick={handleDeleteTeam}
                      className="text-red-500 hover:text-red-700 text-lg transition"
                      title="Delete Team"
                    >
                      <FaTrash />
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl transition"
                  title="Close"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto">
              {/* Team Name */}
              <label className="block text-gray-700 mb-2 font-medium">
                Team Name
              </label>
              <input
                type="text"
                placeholder="Enter team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={existingTeam && !teamNameEditMode}
                className="w-full mb-3 p-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-300 focus:outline-none"
              />

              {teamNameEditMode && (
                <div className="mb-4 p-3 bg-gray-100 rounded-lg flex justify-end">
                  <button
                    onClick={handleRenameTeam}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    Save Name
                  </button>
                </div>
              )}

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedUsers.map((id) => {
                    const user = userList?.find((u) => u.id === id);
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm shadow-sm"
                      >
                        <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                          {user?.username?.charAt(0)}
                        </div>

                        {user?.username}

                        {id !== currentUser.id && (
                          <>
                            <button
                              onClick={() => toggleUser(id)}
                              className="ml-1 text-purple-800 hover:text-purple-900"
                            >
                              ×
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await axios.delete(
                                    `${URL}/api/teams/${existingTeam.id}/members/${id}`,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    }
                                  );
                                  toast.success("Member removed");
                                  setSelectedUsers((prev) =>
                                    prev.filter((x) => x !== id)
                                  );
                                } catch {
                                  toast.error("Failed to remove member");
                                }
                              }}
                              className="ml-2 text-red-500 hover:text-red-700"
                              title="Remove Member"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search Users */}
              <label className="block text-gray-700 mb-2 font-medium">
                Search Users
              </label>
              <div className="relative mb-4">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-300 focus:outline-none"
                />
              </div>

              {/* User List */}
              <div className="max-h-60 overflow-y-auto bg-gray-50 border rounded-xl p-3 shadow-inner space-y-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    No users found.
                  </p>
                ) : (
                  filteredUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-800 text-sm">
                          {u.username}{" "}
                          {u.id === currentUser.id && (
                            <span className="text-purple-600 font-medium">
                              (You)
                            </span>
                          )}
                        </span>
                      </div>

                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        disabled={u.id === currentUser.id}
                        className="accent-purple-600 w-4 h-4"
                      />
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-200 transition"
              >
                Cancel
              </button>

              <button
                onClick={existingTeam ? handleUpdateTeam : handleCreateTeam}
                disabled={loading}
                className="px-5 py-2 rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md font-medium transition"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
