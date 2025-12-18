import { useEffect, useState } from "react";
import AdminViewModal from "./AdminViewModal";
import { URL } from "../../config";

export default function AdminOrgAdminsPage({ orgId }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact: "",
    username: "",
  });

  useEffect(() => {
    if (orgId) fetchAdmins();
  }, [orgId]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${URL}/api/adminUsers/org/${orgId}/admins`);
      const data = await res.json();
      if (res.ok) setAdmins(data.users || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminId) => {
    if (!confirm("Delete this admin?")) return;
    try {
      const res = await fetch(`${URL}/api/adminUsers/user/${adminId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchAdmins();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const openEditModal = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      full_name: admin.full_name,
      email: admin.email,
      contact: admin.contact,
      username: admin.username,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${URL}/api/adminUsers/user/${editingAdmin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        fetchAdmins();
        setEditingAdmin(null);
      }
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h2 className="text-2xl font-semibold mb-4">Organization Admins</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full divide-y border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Sr No</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Contact</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a, index) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2">{a.full_name}</td>
                <td className="px-4 py-2">{a.email}</td>
                <td className="px-4 py-2">{a.contact}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    className="px-2 py-1 bg-green-500 text-white rounded"
                    onClick={() => setSelectedAdmin(a)}
                  >
                    View
                  </button>
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded"
                    onClick={() => openEditModal(a)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded"
                    onClick={() => handleDelete(a.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* View Modal */}
      {selectedAdmin && (
        <AdminViewModal user={selectedAdmin} onClose={() => setSelectedAdmin(null)} />
      )}

      {/* Edit Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Edit Admin</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border px-3 py-2 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded-md"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 rounded-md"
                  onClick={() => setEditingAdmin(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
