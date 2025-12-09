import { FiUser, FiMail, FiPhone, FiBriefcase, FiX } from "react-icons/fi";

function AdminViewModal({ admin, onClose }) {
  if (!admin) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">

      <div
        className="relative w-[420px] p-7 rounded-2xl bg-white 
        shadow-[0_8px_30px_rgba(0,0,0,0.12)] 
        border border-gray-200"
      >

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-gray-500 hover:text-gray-800 transition text-xl"
        >
          <FiX />
        </button>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-5">
          Admin Details
        </h2>

        {/* Content */}
        <div className="space-y-4">

          {/* Row */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <FiUser className="text-blue-600 text-xl" />
            <div>
              <p className="text-xs text-gray-500">Full Name</p>
              <p className="text-gray-900 font-medium">{admin.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <FiMail className="text-indigo-600 text-xl" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-gray-800">{admin.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <FiPhone className="text-green-600 text-xl" />
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-gray-800">{admin.phone || "Not Available"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <FiBriefcase className="text-yellow-600 text-xl" />
            <div>
              <p className="text-xs text-gray-500">Organization</p>
              <p className="text-gray-900 font-medium">
                {admin.organization_name || "—"}
              </p>
            </div>
          </div>

        </div>

        {/* Footer Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 mt-6 rounded-lg font-medium 
          bg-blue-600 text-white hover:bg-blue-700 
          transition shadow-sm"
        >
          Close
        </button>

      </div>
    </div>
  );
}

export default AdminViewModal;
