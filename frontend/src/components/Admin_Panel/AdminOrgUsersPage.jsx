import { useEffect, useState, useRef } from "react";
import { HiOutlineEye, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";
import UserViewModal from "./UserViewModal";
import CreateUserModal from "./CreateUserModal";
import { URL } from "../../config";

export default function AdminOrgUsersPage({ orgId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact: "",
    username: "",
    role: "",
  });

  const [searchText, setSearchText] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const searchRef = useRef(null);
  const menuRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const limit = rowsPerPage;

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
      const res = await fetch(`${URL}/api/adminUsers/user/${userId}`, {
        method: "DELETE",
      });
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
      role: user.role,
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

  // Filtered & paginated users
  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / limit);
  const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-200 px-1 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  useEffect(() => {
    const handleClickOutsideMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutsideMenu);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideMenu);
  }, []);

  useEffect(() => {
    const handleClickOutsideSearch = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setSearchText("");
    };
    document.addEventListener("mousedown", handleClickOutsideSearch);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideSearch);
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 mt-3 flex-wrap gap-3">
        <h2 className="text-[17px] text-gray-500">Organization Users</h2>
        <div className="flex gap-4 items-center">
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              placeholder="Search"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-4 py-1 w-[262px] max-w-xs shadow-sm text-sm text-gray-700 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FiSearch />
            </span>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-[2px]  bg-[#3B82F6] text-white rounded-[4px] hover:bg-[#1b6ff6]"
          >
            + Create
          </button>

          <div className="flex items-center gap-1.5">
            <label className="text-gray-500 text-sm">Show:</label>
            <div className="relative">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value));
                  setPage(1);
                }}
                className="h-[28px] pl-2 pr-7 border border-gray-300 rounded-md text-sm text-gray-500 bg-white appearance-none cursor-pointer"
              >
                {[5, 10, 20, 50].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg
                  className="w-3.5 h-3.5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto max-h-[60vh] custom-scrollbar border border-gray-200 rounded-md bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#D4E5FF] text-left text-gray-500 text-sm sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2">Sr. No.</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length ? (
              paginatedUsers.map((u, idx) => (
                <tr
                  key={u.id}
                  className={
                    idx % 2 ? "bg-gray-100 text-gray-600" : "text-gray-600"
                  }
                >
                  <td className=" px-3 py-2 ">
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td className="px-3 py-2 ">
                    {highlightMatch(u.full_name, searchText)}
                  </td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="relative px-3 py-2">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === u.id ? null : u.id)
                      }
                      className="text-gray-600 ml-2"
                    >
                      <BsThreeDotsVertical size={17} />
                    </button>
                    {openMenuId === u.id && (
                      <div
                        ref={menuRef}
                        className="absolute left-[-15px] top-8 z-20 w-30 bg-white rounded-md shadow-md"
                      >
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100 border-b border-gray-200"
                        >
                          <HiOutlineEye className="text-blue-600 h-4 w-4" />{" "}
                          View
                        </button>
                        <button
                          onClick={() => {
                            openEditModal(u);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100 border-b border-gray-200"
                        >
                          <HiOutlinePencil className="text-gray-600 h-4 w-4" />{" "}
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100"
                        >
                          <HiOutlineTrash className="text-gray-600 h-4 w-4" />{" "}
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-2 px-4 py-2 text-gray-600 text-sm border-t border-gray-200 bg-gray-50 flex-wrap gap-2">
          <div>
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, filteredUsers.length)} of{" "}
            {filteredUsers.length} entries
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 ${
                  page === i + 1
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {selectedUser && (
        <UserViewModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="w-full max-w-[420px] bg-[#F2F2F2] rounded-[12px] border border-[#E4E4E4] p-9 shadow-xl">
            {/* Header */}
            <h3 className="text-center text-lg font-medium text-[#696969] mt-[-5px] mb-6">
              Update User Details
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm border border-transparent
                       hover:border-gray-300 focus:border-gray-200 focus:ring-1 focus:ring-gray-200 outline-none"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm border border-transparent
                      hover:border-gray-300 focus:border-gray-200 focus:ring-1 focus:ring-gray-200 outline-none"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm border border-transparent
                      hover:border-gray-300 focus:border-gray-200 focus:ring-1 focus:ring-gray-200 outline-none"
                  required
                />
              </div>

              {/* Contact */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Contact
                </label>
                <input
                  type="text"
                  placeholder="Enter mobile number"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm border border-transparent
                      hover:border-gray-300 focus:border-gray-200 focus:ring-1 focus:ring-gray-200 outline-none"
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm border border-transparent
                       hover:border-gray-300 focus:border-gray-200 focus:ring-1 focus:ring-gray-200 outline-none cursor-pointer"
                >
                  <option value="user">User</option>
                  <option value="org_admin">Org Admin</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-1/2 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-2100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="w-1/2 py-2 text-sm rounded-[8px] bg-[#999EFA] text-white hover:bg-[#8f95f7]"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          orgId={orgId}
          defaultRole="user" // ← yaha default role bhej do
          onSaved={fetchUsers}
        />
      )}

      {loading && (
        <div className="absolute top-0 left-0 w-full h-full bg-white/70 flex items-center justify-center">
          Loading...
        </div>
      )}
    </div>
  );
}
