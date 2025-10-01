import React, { memo, useMemo } from "react";

function getInitials(name) {
  const parts = name?.split(" ") || [];
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

// Memoized single user item
const UserItem = memo(
  ({ user, isSelected, onClick }) => (
    <li
      onClick={() => onClick(user)}
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 mb-1
        ${isSelected ? "bg-white shadow-md" : "hover:bg-white hover:shadow"}`}
    >
      <div
        className={`w-10 h-10 text-center pt-2 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-sm text-white overflow-hidden relative
          transition-colors duration-150
          ${isSelected ? "bg-green-600 shadow-md" : "bg-gradient-to-r from-blue-700 to-blue-500"}`}
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
        <span className="text-gray-900 font-medium truncate">{user.username}</span>
        {user.status && <span className="text-xs text-gray-500 truncate">{user.status}</span>}
      </div>
    </li>
  ),
  (prev, next) =>
    prev.user.id === next.user.id &&
    prev.isSelected === next.isSelected &&
    prev.user.username === next.user.username &&
    prev.user.status === next.user.status &&
    prev.user.profile_image === next.user.profile_image &&
    prev.user.isOnline === next.user.isOnline
);

export default function UserList({
  users = [],
  teams = [],
  onSelectUser,
  searchQuery = "",
  selectedUser,
}) {
  if ((!users || users.length === 0) && (!teams || teams.length === 0)) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 font-medium">
        No users or teams yet 👥
      </div>
    );
  }

  // Highlight search match
  const highlightMatch = (name) => {
    if (!searchQuery) return name;
    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = name.split(regex);
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

  const handleSelect = (item) => onSelectUser(item);

  // Merge users and teams
  const displayedItems = useMemo(() => {
    const allItems = [
      ...users.map((u) => ({ ...u, type: "user" })),
      ...teams.map((t) => ({ ...t, type: "team" })),
    ];
    // Move selected user/team to top
    allItems.sort((a, b) => {
      if (selectedUser?.id === a.id) return -1;
      if (selectedUser?.id === b.id) return 1;
      return 0;
    });
    return allItems;
  }, [users, teams, selectedUser]);

  return (
    <ul className="flex flex-col h-full overflow-y-auto overflow-x-hidden bg-slate-200 w-full">
      {displayedItems.map((item) => {
        const isSelected = selectedUser?.id === item.id;

        if (item.type === "user") {
          return (
            <UserItem
              key={item.id}
              user={item}
              isSelected={isSelected}
              onClick={handleSelect}
            />
          );
        }

        // Team item rendering
        return (
          <li
            key={`team-${item.id}`}
            onClick={() => handleSelect(item)}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition mb-1
              ${isSelected ? "bg-white shadow-md" : "hover:bg-white hover:shadow"}`}
          >
            <div
              className={`w-10 h-10 text-center pt-2 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-sm text-white overflow-hidden
                ${isSelected ? "bg-green-600" : "bg-purple-600"}`}
            >
              {item.name}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-gray-900 font-medium truncate">{highlightMatch(item.name)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
