import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../config";

export default function TeamsSidebar({ currentUser, onSelectTeam }) {
  const [teams, setTeams] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  // Fetch user teams
  useEffect(() => {
    if (!currentUser?.id) return;
    axios
      .get(`${URL}/api/teams?userId=${currentUser.id}`)
      .then((res) => setTeams(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to fetch teams:", err));
  }, [currentUser]);

  // Open create team modal
  const openModal = async () => {
    try {
      const res = await axios.get(`${URL}/api/users`);
      setUsers(Array.isArray(res.data) ? res.data : []);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  // Select team
  const handleSelectTeam = (team) => {
    setSelectedTeamId(team.id);
    onSelectTeam(team);
  };

  // Create team
  const handleCreateTeam = async () => {
    if (!teamName || selectedUsers.length === 0) {
      alert("Enter team name and select members!");
      return;
    }
    try {
      await axios.post(`${URL}/api/teams`, {
        name: teamName,
        created_by: currentUser.id,
        members: selectedUsers,
      });
      const updatedTeams = await axios.get(
        `${URL}/api/teams?userId=${currentUser.id}`
      );
      setTeams(Array.isArray(updatedTeams.data) ? updatedTeams.data : []);
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
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <h2 className="font-semibold">Teams</h2>
        <button
          onClick={openModal}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto p-3">
        {teams.map((team) => (
          <li
            key={team.id}
            className={`p-2 rounded-lg hover:bg-gray-200 cursor-pointer ${
              selectedTeamId === team.id ? "bg-gray-200 font-semibold" : ""
            }`}
            onClick={() => handleSelectTeam(team)}
          >
            {team.name}
          </li>
        ))}
      </ul>

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
