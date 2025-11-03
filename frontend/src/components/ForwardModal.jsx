import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

export default function ForwardModal({
  open,
  onClose,
  message,
  onForward,
  currentUserId,
}) {
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const { userList } = useSelector((state) => state.user);

  useEffect(() => {
    if (!open) setSelectedUserIds([]);
  }, [open]);

  if (!open) return null;

  const handleUserToggle = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleForwardClick = () => {
    if (!message?.id && !message?._id) return;
    if (!selectedUserIds.length) return;

    const messageId = message.id || message._id;
    onForward(messageId, selectedUserIds, currentUserId);
    onClose();
  };

  return (
    <div className="absolute bottom-[200px] left-[50%] transform -translate-x-1/2 w-96 bg-white rounded-xl shadow-lg p-4 border border-gray-200 z-50 animate-slide-up">
      <h2 className="text-lg font-semibold mb-3 text-purple-700">
        Forward Message
      </h2>

      <div className="max-h-60 overflow-y-auto mb-4">
        {userList.map((u) => (
          <label
            key={u.id}
            className="flex items-center gap-2 mb-2 cursor-pointer px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedUserIds.includes(u.id)}
              onChange={() => handleUserToggle(u.id)}
              className="w-4 h-4 accent-purple-600"
            />
            <span className="text-gray-800">{u.username}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleForwardClick}
          className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 transition"
        >
          Forward
        </button>
      </div>
    </div>
  );
}
