import { Phone, Video } from "lucide-react";

export default function Header({ selectedUser }) {
  if (!selectedUser) return null;

  return (
    <div className="p-4 border-b flex items-center justify-between bg-white shadow">
      {/* Left: Avatar + Name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold">
          {selectedUser.username[0]}
        </div>
        <h2 className="font-semibold text-lg">{selectedUser.username}</h2>
      </div>

      {/* Right: Call Buttons */}
      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-purple-600 transition"
          title="Audio Call"
        >
          <Phone size={20} />
        </button>
        <button
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-purple-600 transition"
          title="Video Call"
        >
          <Video size={20} />
        </button>
      </div>
    </div>
  );
}
