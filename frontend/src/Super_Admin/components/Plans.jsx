import { useState, useRef, useEffect } from "react";
import { HiOutlineEye, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";
import CreatePlanModal from "./CreatePlanModal";

const plansData = [
  { id: 1, plan: "Starter" },
  { id: 2, plan: "Advanced" },
  { id: 3, plan: "Enterprise" },
];

export default function Plans() {
  const [data] = useState(plansData);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const searchRef = useRef(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filterPlan, setFilterPlan] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const limit = 2; // items per page
  const totalPages = Math.ceil(
    data.filter((plan) =>
      plan.plan.toLowerCase().includes(searchText.toLowerCase())
    ).length / limit
  );

  // Highlight matched search text
  const highlightMatch = (text, query) => {
    if (!query) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <span key={idx} className="bg-yellow-200 px-1 rounded">
          {part}
        </span>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  // Filtered and paginated data
  const filteredData = data
    .filter((plan) =>
      plan.plan.toLowerCase().includes(searchText.toLowerCase())
    )
    .slice((page - 1) * limit, page * limit);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchText(""); // clear search
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="text-gray-600 mb-4">Dashboard • Plans</div>

      {/* Header with Search, Filter, Create */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg text-gray-500">Plans</h2>

        <div className="flex gap-4 items-center">
          {/* Search Field */}
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              placeholder="Search"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1); // reset page on search
              }}
              className={`pl-10 pr-4 py-1 w-full max-w-xs text-sm text-gray-700 rounded-md border
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
            className="px-3 py-0.5 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-100"
          >
            Filter
          </button>

          {/* Create Button */}
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-0.5 bg-[#3B82F6] text-white rounded-md hover:bg-[#1b6ff6]"
          >
            + Create
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#D4E5FF] text-left text-gray-500 text-sm">
            <tr>
              <th className="px-4 py-3 text-left">Sr. no.</th>
              <th className="px-4 py-3 text-left">Plan Name</th>
              <th className="px-4 py-3 text-left">Days</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Size</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody className="text-gray-700">
            {filteredData.length > 0 ? (
              filteredData.map((plan, idx) => (
                <tr
                  key={plan.id}
                  className={idx % 2 === 1 ? "bg-gray-100" : ""}
                >
                  <td className="px-4 py-3">{(page - 1) * limit + idx + 1}</td>
                  <td className="px-4 py-3">
                    {highlightMatch(plan.plan, searchText)}
                  </td>
                  <td className="px-4 py-3">30</td>
                  <td className="px-4 py-3">₹12,000</td>
                  <td className="px-4 py-3">60</td>

                  {/* Action Menu */}
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
                      <div className="absolute right-2 top-8 z-20 w-32 bg-white rounded-md shadow-md">
                        <button className="flex items-center gap-2 px-3 py-1 w-full hover:bg-gray-100 border-b border-gray-200">
                          <HiOutlineEye className="text-blue-600 h-4 w-4" />{" "}
                          View
                        </button>

                        <button className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100 border-b border-gray-200">
                          <HiOutlinePencil className="text-gray-600 h-4 w-4" />{" "}
                          Edit
                        </button>

                        <button className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100">
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
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 p-4 text-gray-600 text-sm">
            <div>
              Showing {(page - 1) * limit + 1} to{" "}
              {(page - 1) * limit + filteredData.length} of{" "}
              {
                data.filter((plan) =>
                  plan.plan.toLowerCase().includes(searchText.toLowerCase())
                ).length
              }{" "}
              entries
            </div>
            <div className="flex gap-6">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border  border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 ${
                    page === i + 1
                      ? "bg-gray-100 text-gray-600 border-gray-100"
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
        )}
      </div>

      <CreatePlanModal show={showModal} onClose={() => setShowModal(false)} />
      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowFilter(false)}
          />

          {/* Card */}
          <div className="relative w-[360px] bg-white rounded-2xl px-6 py-6 shadow-lg">
            {/* Header */}
            <div className="text-center mb-6 relative">
              <h2 className="text-lg text-gray-600 font-medium">
                Filter Plans
              </h2>
              <button
                onClick={() => setShowFilter(false)}
                className="absolute right-0 top-0 text-gray-400 text-xl"
              >
                ×
              </button>
            </div>

            {/* Dropdown */}
            <div className="mb-6">
              <label className="block text-sm text-gray-500 mb-2">Plans</label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full bg-white text-gray-700 text-sm border border-gray-300 px-3 py-2 rounded-md outline-none"
              >
                <option value="">Select plan</option>
                <option value="Starter">Starter</option>
                <option value="Advanced">Advanced</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            {/* Apply button */}
            <button
              onClick={() => setShowFilter(false)}
              className="w-[100px] h-[30px] bg-blue-400 text-white rounded-xl text-sm font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
