import React, { memo, useMemo, useCallback, useRef, useEffect } from "react";

function getInitials(name) {
  const parts = name?.split(" ") || [];
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

// Memoized single user item
const UserItem = memo(({ user, isSelected, onClick }) => (
  <li
    onClick={() => onClick(user)}
    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 mb-1
      ${isSelected ? "bg-white shadow-md" : "hover:bg-white hover:shadow"}`}
  >
    <div
      className={`w-10 h-10 text-center pt-2 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-sm text-white overflow-hidden relative
        transition-colors duration-150
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
        {user.username}
      </span>
      {user.status && (
        <span className="text-xs text-gray-500 truncate">{user.status}</span>
      )}
    </div>

</li>
));

export default function UserList({
  users = [],
  teams = [],
  onSelectUser,
  searchQuery = "",
  selectedUser,
}) {
  const listRef = useRef(null);
  const itemRefs = useRef({});

  // Highlight search match
  const highlightMatch = useCallback(
    (name) => {
      if (!searchQuery) return name;
      const regex = new RegExp(`(${searchQuery})`, "gi");
      const parts = name.split(regex);
      return parts.map((part, idx) =>
        regex.test(part) ? (
          <span key={idx} className="bg-sky-300 text-black px-1 rounded">
            {part}
          </span>
        ) : (
          <span key={idx}>{part}</span>
        )
      );
    },
    [searchQuery]
  );

  const handleSelect = (item) => onSelectUser(item);

  // Merge users and teams
  const displayedItems = useMemo(() => {
    const allItems = [
      ...users.map((u) => ({ ...u, type: "user" })),
      ...teams.map((t) => ({ ...t, type: "team" })),
    ];

    if (selectedUser) {
      const selectedItem = allItems.find((i) => i.id === selectedUser.id);
      return [
        selectedItem ? selectedItem : null,
        ...allItems.filter((i) => i.id !== selectedUser.id),
      ].filter(Boolean);

}
    return allItems;
  }, [users, teams, selectedUser]);

  // Scroll to first match
  useEffect(() => {
    if (!searchQuery) return;
    const firstMatchId = displayedItems.find(
      (item) =>
        item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )?.id;

    if (firstMatchId && itemRefs.current[firstMatchId]) {
      itemRefs.current[firstMatchId].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [searchQuery, displayedItems]);

  // ✅ Safe return after hooks
  if (displayedItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 font-medium">
        No users or teams yet 👥
      </div>
    );
  }

  return (
    <ul
      className="flex flex-col h-full overflow-y-auto overflow-x-hidden bg-slate-200 w-full"
      ref={listRef}
    >
      {displayedItems.map((item) => {
        const isSelected = selectedUser?.id === item.id;
        const key = item.type === "user" ? item.id : `team-${item.id}`;
        return (
          <li
            key={key}
            ref={(el) => (itemRefs.current[item.id] = el)}
            onClick={() => handleSelect(item)}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 mb-1 ${
              isSelected ? "bg-white shadow-md" : "hover:bg-white hover:shadow"
            }`}
          >

<div
              className={`w-10 h-10 text-center pt-1 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-[15px] text-white overflow-hidden ${
                isSelected
                  ? "bg-green-600 texr-[15px]"
                  : item.type === "user"
                  ? "bg-gradient-to-r from-blue-700 to-blue-500"
                  : "bg-purple-600"
              }`}
            >
              {item.type === "user"
                ? getInitials(item.username)
                : item.name
                ? item.name[0].toUpperCase()
                : "?"}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-gray-900 font-medium truncate">
                {item.type === "user"
                  ? highlightMatch(item.username)
                  : highlightMatch(item.name || "")}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

