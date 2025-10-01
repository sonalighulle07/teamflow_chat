function getInitials(name) {
  const parts = name?.split(" ") || [];
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

export default function UserList({
  users = [],
  teams = [],
  onSelectUser,
  searchQuery = "",
  selectedUser,
}) {
  if (users.length === 0 && teams.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 font-medium">
        No users or teams yet 👥
      </div>
    );
  }

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
  const displayedItems = [
    ...users.map((u) => ({ ...u, type: "user" })),
    ...teams.map((t) => ({ ...t, type: "team" })),
  ];

  // Sort: selected item on top
  displayedItems.sort((a, b) => {
    if (selectedUser?.id === a.id) return -1;
    if (selectedUser?.id === b.id) return 1;
    return 0;
  });

  return (
    <ul className="flex flex-col h-full overflow-y-auto overflow-x-hidden bg-slate-200 w-full">
      {displayedItems.map((item) => {
        const isSelected = selectedUser?.id === item.id;
        return (
          <li
            key={item.type + item.id}
            onClick={() => handleSelect(item)}
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
                  item.type === "team"
                    ? isSelected
                      ? "bg-green-600"
                      : "bg-purple-600"
                    : isSelected
                    ? "bg-green-600"
                    : "bg-gradient-to-r from-blue-700 to-blue-500"
                }`}
            >
              {
                item.type === "user" ? (
                  item.profile_image ? (
                    <img
                      src={`http://localhost:3000${item.profile_image}`}
                      alt={item.username}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    getInitials(item.username)
                  )
                ) : (
                  item.name
                ) // team name
              }
            </div>

            <div className="flex flex-col truncate">
              <span className="text-gray-900 font-medium truncate">
                {item.type === "user"
                  ? highlightMatch(item.username)
                  : highlightMatch(item.name)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
