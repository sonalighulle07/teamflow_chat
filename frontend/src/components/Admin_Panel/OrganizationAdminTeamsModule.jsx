import { useEffect, useState } from "react";
import { URL } from "../../config";

export default function OrganizationAdminTeamsModule({ orgId }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    fetchTeams();
  }, [orgId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${URL}/api/adminTeams/org/${orgId}`);
      if (!res.ok) {
        console.error("Failed to fetch teams:", res.status);
        setTeams([]);
        return;
      }
      const data = await res.json();
      setTeams(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teamId) => {
    if (!confirm("Delete this team?")) return;
    try {
      const res = await fetch(`${URL}/api/adminTeams/team/${teamId}`, { method: "DELETE" });
      if (res.ok) fetchTeams();
      else console.error("Delete failed:", res.status);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleEdit = async (team) => {
    const newName = prompt("Enter new team name", team.name);
    if (!newName) return;
    try {
      const res = await fetch(`${URL}/api/adminTeams/team/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) fetchTeams();
      else console.error("Update failed:", res.status);
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 ">
      <h2 className="text-xl font-semibold mb-4">Organization Teams</h2>
      {loading ? (
        <p>Loading...</p>
      ) : teams.length === 0 ? (
        <p>No teams found.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Team Name</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{team.name}</td>
                <td className="p-2 flex gap-2">
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => handleEdit(team)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleDelete(team.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
