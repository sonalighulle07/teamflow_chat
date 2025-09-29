function getInitials(name) {
  const parts = name?.split(" ") || [];
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

export default function UserList({
  users = [],
  onSelectUser,
  searchQuery = "",
}) {
  if (users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 font-medium">
        No users yet 👥
      </div>
    );
  }

  const highlightMatch = (username) => {
    if (!searchQuery) return username;
    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = username.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <span key={idx} className="bg-yellow-200 text-black px-1 rounded">
          {part}
        </span>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  const handleSelect = (user) => onSelectUser(user);

  return (
    <ul className="flex flex-col h-full overflow-y-auto overflow-x-hidden bg-slate-200 w-full">
      {users.map((user) => {
        const isSelected = user.isSelected;

        return (
          <li
            key={user.id}
            onClick={() => handleSelect(user)}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition mb-1
              ${
                isSelected
                  ? "bg-white shadow-md"
                  : "hover:bg-white hover:shadow"
              }`}
          >
            <div
              className={`w-10 h-10 text-center pt-2 rounded-full flex-shrink-0 items-center justify-center font-semibold text-sm text-white overflow-hidden relative
                ${
                  isSelected
                    ? "bg-green-600 shadow-md"
                    : "bg-gradient-to-r from-blue-700 to-blue-500"
                }`}
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

              {user.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
              )}
            </div>

            <div className="flex flex-col truncate">
              <span className="text-gray-900 font-medium truncate">
                {highlightMatch(user.username)}
              </span>
              {user.status && (
                <span className="text-xs text-gray-500 truncate">
                  {user.status}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
