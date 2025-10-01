import React, { memo, useMemo } from "react";

function getInitials(name) {
  const parts = name?.split(" ") || [];
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

const UserItem = memo(
  ({ user, isSelected, onClick }) => (
    <li
      onClick={() => onClick(user)}
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 mb-1
        ${isSelected ? "bg-white shadow-md" : "hover:bg-white hover:shadow"}`}
    >
      <div
        className={`w-10 h-10 text-center pt-2 rounded-full flex-shrink-0 items-center justify-center font-semibold text-sm text-white overflow-hidden relative
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

export default function UserList({ users, selectedUser, onSelectUser }) {
  if (!users || users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 font-medium">
        No users yet 👥
      </div>
    );
  }

  const orderedUsers = useMemo(() => {
    if (!selectedUser) return users;
    const otherUsers = users.filter((u) => u.id !== selectedUser.id);
    return [selectedUser, ...otherUsers];
  }, [users, selectedUser]);

  return (
    <ul className="flex flex-col h-full overflow-y-auto overflow-x-hidden bg-slate-200 w-full">
      {orderedUsers.map((user) => (
        <UserItem
          key={user.id}
          user={user}
          isSelected={selectedUser?.id === user.id}
          onClick={onSelectUser}
        />
      ))}
    </ul>
  );
}

