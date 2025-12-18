import React from 'react';
import { URL } from "../../config";

export default function AdminViewModal({ user, onClose }) {
  if (!user) return null; // Prevent rendering if user is undefined

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Admin Details</h3>
          <button
            className="px-2 py-1 text-gray-600 hover:text-black rounded"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <p><b>Full Name:</b> {user?.full_name}</p>
          <p><b>Email:</b> {user?.email}</p>
          <p><b>Username:</b> {user?.username}</p>
          <p><b>Contact:</b> {user?.contact}</p>
        </div>

        {user?.profile_image && (
          <img
            src={user.profile_image}
            alt="profile"
            className="mt-4 h-24 w-24 rounded-full object-cover"
          />
        )}

        <div className="mt-5 text-right">
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
