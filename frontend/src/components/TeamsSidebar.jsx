import { useEffect, useState } from "react";
import axios from "axios";
import UserList from "./UserList";

export default function TeamsSidebar({ onSelectTeam, onSelectUser }) {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const API_BASE = "http://localhost:3000/api";

  // Fetch all teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get(`${API_BASE}/teams`);
        setTeams(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch teams:", err);
        setTeams([]);
      }
    };
    fetchTeams();
  }, []);

  // Open modal to create team
  const openModal = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users`);
      setUsers(Array.isArray(res.data) ? res.data : []);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsers([]);
    }
  };

  // Toggle user selection in modal
  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  // Select a team
  const handleSelectTeam = async (team) => {
    setSelectedTeam(team);
    onSelectTeam?.(team); // sends the selected team up to App.js

    // Optional: fetch team members if needed
    try {
      const res = await axios.get(`${API_BASE}/teams/${team.id}/members`);
      setSelectedTeamMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setSelectedTeamMembers([]);
    }
  };

  // Create a new team
  const handleCreateTeam = async () => {
    if (!teamName || selectedUsers.length === 0) {
      alert("Please enter a team name and select members!");
      return;
    }

    try {
      await axios.post(`${API_BASE}/teams`, {
        name: teamName,
        created_by: 1, // logged-in user ID
        members: selectedUsers,
      });

      // Refresh teams
      const updatedTeams = await axios.get(`${API_BASE}/teams`);
      setTeams(Array.isArray(updatedTeams.data) ? updatedTeams.data : []);

      // Reset modal
      setTeamName("");
      setSelectedUsers([]);
      setShowModal(false);
    } catch (err) {
      console.error("Failed to create team:", err);
      alert("Failed to create team");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Teams Header */}
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <h2 className="font-semibold">Communities</h2>
        <button
          onClick={openModal}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create
        </button>
      </div>

      {/* Teams List */}
      <ul className="flex-1 overflow-y-auto p-3">
        {Array.isArray(teams) &&
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
          ))}
      </ul>

      {/* Team Members */}
      {selectedTeam && (
        <div className="border-t p-3 bg-gray-100">
          <h3 className="font-semibold mb-2">Members of {selectedTeam.name}</h3>
          <UserList
            users={
              Array.isArray(selectedTeamMembers) ? selectedTeamMembers : []
            }
            onSelectUser={onSelectUser}
            searchQuery={searchQuery}
          />
        </div>
      )}

      {/* Modal for creating team */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white w-[400px] rounded-xl shadow-lg">
            <div className="flex justify-between items-center border-b px-4 py-2">
              <h3 className="font-semibold">Create Team</h3>
              <button onClick={() => setShowModal(false)}>✖</button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <input
                type="text"
                placeholder="Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-blue-500"
              />

              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-blue-500"
              />

              <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                {filteredUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                    />
                    <span>{u.username}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
