import { useEffect, useState } from "react";
import UserViewModal from "./UserViewModal";
import { URL } from "../../config";

export default function AdminOrgUsersPage({ orgId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null); // ✅ for edit modal
  const [formData, setFormData] = useState({ full_name: "", email: "", contact: "", username: "" });

  useEffect(() => {
    if (orgId) fetchUsers();
  }, [orgId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${URL}/api/adminUsers/org/${orgId}/users`);
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
      else console.error("Fetch failed:", data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`${URL}/api/adminUsers/user/${userId}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      contact: user.contact,
      username: user.username,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${URL}/api/adminUsers/user/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        fetchUsers();
        setEditingUser(null);
      }
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h2 className="text-2xl font-semibold mb-4">Organization Users</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full divide-y border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Sr No</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, index) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2">{u.full_name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    className="px-2 py-1 bg-green-500 text-white rounded"
                    onClick={() => setSelectedUser(u)}
                  >
                    View
                  </button>
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded"
                    onClick={() => openEditModal(u)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded"
                    onClick={() => handleDelete(u.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedUser && (
        <UserViewModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {editingUser && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl">
      <h3 className="text-2xl font-semibold text-gray-800 mb-5">Edit User</h3>
      <form onSubmit={handleEditSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="full_name" className="block text-gray-700 font-medium mb-1">
            Full Name
          </label>
          <input
            id="full_name"
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-gray-700 font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        {/* Contact */}
        <div>
          <label htmlFor="contact" className="block text-gray-700 font-medium mb-1">
            Contact
          </label>
          <input
            id="contact"
            type="text"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-gray-700 font-medium mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            onClick={() => setEditingUser(null)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Update
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
}
