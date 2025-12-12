// src/components/admin/AdminUsersPage.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const load = async (p = page, q = search) => {
    setLoading(true);
    try {
      const res = await fetchUsers({ page: p, limit, search: q });
      if (res.success) {
        setUsers(res.users);
        setTotal(res.total);
        setPage(p);
      } else {
        toast.error("Failed to load users");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, search); }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete user? This will deactivate their account.")) return;
    try {
      await deleteUser(id);
      toast.success("User deleted");
      load();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const handleSave = async (id, payload) => {
    try {
      const res = await updateUser(id, payload);
      if (res.success) {
        toast.success("User updated");
        setEditingUser(null);
        load();
      } else {
        toast.error("Update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Organization Users</h2>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, username, contact..."
            className="border rounded-lg px-3 py-2 w-80"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">User</th>
              <th className="px-4 py-3 text-left text-sm">Email</th>
              <th className="px-4 py-3 text-left text-sm">Role</th>
              <th className="px-4 py-3 text-left text-sm">Contact</th>
              <th className="px-4 py-3 text-left text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y">
            {loading ? (
              <tr><td colSpan="5" className="p-6 text-center">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5" className="p-6 text-center">No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 flex items-center gap-3">
                  <img
                    src={u.profile_image || "/default-avatar.png"}
                    alt={u.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs text-gray-500">@{u.username}</div>
                  </div>
                </td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.role === "org_admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">{u.contact}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setEditingUser(u)} className="mr-2 px-3 py-1 rounded-lg bg-blue-600 text-white text-sm">Edit</button>
                  <button onClick={() => handleDelete(u.id)} className="px-3 py-1 rounded-lg bg-red-100 text-red-600 text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <div className="text-sm text-gray-600">Total: {total}</div>
          <div className="flex gap-2">
            <button disabled={page<=1} onClick={() => load(page-1)} className="px-3 py-1 rounded border">Prev</button>
            <div className="px-3 py-1 rounded border">Page {page}</div>
            <button disabled={users.length < limit} onClick={() => load(page+1)} className="px-3 py-1 rounded border">Next</button>
          </div>
        </div>
      </div>

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
