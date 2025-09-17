import React from 'react';
import UserList from "./UserList";

export default function Sidebar({ users, selectedUser, onSelectUser }) {
  return (
    <aside className="w-64 bg-gray-100 border-r flex flex-col">
      <h2 className="p-4 font-bold text-lg border-b">Users</h2>

      {/* Search */}
      <div className="px-4 py-2">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <UserList
        users={users}
        selectedUser={selectedUser}
        onSelectUser={onSelectUser}
      />
    </aside>
  );
}
