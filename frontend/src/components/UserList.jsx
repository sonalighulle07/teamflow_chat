import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  memo,
  forwardRef,
} from "react";

// API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Utility to get initials
function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

// Memoized UserItem with forwardRef
const UserItem = memo(
  forwardRef(({ item, isSelected, onClick, searchQuery, lastMessage }, ref) => {
    const name = item.type === "user" ? item.username || "" : item.name || "";

    // Highlight search matches
    const highlightMatch = (text) => {
      if (!searchQuery) return text;
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      const parts = text.split(regex);
      return parts.map((part, idx) =>
        regex.test(part) ? (
          <span key={idx} className="bg-yellow-300 text-black px-1 rounded">
            {part}
          </span>
        ) : (
          <span key={idx}>{part}</span>
        )
      );
    };

    const hasActivity = item.recentActivity && !item.recentActivity.read_status;

    // Format last message date with fallback
    const formatLastMessageDate = (date, fallbackDate = new Date()) => {
      const d = date ? new Date(date) : new Date(fallbackDate);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    // Use lastMessage or fallback to item.created_at or today
    const lastMessageDate = formatLastMessageDate(lastMessage, item.created_at);

    return (
      <li
        ref={ref}
        onClick={() => onClick(item)}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 mb-1 text-gray-400 text-[14px]
          ${isSelected ? "bg-white shadow-md" : "hover:bg-white hover:shadow"}`}
      >
        {/* Avatar */}
        <div
          className={`w-9 h-9 text-center rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white overflow-hidden relative ${
            isSelected
              ? "bg-green-600 text-[11px]"
              : item.type === "user"
              ? "bg-gradient-to-r from-purple-700 to-purple-500 text-[12px]"
              : "bg-purple-600"
          }`}
        >
          {item.type === "user" && item.profile_image ? (
            <img
              src={
                item.profile_image.startsWith("http")
                  ? item.profile_image
                  : `${API_URL}${item.profile_image}`
              }
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

        {/* Name + last message date */}
        <div className="flex flex-col truncate">
          <span className="text-gray-600 font-[10px]">
            {highlightMatch(name)}
          </span>
          {lastMessageDate && (
            <span className="text-xs text-gray-500 truncate">
              {lastMessageDate}
            </span>
          )}
        </div>
      </li>
    );
  })
);

export default function UserList({
  users = [],
  teams = [],
  onSelectUser,
  onSelectTeam,
  searchQuery = "",
  selectedUser,
  selectedTeam, // ✅ Added selectedTeam
  lastMessages = {},
}) {
  const listRef = useRef(null);
  const itemRefs = useRef({});

  const handleSelect = (item) => {
    if (item.type === "user") onSelectUser(item);
    else if (item.type === "team" && onSelectTeam) onSelectTeam(item);
  };

  // Merge and sort users/teams by last message date
  const displayedItems = useMemo(() => {
    const allUsers = users.map((u) => ({ ...u, type: "user" }));
    const allTeams = teams.map((t) => ({ ...t, type: "team" }));

    const sortedUsers = allUsers.sort((a, b) => {
      const aTime = lastMessages[a.id]
        ? new Date(lastMessages[a.id]).getTime()
        : a.created_at
        ? new Date(a.created_at).getTime()
        : 0;
      const bTime = lastMessages[b.id]
        ? new Date(lastMessages[b.id]).getTime()
        : b.created_at
        ? new Date(b.created_at).getTime()
        : 0;
      return bTime - aTime;
    });

    return [...sortedUsers, ...allTeams];
  }, [users, teams, lastMessages]);

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

  if (!displayedItems.length) {
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
        let isSelected = false;
        if (item.type === "user") isSelected = selectedUser?.id === item.id;
        else if (item.type === "team")
          isSelected = selectedTeam?.id === item.id;

        const key = item.type === "user" ? item.id : `team-${item.id}`;
        const lastMessage = lastMessages[item.id] || null;

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
            lastMessage={lastMessage}
          />
        );
      })}
    </ul>
  );
}
