import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { HiOutlineEye, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";
import CreatePlanModal from "./CreatePlanModal";
import ViewPlanModal from "./ViewPlanModal";
import { toast } from "react-toastify";
import { URL } from "../../config";

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const menuRef = useRef(null);

  // Filter modal
  const [planNames, setPlanNames] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPlan, setFilterPlan] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Added rows per page
  const limit = rowsPerPage;

  // Fetch plans
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${URL}/api/plans/list`);
      setPlans(res.data.success ? res.data.data : []);
    } catch (err) {
      console.error("Fetch plans error:", err);
      toast.error("Failed to fetch plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Delete plan
  const handleDelete = async (planId) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      await axios.delete(`${URL}/api/plans/delete/${planId}`);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      toast.success("Plan deleted successfully");
    } catch (err) {
      console.error("Delete plan error:", err);
      toast.error("Failed to delete plan");
    }
  };

  useEffect(() => {
    const fetchPlanNames = async () => {
      try {
        const res = await axios.get(`${URL}/api/plans/names`);
        if (res.data.success) {
          setPlanNames(res.data.data);
        }
      } catch (err) {
        console.error("Fetch plan names error:", err);
      }
    };

    fetchPlanNames();
  }, []);

  useEffect(() => {
    const handleClickOutsideMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null); // close the menu
      }
    };

    document.addEventListener("mousedown", handleClickOutsideMenu);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideMenu);
  }, []);

  // Filtered & paginated plans
  let filteredPlans = plans.filter((plan) =>
    plan.name.toLowerCase().includes(searchText.toLowerCase())
  );

  if (filterPlan) {
    filteredPlans = filteredPlans.filter((plan) => plan.name === filterPlan);
  }

  const totalPages = Math.ceil(filteredPlans.length / limit);
  const paginatedPlans = filteredPlans.slice((page - 1) * limit, page * limit);

  // Highlight search match
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
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchText("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="text-gray-600 mb-4">Dashboard • Plans</div>

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg text-gray-500">Plans</h2>
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
              className="pl-9 pr-4 py-1 w-full max-w-xs text-sm text-gray-700 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FiSearch />
            </span>
          </div>

          <button
            onClick={() => setShowFilter(true)}
            className="px-3 py-0.5 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-100"
          >
            Filter
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1 bg-[#3B82F6] text-white rounded-md hover:bg-[#1b6ff6]"
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
     <div className="overflow-y-auto max-h-[60vh] custom-scrollbar border border-gray-200 rounded-md bg-white">

        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#D4E5FF] text-left text-gray-500 text-sm sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">Sr. No.</th>
              <th className="px-4 py-3 ">Plan Name</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {paginatedPlans.length ? (
              paginatedPlans.map((plan, idx) => (
                <tr key={plan.id} className={idx % 2 ? "bg-gray-100 text-gray-600" : " text-gray-600"}>
                  <td className="px-4 py-3">{(page - 1) * limit + idx + 1}</td>
                  <td className="px-4 py-3">
                    {highlightMatch(plan.name, searchText)}
                  </td>
                  <td className="px-4 py-3">{plan.days}</td>
                  <td className="px-4 py-3">₹{plan.price}</td>
                  <td className="px-4 py-3">{plan.size}</td>
                  <td className="relative px-4 py-3">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === plan.id ? null : plan.id)
                      }
                      className="text-gray-600 hover:text-gray-600 ml-3 font-extrabold"
                    >
                      <BsThreeDotsVertical size={17} />
                    </button>

                    {openMenuId === plan.id && (
                      <div
                        ref={menuRef} // <-- attach ref
                        className="absolute left-[-15px] top-8 z-20 w-28 bg-white rounded-md shadow-md"
                      >
                        <button
                          className="flex items-center gap-2 px-3 py-1 w-full hover:bg-gray-100 border-b border-gray-200"
                          onClick={() => {
                            setSelectedPlan(plan.id);
                            setShowViewModal(true);
                            setOpenMenuId(null);
                          }}
                        >
                          <HiOutlineEye className="text-blue-600 h-4 w-4" />{" "}
                          View
                        </button>

                        <button
                          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100 border-b border-gray-200"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowModal(true);
                            setOpenMenuId(null);
                          }}
                        >
                          <HiOutlinePencil className="text-gray-600 h-4 w-4" />{" "}
                          Edit
                        </button>

                        <button
                          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100"
                          onClick={() => handleDelete(plan.id)}
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
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  No plans found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-2 px-4 py-2 text-gray-600 text-sm border-t border-gray-200 bg-gray-50 flex-wrap gap-2">
          <div>
            Showing {(page - 1) * limit + 1} to{" "}
            {Math.min(page * limit, filteredPlans.length)} of{" "}
            {filteredPlans.length} entries
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Previous */}
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>

            {/* Page Numbers */}
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

            {/* Next */}
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

      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowFilter(false)}
          />

          <div className="relative w-[360px] bg-white rounded-[8px] px-6 py-6 shadow-lg border border-[#C4C4C4]">
            <div className="text-center mb-6 relative">
              <h2 className="text-lg text-gray-600 font-sm">Filter</h2>
              <button
                onClick={() => setShowFilter(false)}
                className="absolute right-0 top-0 text-gray-400 text-xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6 relative">
              <label className="block text-sm text-gray-500 mb-2">Plans</label>
              <div
                onClick={() => setFilterOpen(!filterOpen)}
                className="w-full bg-white text-gray-400 text-sm border border-gray-300 px-4 py-2 rounded-full cursor-pointer flex items-center justify-between"
              >
                <span>{filterPlan || "Select plan"}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    filterOpen ? "rotate-180" : ""
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

              {filterOpen && (
                <div className="absolute z-20 mt-2 w-full bg-white border border-gray-300 rounded-xl shadow-md overflow-hidden">
                  {planNames.length ? (
                    planNames.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => {
                          setFilterPlan(plan.name);
                          setFilterOpen(false);
                          setPage(1);
                        }}
                        className="px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                      >
                        {plan.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No plans available
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setFilterPlan(""); // Clear filter
                  setShowFilter(false);
                  setPage(1);
                }}
                className="h-[30px] px-6 border border-gray-300 rounded-[6px] text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={() => setShowFilter(false)}
                className="w-[100px] h-[30px] bg-[#0673F0] hover:bg-[#056de3] text-white rounded-[6px] text-sm font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreatePlanModal
        show={showModal}
        plan={selectedPlan}
        onClose={() => {
          setShowModal(false);
          setSelectedPlan(null);
        }}
        onSaved={() => {
          fetchPlans();
          toast.success("Plan saved successfully");
        }}
      />

      {showViewModal && (
        <ViewPlanModal
          planId={selectedPlan}
          onClose={() => setShowViewModal(false)}
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
