// -------------------- UserList.jsx --------------------
function getInitials(name) {
  const parts = name.split(" ");
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

export default function UserList({ users = [], selectedUser, onSelectUser }) {
  if (users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 font-medium">
        No users yet 👥
      </div>
    );
  }

  return (
    <ul className="flex flex-col h-full overflow-y-auto px-4 py-4">
      {users.map((user) => (
        <li
          key={user.id}
          onClick={() => onSelectUser(user)}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition mb-2
            ${
              selectedUser?.id === user.id
                ? "bg-white shadow-md"
                : "bg-gray-200 hover:bg-white hover:shadow"
            }`}
        >
          {/* Avatar */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm text-white 
              ${
                selectedUser?.id === user.id
                  ? "bg-green-600 shadow-md"
                  : "bg-gradient-to-r from-blue-900 to-blue-600"
              }`}
          >
            {getInitials(user.username)}
          </div>

          {/* Name */}
          <span className="text-gray-800 font-medium">{user.username}</span>

          {/* Example unread badge */}
          <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            2
          </span>
        </li>
      ))}
    </ul>
  );
}
