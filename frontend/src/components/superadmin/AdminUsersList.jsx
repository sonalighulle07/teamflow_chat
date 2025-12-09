import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../../config";
import { FaEye, FaTrash } from "react-icons/fa";
import AdminViewModal from "./AdminViewModal";
import {  FiSquare, FiX } from "react-icons/fi";

export default function AdminUsersList({ q }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState([]);
  const [multiMode, setMultiMode] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const [sortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [perPage] = useState(5);

  const token = sessionStorage.getItem("chatToken");

  const loadAdmins = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${URL}/super-admin/admin-users`, {
        params: { q },
        headers: { Authorization: "Bearer " + token },
      });

      setAdmins(res.data.admins || []);
    } catch (err) {
      console.error("Load admin error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, [q]);

  const totalPages = Math.ceil(admins.length / perPage);

  const paginated = admins
    .sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : -1))
    .slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (!confirm("Delete selected admins?")) return;

    for (const id of selected) {
      await axios.delete(`${URL}/super-admin/users/${id}`, {
        headers: { Authorization: "Bearer " + token },
      });
    }

    setSelected([]);
    setMultiMode(false);
    loadAdmins();
  };

  const deleteAdmin = async (id) => {
    if (!confirm("Delete this admin?")) return;

    await axios.delete(`${URL}/super-admin/users/${id}`, {
      headers: { Authorization: "Bearer " + token },
    });

    loadAdmins();
  };

  const highlight = (text) => {
    if (!text) return "";
    if (!q) return text;
    const regex = new RegExp(`(${q})`, "gi");
    return text.replace(regex, "<mark class='bg-yellow-300'>$1</mark>");
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between bg-white border border-gray-200  p-4 rounded-xl">

        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <i className="fa-solid fa-user-shield text-indigo-600 text-[20px]"></i>
          <span>
            Total Admin Users:{" "}
            <span >{admins.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">

          {/* Multi Select Button */}
          <button
            onClick={() => {
              setMultiMode(!multiMode);
              setSelected([]);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition shadow-sm
              ${
                multiMode
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
          >
            {multiMode ? (
              <>
                <FiX className="text-gray-700" /> Cancel
              </>
            ) : (
              <>
                < FiSquare className="text-white" /> Select
              </>
            )}
          </button>

          {multiMode && selected.length > 0 && (
            <button
              onClick={deleteSelected}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-red-600 text-white shadow hover:bg-red-700"
            >
              <FaTrash size={12} /> Delete {selected.length}
            </button>
          )}

          {/* PAGE SELECT DROPDOWN */}
          <select
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            className="border-gray-500 px-3 py-1.5 rounded-lg shadow-sm text-sm"
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <option key={i} value={i + 1}>
                Page {i + 1}
              </option>
            ))}
          </select>

        
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <table className="w-full border-collapse">
          <thead>
  <tr className="bg-gray-200 text-left text-sm text-gray-600">
    {multiMode && <th className="p-3">Select</th>}
    <th className="p-3 w-16">Sr No</th>
    <th className="p-3">Name</th>
    <th className="p-3">Email</th>
    <th className="p-3">Organization</th>
    <th className="p-3">Role</th>
    <th className="p-3 text-center">Actions</th>
  </tr>
</thead>

<tbody>
  {!loading &&
    paginated.map((u, index) => (
      <tr
        key={u.id}
        className="border-t border-gray-200 hover:bg-gray-50 transition"
      >
        {multiMode && (
          <td className="p-3">
            <input
              type="checkbox"
              checked={selected.includes(u.id)}
              onChange={() => toggleSelect(u.id)}
              className="h-4 w-4"
            />
          </td>
        )}

        {/* SR NO */}
        <td className="p-3 text-[14px]  text-gray-700">
          {(page - 1) * perPage + index + 1}
        </td>

        <td
          className="p-3 text-[15px] text-gray-700"
          dangerouslySetInnerHTML={{ __html: highlight(u.name) }}
        ></td>

        <td
          className="p-3  text-[15px] text-gray-600"
          dangerouslySetInnerHTML={{ __html: highlight(u.email) }}
        ></td>

        <td className="p-3 text-[15px] text-gray-500">
          {u.organization_name || "—"}
        </td>

        <td className="p-3 text-[15px]">
          <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-600 rounded-full">
            Org Admin
          </span>
        </td>

        <td className="p-3 text-center">
          {!multiMode && (
            <div className="flex justify-center gap-2">

              <button
                onClick={() => setSelectedAdmin(u)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <FaEye size={12} /> View
              </button>

              <button
                onClick={() => deleteAdmin(u.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                <FaTrash size={12} /> Delete
              </button>

            </div>
          )}
        </td>
      </tr>
    ))}
</tbody>

        </table>
      </div>

      {/* BOTTOM PAGINATION */}
      <div className="flex justify-between items-center mt-4 bg-white p-3 rounded-xl ">

  {/* Prev */}
  <button
    disabled={page <= 1}
    onClick={() => setPage(page - 1)}
    className="px-4 py-1.5 text-sm rounded-lg border border-gray-700 shadow-sm disabled:opacity-60 hover:bg-gray-100"
  >
    Prev
  </button>

  {/* Only Page Text */}
  <span className="text-sm font-medium text-gray-500">
    Page <b>{page}</b> / {totalPages}
  </span>

  {/* Next */}
  <button
    disabled={page >= totalPages}
    onClick={() => setPage(page + 1)}
    className="px-4 py-1.5 text-sm rounded-lg border border-gray-700 shadow-sm disabled:opacity-60 hover:bg-gray-100"
  >
    Next
  </button>

</div>


      {selectedAdmin && (
        <AdminViewModal
          admin={selectedAdmin}
          onClose={() => setSelectedAdmin(null)}
        />
      )}
    </div>
  );
}
