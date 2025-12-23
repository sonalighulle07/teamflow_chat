import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../config";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { FaSearch, FaEdit, FaTrash } from "react-icons/fa";

export default function CreateTeam({
  currentUser,
  showModal,
  setShowModal,
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

  const isAdmin =
    existingTeam &&
    existingTeam.members?.some(
      (m) =>
        Number(m.user_id) === Number(currentUser.id) &&
        (m.role === "owner" || m.role === "admin")
    );

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

  const handleCreateTeam = async () => {
    if (!teamName || selectedUsers.length === 0)
      return toast.error("Enter team name and select members!");
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

  const handleUpdateTeam = async () => {
    const added = selectedUsers.filter((id) => !initialMembers.includes(id));
    const removed = initialMembers.filter((id) => !selectedUsers.includes(id));
    if (added.length === 0 && removed.length === 0)
      return toast("No changes made");
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
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-24 bg-black/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-[450px] rounded-xl shadow-xl p-6 border border-gray-200 overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {existingTeam ? "Update Team" : "Create a Team"}
              </h2>
              {existingTeam && isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTeamNameEditMode(true)}
                    className="text-indigo-600 hover:text-indigo-800 transition text-sm"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={handleDeleteTeam}
                    className="text-red-500 hover:text-red-700 transition text-sm"
                  >
                    <FaTrash />
                  </button>
                </div>
              )}
            </div>

            {/* Team Name */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Team Name
              </label>
              <input
                type="text"
                placeholder="Enter team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={existingTeam && !teamNameEditMode}
                className="w-full px-3 py-1.5 border rounded-md border-gray-300 text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
              />
              {teamNameEditMode && (
                <div className="mt-1 flex justify-end">
                  <button
                    onClick={handleRenameTeam}
                    className="px-3 py-1 text-sm  bg-[rgb(106,109,213)] hover:bg-[rgb(93,96,194)] text-white rounded-md transition"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {selectedUsers.map((id) => {
                  const user = userList?.find((u) => u.id === id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs shadow-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {user?.username?.charAt(0)}
                      </div>
                      {user?.username}
                      {id !== currentUser.id && (
                        <button
                          onClick={() => toggleUser(id)}
                          className="ml-1 text-indigo-700 hover:text-indigo-900 text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search Users */}
            <div className="mb-3 relative">
              <FaSearch className="absolute left-2.5 top-2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 px-3 py-1.5 border rounded-md border-gray-300 text-sm focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </div>

            {/* User List */}
            <div className="max-h-52 overflow-y-auto border rounded-lg p-2 bg-gray-50 space-y-1">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-2 text-xs">
                  No users found.
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-100 cursor-pointer text-sm transition"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-800 text-sm">
                        {u.username}{" "}
                        {u.id === currentUser.id && (
                          <span className="text-indigo-600">(You)</span>
                        )}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                      disabled={u.id === currentUser.id}
                      className="accent-indigo-600 w-3 h-3"
                    />
                  </label>
                ))
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-1.5 rounded-md bg-gray-300 text-gray-700 hover:bg-gray-300 text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={existingTeam ? handleUpdateTeam : handleCreateTeam}
                disabled={loading}
                className="flex-1 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-sm transition"
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
