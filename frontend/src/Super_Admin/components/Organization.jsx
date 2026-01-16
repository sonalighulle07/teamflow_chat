import { useEffect, useState, useRef, forwardRef } from "react";
import axios from "axios";
import { URL } from "../../config";
import {
  HiDotsVertical,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineMail,
  HiOutlineCalendar,
} from "react-icons/hi";
import { FiSearch } from "react-icons/fi";
import CreateOrganizationForm from "./CreateOrganizationForm";
import ViewOrganizationModal from "./ViewOrganizationModal";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function Organization() {
  const [plans, setPlans] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [editingOrg, setEditingOrg] = useState(null);
  const [viewOrgId, setViewOrgId] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const token = localStorage.getItem("token");
  const menuRef = useRef(null);

  const limit = rowsPerPage;

  const rowRefs = useRef({});
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState({
    status: [],
    plan: "",
    startDate: "",
    endDate: "",
  });
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch organizations
  const fetchOrganizations = async (q = searchText, p = page) => {
    try {
      setLoading(true);

      const params = {
        q,
        page: p,
        limit,
        ...(filter.status.length > 0 && { status: filter.status.join(",") }),
        ...(filter.plan && { plan: filter.plan }),
        ...(filter.startDate && { startDate: filter.startDate }),
        ...(filter.endDate && { endDate: filter.endDate }),
      };

      const res = await axios.get(`${URL}/super-admin/organizations`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data.organizations || []);
      setTotalCount(res.data.total || 0);
      setTotalPages(Math.ceil((res.data.total || 0) / limit));
    } catch (err) {
      console.error("Fetch org error:", err);
      toast.error("Failed to fetch organizations", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        theme: "colored",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPlanNames = async () => {
      try {
        const res = await axios.get(`${URL}/api/plans/names`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Plan response:", res.data);
        // Handle both object with `success` and plain array
        const plansArray = res.data.success ? res.data.data : res.data;
        setPlans(plansArray || []);
      } catch (err) {
        console.error("Fetch plan names error:", err);
        setPlans([]);
      }
    };
    fetchPlanNames();
  }, []);

  useEffect(() => {
    const handleClickOutsideMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setEditingOrg(null); // close the menu
      }
    };
    document.addEventListener("mousedown", handleClickOutsideMenu);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideMenu);
  }, []);

  // Fetch on page, rowsPerPage, searchText, or filter change
  useEffect(() => {
    fetchOrganizations(searchText, page);
  }, [page, rowsPerPage, filter, searchText]);

  // Scroll to first match when search text changes
  useEffect(() => {
    if (!searchText) return;
    const firstMatch = data.find((org) =>
      org.name.toLowerCase().includes(searchText.toLowerCase())
    );
    if (firstMatch && rowRefs.current[firstMatch.id]) {
      rowRefs.current[firstMatch.id].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [searchText, data]);

  // Clear search on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchText("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const DateInput = forwardRef(({ value, onClick }, ref) => (
    <div
      className="w-[160px] h-[34px] border border-gray-300 rounded-lg px-3 text-sm text-gray-600 flex items-center justify-between cursor-pointer"
      onClick={onClick}
      ref={ref}
    >
      <input
        readOnly
        className="outline-none bg-transparent w-full"
        value={value}
      />
      <HiOutlineCalendar className="text-gray-400 w-6" />
    </div>
  ));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this organization?")) return;
    try {
      await axios.delete(`${URL}/super-admin/organizations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Organization deleted successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        theme: "colored",
      });
      fetchOrganizations();
    } catch (err) {
      toast.error("Failed to delete organization!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        theme: "colored",
      });
    }
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return text.split(regex).map((part, idx) =>
      regex.test(part) ? (
        <span key={idx} className="bg-yellow-200 px-1 rounded">
          {part}
        </span>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  const inputClass =
    "w-full h-[40px] bg-white border border-gray-300 px-4 text-sm text-gray-600 rounded-full";

  return (
    <div className="flex-1 p-6 bg-gray-50 h-screen overflow-y-hidden relative">
      {/* Breadcrumb */}
      <div className="text-gray-600 mb-4">Dashboard &bull; Organization</div>

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg text-gray-500">Organization</h2>
        <div className="flex gap-4 items-center">
          {/* Search Field */}
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              placeholder="Search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={`pl-9 pr-4 py-1 w-full max-w-xs text-sm text-gray-700 rounded-md border
            ${
              searchText
                ? "border-blue-500 ring-1 ring-blue-500"
                : "border-gray-300"
            }
            focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all`}
            />
            <span
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                searchText ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <FiSearch />
            </span>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilter(true)}
            className="px-3 py-0.5  border border-gray-300 rounded-md text-gray-500 hover:bg-gray-100"
          >
            Filter
          </button>

          {/* Create Button */}
          <button
            onClick={() => setShowModal(true)}
            className="px-3 p-0.5 bg-[#3B82F6] text-white rounded-md hover:bg-[#1b6ff6]"
          >
            + Create
          </button>

          {/* Rows per page */}
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
              {/* Custom arrow */}
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
      <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[70vh]">
        {loading ? (
          <p className="p-4 text-gray-500 text-sm">Loading...</p>
        ) : (
          <>
            <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200 max-h-[60vh]">
              <table className="min-w-full w-full border-collapse">
                <thead className="bg-[#D4E5FF] text-left text-gray-500 text-sm sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 ">Sr.No</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 text-sm">
                  {data.length > 0 ? (
                    data
                      .filter((org) =>
                        org.name
                          .toLowerCase()
                          .includes(searchText.toLowerCase())
                      )
                      .map((org, idx) => (
                        <tr
                          key={org.id}
                          ref={(el) => (rowRefs.current[org.id] = el)}
                          className={
                            idx % 2 === 0
                              ? "bg-white text-gray-600"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          <td className="px-4 py-2">
                            {(page - 1) * rowsPerPage + idx + 1}
                          </td>
                          <td className="px-4 py-2">
                            {highlightMatch(org.name, searchText)}
                          </td>
                          <td className="px-4 py-2">{org.domain}</td>
                          <td className="px-4 py-2">{org.email}</td>
                          <td className="px-4 py-2 capitalize">{org.plan}</td>
                          <td className="px-4 py-2">
                            <span className="flex items-center gap-1">
                              <span
                                className={`h-2 w-2 rounded-full inline-block mr-1 ${
                                  org.status === "active"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              ></span>
                              <span
                                className={`${
                                  org.status === "active"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {org.status.charAt(0).toUpperCase() +
                                  org.status.slice(1)}
                              </span>
                            </span>
                          </td>
                          <td className="relative px-4 py-3">
                            <button
                              onClick={() =>
                                setEditingOrg(
                                  editingOrg?.id === org.id ? null : org
                                )
                              }
                              className="text-gray-600 hover:text-gray-600 ml-3 font-extrabold"
                            >
                              <HiDotsVertical size={17} />
                            </button>

                            {editingOrg?.id === org.id && (
                              <div
                                ref={menuRef} // attach ref here
                                className="absolute right-1 top-8 z-20 w-32 bg-white rounded-md shadow-md"
                              >
                                <button
                                  className="flex items-center gap-2 px-3 py-1 w-full hover:bg-gray-100 border-b border-gray-200"
                                  onClick={() => {
                                    setViewOrgId(org.id);
                                    setEditingOrg(null);
                                  }}
                                >
                                  <HiOutlineEye className="text-blue-600 h-4 w-4" />{" "}
                                  View
                                </button>
                                <button
                                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100 border-b border-gray-200"
                                  onClick={() => {
                                    setEditingOrg(org);
                                    setShowModal(true);
                                  }}
                                >
                                  <HiOutlinePencil className="text-gray-600 h-4 w-4" />{" "}
                                  Edit
                                </button>
                                <button
                                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100"
                                  onClick={() => {
                                    handleDelete(org.id);
                                    setEditingOrg(null);
                                  }}
                                >
                                  <HiOutlineTrash className="text-gray-600 h-4 w-4" />{" "}
                                  Delete
                                </button>
                                <button
                                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100 border-b border-gray-200"
                                  onClick={() => setEditingOrg(null)}
                                >
                                  <HiOutlineMail className="text-gray-600 h-4 w-4" />{" "}
                                  Send Mail
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-4 text-gray-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination always visible */}
            <div className="flex justify-between items-center mt-2 px-4 py-2 text-gray-600 text-sm border-t border-gray-200 bg-gray-50">
              <div>
                Showing {(page - 1) * rowsPerPage + 1} to{" "}
                {(page - 1) * rowsPerPage + data.length} of {totalCount} entries
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
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-6 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-[700px] bg-[#F8F8F8] rounded-[15px] shadow-lg border-[#E4E4E4] animate-scaleIn">
            <CreateOrganizationForm
              organization={editingOrg}
              onSuccess={() => {
                setShowModal(false);
                setEditingOrg(null);
                fetchOrganizations();
              }}
            />
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-6 text-gray-600 font-bold text-[11px]"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {viewOrgId && (
        <ViewOrganizationModal
          orgId={viewOrgId}
          onClose={() => setViewOrgId(null)}
        />
      )}

      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowFilter(false)}
          />

          {/* Card */}
          <div className="relative w-[451px] bg-white rounded-[10px] shadow-md px-8 py-4 border border-[#C4C4C4]">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[17px] text-gray-600 font-normal pt-3">
                Filter
              </h3>
              <button
                onClick={() => setShowFilter(false)}
                className="text-gray-500 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Status */}
            <div className="mb-6 ">
              <p className="text-sm text-gray-500 mb-2">Status</p>
              <div className="flex gap-3 text-sm text-gray-500">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 border-gray-300 rounded"
                    checked={filter.status.includes("active")}
                    onChange={(e) =>
                      setFilter((f) => ({
                        ...f,
                        status: e.target.checked
                          ? [...f.status, "active"]
                          : f.status.filter((s) => s !== "active"),
                      }))
                    }
                  />
                  Active
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 border-gray-300 rounded"
                    checked={filter.status.includes("inactive")}
                    onChange={(e) =>
                      setFilter((f) => ({
                        ...f,
                        status: e.target.checked
                          ? [...f.status, "inactive"]
                          : f.status.filter((s) => s !== "inactive"),
                      }))
                    }
                  />
                  Inactive
                </label>
              </div>
            </div>

            {/* Plan Dropdown */}
            <div className="relative mb-6" ref={dropdownRef}>
              <label className="text-sm text-gray-500 mb-1 block">Plans</label>
              <div
                onClick={() => setOpen(!open)}
                className="w-[200px] h-[30px] bg-white border border-gray-300 px-4 text-sm text-gray-400 rounded-full flex items-center justify-between cursor-pointer"
              >
                <span>{filter.plan || "Select plan"}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
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

              {open && (
                <div className="absolute z-20 mt-2 w-[200px] bg-white border border-gray-300 rounded-xl shadow-md overflow-hidden">
                  {plans?.length > 0 ? (
                    plans.map((planObj) => (
                      <div
                        key={planObj.id}
                        onClick={() =>
                          setFilter((f) => ({ ...f, plan: planObj.name }))
                        }
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                      >
                        {planObj.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-400">
                      No plans found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="flex items-center gap-6 mb-8">
              {/* Start Date */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Start date:</p>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  placeholderText="Select start date"
                  dateFormat="yyyy-MM-dd"
                  customInput={<DateInput />}
                />
              </div>

              {/* End Date */}
              <div>
                <p className="text-sm text-gray-500 mb-1">End date:</p>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  placeholderText="Select end date"
                  dateFormat="yyyy-MM-dd"
                  customInput={<DateInput />}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-5 mb-2">
              <button
                onClick={() => {
                  setFilter({
                    status: [],
                    plan: "",
                    startDate: "",
                    endDate: "",
                  });
                  setShowFilter(false);
                }}
                className="h-[30px] px-6 border border-gray-300 rounded-[6px] text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  // Save selected dates in filter
                  setFilter((f) => ({
                    ...f,
                    startDate: startDate
                      ? startDate.toISOString().split("T")[0]
                      : "",
                    endDate: endDate ? endDate.toISOString().split("T")[0] : "",
                  }));
                  setShowFilter(false);
                  fetchOrganizations(searchText, 1); // reset to page 1
                  setPage(1); // reset pagination
                }}
                className="h-[30px] px-8 bg-[#0673F0] text-white rounded-[6px] text-sm hover:bg-[#056de3]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        } 
      `}</style>
    </div>
  );
}
