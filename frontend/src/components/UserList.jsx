import React, { memo, useMemo, useRef, useEffect } from "react";
 
// Utility to get initials
function getInitials(name) {
  if (!name) return "";
  const parts = name.split(" ");
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}
 
// Memoized UserItem component
const UserItem = memo(({ item, isSelected, onClick, searchQuery }) => {
  const name = item.type === "user" ? item.username || "" : item.name || "";
 
  // Highlight search match
  const highlightMatch = (text) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <span key={idx} className="bg-sky-300 text-black px-1 rounded">
          {part}
        </span>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };
 
  const hasActivity = item.recentActivity && !item.recentActivity.read_status;
 
  return (
    <li
      onClick={() => onClick(item)}
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 mb-1
        ${isSelected ? "bg-white shadow-md" : "hover:bg-white hover:shadow"}`}
    >
      <div
        className={`w-10 h-10 text-center rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white overflow-hidden relative ${
          isSelected
            ? "bg-green-600"
            : item.type === "user"
            ? "bg-gradient-to-r from-purple-700 to-purple-500"
            : "bg-purple-600"
        }`}
      >
        {item.type === "user" && item.profile_image ? (
          <img
            src={`http://localhost:3000${item.profile_image}`}
            alt={item.username || "User"}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          getInitials(name)
        )}
        {hasActivity && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>
        )}
      </div>
 
      <div className="flex flex-col truncate">
        <span className="text-gray-900 font-medium truncate">
          {highlightMatch(name)}
        </span>
        {item.status && (
          <span className="text-xs text-gray-500 truncate">{item.status}</span>
        )}
      </div>
    </li>
  );
});
 
export default function UserList({
  users = [],
  teams = [],
  onSelectUser,
  searchQuery = "",
  selectedUser,
}) {
  const listRef = useRef(null);
  const itemRefs = useRef({});
 
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
 
    return allItems; // Ensure always an array
  }, [users, teams, selectedUser]);
 
  // Scroll to first search match
  useEffect(() => {
    if (!searchQuery) return;
    const firstMatch = displayedItems.find(
      (item) =>
        item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (firstMatch && firstMatch.id && itemRefs.current[firstMatch.id]) {
      itemRefs.current[firstMatch.id].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [searchQuery, displayedItems]);
 
  if (!displayedItems || !displayedItems.length) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 font-medium">
        No users or teams found 👥
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
          <UserItem
            key={key}
            item={item}
            isSelected={isSelected}
            onClick={handleSelect}
            searchQuery={searchQuery}
            ref={(el) => {
              if (el && item.id) itemRefs.current[item.id] = el;
            }}
          />
        );
      })}
    </ul>
  );
}