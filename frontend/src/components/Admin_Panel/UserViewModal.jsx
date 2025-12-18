export default function UserViewModal({ user, onClose }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">User Details</h3>
          <button
            className="px-2 py-1 text-gray-500 hover:text-gray-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <p><b>Full Name:</b> {user.full_name}</p>
          <p><b>Email:</b> {user.email}</p>
          <p><b>Username:</b> {user.username}</p>
          <p><b>Contact:</b> {user.contact}</p>
          <p><b>Role:</b> {user.role}</p>
          <p><b>Organization ID:</b> {user.organization_id}</p>
        </div>

        {user.profile_image && (
          <img
            src={user.profile_image}
            alt="profile"
            className="mt-4 h-24 w-24 rounded-full object-cover"
          />
        )}

        <div className="mt-5 text-right">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
