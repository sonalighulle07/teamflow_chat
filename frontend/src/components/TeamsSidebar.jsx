import { useEffect, useState } from "react";
import axios from "axios";
import UserList from "./UserList";
import { URL } from "../config";
import TeamChat from "./TeamChat";

export default function TeamsSidebar({
  onSelectTeam,
  onSelectUser,
  currentUser,
}) {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const token = sessionStorage.getItem("chatToken");

  // Fetch teams the user is part of
  useEffect(() => {
    const fetchTeams = async () => {
      if (!token || !currentUser?.id) return;

      try {
        console.log("Fetching teams for user:", currentUser.id);
        const res = await axios.get(
          `${URL}/api/teams?userId=${currentUser.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setTeams(Array.isArray(res.data) ? res.data : []);
        console.log("Updated teams state:", res.data);
      } catch (err) {
        console.error(
          "Failed to fetch teams:",
          err.response?.data || err.message
        );
        setTeams([]);
      }
    };

    fetchTeams();
  }, [currentUser, token]);

  // Log teams state whenever it updates
  useEffect(() => {
    console.log("Updated teams state:", teams);
  }, [teams]);

  // Open modal to create team
  const openModal = async () => {
    if (!token) {
      alert("Authentication token is missing. Please login again.");
      return;
    }

    try {
      const res = await axios.get(`${URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUsers(Array.isArray(res.data) ? res.data : []);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsers([]);
    }
  };

  // Toggle user selection
  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  // Select a team
  const handleSelectTeam = async (team) => {
    if (!team || !team.id) return;

    setSelectedTeam(team);
    onSelectTeam?.(team);

    if (!token) {
      console.warn("Token missing. Cannot fetch team members.");
      setSelectedTeamMembers([]);
      return;
    }

    try {
      console.log(`Fetching members for team: ${team.name} (ID: ${team.id})`);
      const res = await axios.get(`${URL}/api/teams/${team.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Ensure we always have an array of members
      const members =
        Array.isArray(res.data) && res.data.length > 0
          ? res.data
          : res.data && res.data.id
          ? [res.data]
          : [];
      setSelectedTeamMembers(members);
      console.log("Team members set:", members);
    } catch (err) {
      console.error(
        "Failed to fetch team members:",
        err.response?.data || err.message
      );
      setSelectedTeamMembers([]);
    }
  };

  // Create a new team
  const handleCreateTeam = async () => {
    if (!teamName || selectedUsers.length === 0) {
      alert("Please enter a team name and select members!");
      return;
    }

    if (!token) {
      alert("Authentication token is missing. Please login again.");
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

      // Refresh teams after creation
      const updatedTeams = await axios.get(
        `${URL}/api/teams?userId=${currentUser.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setTeams(Array.isArray(updatedTeams.data) ? updatedTeams.data : []);
      setTeamName("");
      setSelectedUsers([]);
      setShowModal(false);
    } catch (err) {
      console.error("Failed to create team:", err);
      alert(
        "Failed to create team: " + (err.response?.data?.message || err.message)
      );
    }
  };

  // Filter users for modal search
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <h2 className="font-semibold">Communities</h2>
        <button
          onClick={openModal}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create
        </button>
      </div>

      {/* Team List */}
      <ul className="flex-1 overflow-y-auto p-3">
        {teams.length > 0 ? (
          teams.map((team) => (
            <li
              key={team.id}
              className={`p-2 rounded-lg hover:bg-gray-200 cursor-pointer ${
                selectedTeam?.id === team.id ? "bg-gray-200 font-semibold" : ""
              }`}
              onClick={() => handleSelectTeam(team)}
            >
              {team.name}
            </li>
          ))
        ) : (
          <p className="text-gray-500 text-center mt-4">No teams available</p>
        )}
      </ul>

      {/* Team Chat */}
      {selectedTeam && selectedTeamMembers.length > 0 && (
        <div className="border-t h-[400px]">
          <TeamChat
            team={selectedTeam}
            currentUser={currentUser}
            members={selectedTeamMembers}
          />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50 animate-fadeIn">
          <div className="bg-white w-[440px] rounded-2xl shadow-2xl border border-gray-100 transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">
                Create Team
              </h3>
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
                      className="flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover:bg-gray-100 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="accent-purple-600 w-4 h-4"
                      />
                      <span className="text-gray-700 font-medium">
                        {u.username}
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
      )}
    </div>
  );
}
