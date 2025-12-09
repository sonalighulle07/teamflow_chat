import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import OrganizationsList from "./OrganizationsList";
import AdminUsersList from "./AdminUsersList";
import OrgCreateModal from "./OrgCreateModal";
import AdminCreateModal from "./AdminCreateModal";

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState("organizations");
  const [query, setQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editOrg, setEditOrg] = useState(null);

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-purple-100 p-6 transition-all">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-white backdrop-blur-md border border-gray-200 rounded-2xl p-5  flex items-center justify-between transition-all">
          {/* Left Title */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-600 tracking-tight">
              Super Admin Panel
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage organizations & admins
            </p>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search organizations or users..."
                className="pl-12 pr-2 py-1 w-72 rounded-xl
                   bg-gray-50 border border-gray-300
                   shadow-sm text-gray-700 text-[15px]
                   focus:ring-2 focus:ring-indigo-500 focus:outline-none
                   transition-all"
              />

              <span className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z"
                  />
                </svg>
              </span>
            </div>

            {/* Create Buttons */}
            {tab === "organizations" && (
              <button
                onClick={() => {
                  setEditOrg(null);
                  setShowOrgModal(true);
                }}
                className="px-4 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 
                   text-white shadow-sm transition-all"
              >
                + Create
              </button>
            )}

            {tab === "users" && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 
                   text-white shadow-sm transition-all"
              >
                + Add
              </button>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1 rounded-xl 
                 bg-red-500 hover:bg-red-600 text-white  shadow 
                 transition-all duration-200 active:scale-95"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              Logout
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-4 border-gray-300 pb-2">
          {["organizations", "users"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2 text-[15px] font-semibold transition ${
                tab === t ? "text-blue-600" : "text-gray-600"
              }`}
            >
              {t === "organizations" ? "Organizations" : "Admins"}

              {tab === t && (
                <motion.div
                  layoutId="underline"
                  className="absolute left-0 right-0 -bottom-[2px] h-[3px] bg-blue-600 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* CONTENT CARD */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-xl border border-gray-300 p-6 "
        >
          {tab === "organizations" ? (
            <OrganizationsList
              q={query}
              page={page}
              perPage={perPage}
              setPage={setPage}
              setPerPage={setPerPage}
              onEdit={(org) => {
                setEditOrg(org);
                setShowOrgModal(true);
              }}
            />
          ) : (
            <AdminUsersList
              q={query}
              page={page}
              perPage={perPage}
              setPage={setPage}
              setPerPage={setPerPage}
            />
          )}
        </motion.div>

        {/* MODALS */}
        <OrgCreateModal
          open={showOrgModal}
          onClose={() => {
            setShowOrgModal(false);
            setEditOrg(null);
          }}
          editData={editOrg}
        />

        <AdminCreateModal
          open={showAdminModal}
          onClose={() => setShowAdminModal(false)}
        />
      </div>
    </div>
  );
}
