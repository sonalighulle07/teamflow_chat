import { useEffect, useRef } from "react";

export default function UserViewModal({ user, onClose }) {
  const modalRef = useRef(null);

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Modal container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-7"
      >
        <h3 className="text-lg font-semibold text-gray-700 mb-5">
          User Details
        </h3>

        {/* User Details: side by side */}
        <div className="grid grid-cols-2 gap-2 mr-6 text-sm text-gray-600">
          <p>
            <span className="font-medium text-gray-700 ">Full Name:</span>{" "}
            {user.full_name}
          </p>
          <p>
            <span className="font-medium text-gray-700">Email:</span>{" "}
            {user.email}
          </p>
          <p>
            <span className="font-medium text-gray-700">Contact:</span>{" "}
            {user.contact || "-"}
          </p>
          <p>
            <span className="font-medium text-gray-700">Role:</span>{" "}
            {user.role || "-"}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-5 text-gray-400 hover:text-gray-600 text-[13px]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
