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
// Utility to get initials with capital letters
// Utility to get initials with capital letters
function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  const first = parts[0] ? parts[0][0].toUpperCase() : "";
  const second = parts[1] ? parts[1][0].toUpperCase() : "";
  return first + second;
}

// Memoized UserItem with forwardRef
const UserItem = memo(
  forwardRef(({ item, isSelected, onClick, searchQuery, lastMessage }, ref) => {
    const name =
      item.type === "user"
        ? capitalizeName(item.full_name || "")
        : capitalizeName(item.name || "");

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

    // Capitalize first letter of each word (first + last name)
    function capitalizeName(name) {
      if (!name) return "";
      return name
        .split(" ")
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join(" ");
    }

    // Only format date if lastMessage exists (day-month only)
    const lastMessageDate =
      lastMessage && !isNaN(new Date(lastMessage).getTime())
        ? new Date(lastMessage).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })
        : null;

    return (
      <li
        ref={ref}
        onClick={() => onClick(item)}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 mb-1 text-gray-400 text-[14px]
          ${isSelected ? "bg-white shadow-md" : "hover:bg-white hover:shadow"}`}
      >
        {/* Avatar Wrapper */}
        <div className="relative w-9 h-9 flex-shrink-0">
          {item.type === "user" && (
            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow">
              {/* ONLINE */}
              {item.status === "online" && (
                <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="white"
                    className="w-2 h-2"
                  >
                    <path d="M20.285 6.708l-11.01 11.01-5.56-5.56 1.414-1.415 4.146 4.147 9.596-9.596z" />
                  </svg>
                </div>
              )}
              {/* IN CALL */}
              {item.status === "inCall" && (
                <div className="w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="white"
                    className="w-2 h-2"
                  >
                    <path d="M6.62 10.79a15.054 15.054 0 006.59 6.59l2.2-2.2a1 1 0 011-.24 11.72 11.72 0 003.68.59 1 1 0 011 1V21a1 1 0 01-1 1A18 18 0 013 6a1 1 0 011-1h3.37a1 1 0 011 1 11.72 11.72 0 00.59 3.68 1 1 0 01-.24 1z" />
                  </svg>
                </div>
              )}
              {/* OFFLINE */}
              {item.status === "offline" && (
                <div className="w-3 h-3 bg-gray-500 rounded-full flex items-center justify-center ">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="white"
                    className="w-2 h-2"
                  >
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="white"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Avatar */}
          <div
            className={`w-full h-full rounded-full flex items-center justify-center text-white font-semibold overflow-hidden
  ${
    isSelected || item.type === "user"
      ? "bg-[#735DD0] text-[14px]"
      : "bg-[#735DD0]"
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
          </div>
        </div>

        {/* Name + last message */}
        <div className="flex flex-col truncate">
          <span className="text-gray-600 font-[10px]">
            {highlightMatch(name)}
          </span>

          {/* Only show date if available */}
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
  selectedTeam,
  lastMessages = {},
  currentUser,
}) {
  const listRef = useRef(null);
  const itemRefs = useRef({});

  const handleSelect = (item) => {
    if (item.type === "user") onSelectUser(item);
    else if (item.type === "team" && onSelectTeam) onSelectTeam(item);
  };

  // Merge and sort users/teams by last message date
  const displayedItems = useMemo(() => {
    const allUsers = users
      .filter((u) => u.id !== currentUser?.id) // exclude logged-in user
      .map((u) => ({ ...u, type: "user" }));

    const allTeams = teams.map((t) => ({ ...t, type: "team" }));

    const allItems = [...allUsers, ...allTeams];

    return allItems.sort((a, b) => {
      const aTime = lastMessages[a.id]
        ? new Date(lastMessages[a.id]).getTime()
        : null;

      const bTime = lastMessages[b.id]
        ? new Date(lastMessages[b.id]).getTime()
        : null;

      if (aTime === null && bTime === null) return 0;
      if (aTime === null) return 1; // a neeche
      if (bTime === null) return -1; // b neeche

      return bTime - aTime;
    });
  }, [users, teams, lastMessages, currentUser]);

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
      className="flex flex-col h-full overflow-y-auto overflow-x-hidden bg-slate-200 w-full "
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
