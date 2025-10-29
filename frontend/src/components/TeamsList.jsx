import React from "react";

export default function TeamsList({ teams = [], onSelectTeam }) {
  if (!teams.length) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center">
        No communities found.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {teams.map((team) => (
        <li
          key={team.id}
          onClick={() => onSelectTeam(team)}
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-100 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {team.icon ? (
              <img
                src={team.icon}
                alt={team.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-semibold text-gray-600">
                {team.name[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{team.name}</p>
              {team.lastMessage ? (
                <p className="text-sm text-gray-500 truncate w-40">
                  {team.lastMessage.text}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">No messages yet</p>
              )}
            </div>
          </div>
          {team.lastMessage?.createdAt && (
            <span className="text-xs text-gray-400">
              {new Date(team.lastMessage.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
