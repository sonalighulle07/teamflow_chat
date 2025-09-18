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
    <ul className="flex flex-col h-full overflow-y-auto bg-gray-200  p-2">
      {users.map((user) => {
        const isSelected = selectedUser?.id === user.id;

        return (
          <li
            key={user.id}
            onClick={() => onSelectUser(user)}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition mb-1
              ${isSelected ? "bg-white shadow-md" : "hover:bg-white hover:shadow"}
            `}
          >
            {/* Avatar */}
            <div
              className={`w-10 h-10 text-center pt-2 rounded-full flex-shrink-0 items-center justify-center font-semibold text-sm text-white overflow-hidden relative
                ${isSelected ? "bg-green-600 shadow-md" : "bg-gradient-to-r from-blue-700 to-blue-500"}
              `}
            >
              {user.profile_image ? (
                <img
                  src={`http://localhost:3000${user.profile_image}`}
                  alt={user.username}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                getInitials(user.username)
              )}

              {/* Online indicator */}
              {user.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3  bg-green-400 border-2 border-white rounded-full" />
              )}
            </div>

            {/* Name & status */}
            <div className="flex flex-col truncate">
              <span className={`text-gray-900 font-medium truncate`}>
                {user.username}
              </span>
              {user.status && (
                <span className="text-xs text-gray-500 truncate">{user.status}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
