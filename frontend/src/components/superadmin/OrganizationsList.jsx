import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../../config";
import OrganizationViewModal from "./OrganizationViewModal";
import { toast } from "react-toastify";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { FiCheckSquare, FiX } from "react-icons/fi";

export default function OrganizationsList({ q }) {

  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState([]);
  const [multiMode, setMultiMode] = useState(false);

  const [viewData, setViewData] = useState(null);
  const token = sessionStorage.getItem("chatToken");

  const [page, setPage] = useState(1);
  const perPage = 5;

  const totalPages = Math.ceil(orgs.length / perPage);

  const load = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${URL}/super-admin/organizations`, {
        params: { q: q || "" },
        headers: { Authorization: "Bearer " + token },
      });

      setOrgs(res.data.organizations || []);
    } catch (err) {
      console.error("Org Load Error", err);
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [q]);

  const paginated = orgs.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (!confirm("Delete selected organizations?")) return;

    try {
      for (const id of selected) {
        await axios.delete(`${URL}/super-admin/organizations/${id}`, {
          headers: { Authorization: "Bearer " + token },
        });
      }
      toast.success("Selected organizations deleted");
      setSelected([]);
      setMultiMode(false);
      load();
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete organization?")) return;

    try {
      await axios.delete(`${URL}/super-admin/organizations/${id}`, {
        headers: { Authorization: "Bearer " + token },
      });
      toast.success("Deleted successfully");
      load();
    } catch {
      toast.error("Delete failed");
    }
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
    <div className="flex items-center justify-between bg-white border border-gray-200 shadow-sm p-4 rounded-xl">

      <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        <i className="fa-solid fa-building text-blue-600 text-[20px]"></i>
        <span>Total Organizations: {orgs.length}</span>
      </div>

      {/* TOP RIGHT PAGE SELECTOR */}
      <div className="flex items-center gap-3">

      

        {/* Multi Select */}
        <button
          onClick={() => {
            setMultiMode(!multiMode);
            setSelected([]);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm
            ${multiMode
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
        >
          {multiMode ? (
            <>
              <FiX className="text-gray-700" /> Cancel
            </>
          ) : (
            <>
              <FiCheckSquare className="text-white" /> Select Multiple
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

          <select
          value={page}
          onChange={(e) => setPage(Number(e.target.value))}
          className="border border-gray-400 px-3 py-1.5 rounded-lg shadow-sm text-sm"
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
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200 text-left text-sm text-gray-600">
            {multiMode && <th className="p-3">Select</th>}
            <th className="p-3">Sr No</th>
            <th className="p-3">Org Name</th>
            <th className="p-3">Domain</th>
            <th className="p-3">Email</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading &&
            [...Array(5)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td colSpan="7" className="h-14 bg-gray-100 rounded"></td>
              </tr>
            ))}

          {!loading && paginated.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center text-gray-500 py-5">
                No organizations found.
              </td>
            </tr>
          )}

          {!loading &&
            paginated.map((o, index) => (
              <tr
                key={o.id}
                className="border-t border-gray-200 hover:bg-gray-50 transition"
              >
                {multiMode && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(o.id)}
                      onChange={() => toggleSelect(o.id)}
                      className="h-4 w-4"
                    />
                  </td>
                )}

                {/* SR NO */}
                <td className="pl-3  text-gray-600  ">
                  {(page - 1) * perPage + index + 1}
                </td>

                {/* Name */}
                <td
                  className="p-3  text-gray-800"
                  dangerouslySetInnerHTML={{ __html: highlight(o.name) }}
                ></td>

                {/* Domain */}
                <td
                  className="p-3 text-gray-600"
                  dangerouslySetInnerHTML={{ __html: highlight(o.domain) }}
                ></td>

                {/* Email */}
                <td
                  className="p-3 text-gray-500"
                  dangerouslySetInnerHTML={{ __html: highlight(o.email) }}
                ></td>

                {/* STATUS COLUMN */}
                <td className="p-3">
                  {o.status === "active" ? (
                    <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700">
                      Inactive
                    </span>
                  )}
                </td>

                {/* ACTIONS */}
                <td className="p-3 text-center">
                  {!multiMode && (
                    <div className="flex justify-center gap-2">

                      <button
                        onClick={() => setViewData(o.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        <FaEye size={12} /> View
                      </button>

                      <button
                        onClick={() => alert("Edit coming soon")}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm"
                      >
                        <FaEdit size={12} /> Edit
                      </button>

                      <button
                        onClick={() => handleDelete(o.id)}
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

    {/* PAGINATION */}
    <div className="flex justify-between items-center mt-4 bg-white p-3 rounded-xl shadow-sm">

      <button
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
        className="px-4 py-1.5 text-sm rounded-lg border border-gray-700 shadow-sm disabled:opacity-60 hover:bg-gray-100"
      >
        Prev
      </button>

      <span className="text-sm font-medium text-gray-500">
        Page <b>{page}</b> / {totalPages}
      </span>

      <button
        disabled={page >= totalPages}
        onClick={() => setPage(page + 1)}
        className="px-4 py-1.5 text-sm rounded-lg border border-gray-700 shadow-sm disabled:opacity-60 hover:bg-gray-100"
      >
        Next
      </button>

    </div>

    {/* MODAL */}
    {viewData && (
      <OrganizationViewModal
        id={viewData}
        onClose={() => setViewData(null)}
      />
    )}
  </div>
);

}
