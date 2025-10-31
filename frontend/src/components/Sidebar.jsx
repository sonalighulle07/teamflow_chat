import React, { useState, useEffect, useMemo } from "react";
import {
  FaCommentDots,
  FaVideo,
  FaUsers,
  FaCalendar,
  FaBell,
  FaSearch,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "../Store/Features/Users/userSlice";
import { fetchUsers } from "../Store/Features/Users/userThunks";
import axios from "axios";
import UserList from "./UserList";
import { fetchTeams } from "../Store/Features/Teams/teamThunk";
import { URL } from "../config";
import { setActiveNav } from "../Store/Features/Users/userSlice";

export default function Sidebar({ setSelectedTeam,setShowModal }) {
  const dispatch = useDispatch();

  const { currentUser, userList, selectedUser, loading, error,activeNav } = useSelector(
    (state) => state.user
  );

  const { teamList, selectedTeam } = useSelector((state) => state.team);

  const { activities = [] } = useSelector((state) => state.activity || {});

  const [searchQuery, setSearchQuery] = useState("");
  const token = sessionStorage.getItem("chatToken");

  // ✅ Add state for selected team and members
  // const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);

  // Fetch users
  useEffect(() => {

    if(activeNav === "Chat") {
    if (!currentUser) return;
    dispatch(fetchUsers(currentUser.id));

    const interval = setInterval(() => {
      dispatch(fetchUsers(currentUser.id));
    }, 10000);

    return () => clearInterval(interval);
  }
  }, [dispatch, currentUser]);

  // Fetch teams when "Communities" is active
  useEffect(() => {
    if (activeNav === "Communities" && currentUser?.id) {
      const interval = setInterval(() => {
        dispatch(fetchTeams());
      }, 10000);

      return () => clearInterval(interval);
    } 
  }, [activeNav, currentUser, dispatch]);

  const handleSelectUser = (item) => {
    dispatch(setSelectedUser(item));
    setSearchQuery("");
  };

  // ✅ Add team click handler
  const handleSelectTeam = async (team) => {
    setSelectedTeam(team); // set clicked team

    if (!token) return;

    try {
      const res = await axios.get(`${URL}/api/teams/${team.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedTeamMembers(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
      console.error("Failed to fetch team members:", err);
      setSelectedTeamMembers([]);
    }
  };

  const orderedUsers = useMemo(() => {
    if (!userList) return [];

    const activeUserIds = activities.map((a) => a.user_id);

    const activeUsers = userList
      .filter((u) => activeUserIds.includes(u.id))
      .sort((a, b) => {
        const aTime = activities.find(
          (act) => act.user_id === a.id
        )?.created_at;
        const bTime = activities.find(
          (act) => act.user_id === b.id
        )?.created_at;
        return new Date(bTime) - new Date(aTime);
      });

    const otherUsers = userList.filter((u) => !activeUserIds.includes(u.id));

    const filteredOtherUsers = selectedUser
      ? otherUsers.filter((u) => u.id !== selectedUser.id)
      : otherUsers;

    return selectedUser
      ? [selectedUser, ...activeUsers, ...filteredOtherUsers]
      : [...activeUsers, ...filteredOtherUsers];
  }, [userList, activities, selectedUser]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return userList;
    return userList.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [userList, searchQuery]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teamList;
    return teamList.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teamList, searchQuery]);

  const navItems = [
    { icon: <FaCommentDots />, label: "Chat" },
    { icon: <FaVideo />, label: "Meet" },
    { icon: <FaUsers />, label: "Communities" },
    { icon: <FaCalendar />, label: "Calendar" },
    { icon: <FaBell />, label: "Activity" },
  ];

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar navigation */}
      <div className="flex flex-col justify-between w-20 min-w-[5rem] bg-slate-200 shadow-md px-4 py-6 flex-shrink-0 ">
        <div className="flex flex-col items-center gap-6">
          {navItems.map(({ icon, label }) => {
            const isActive = activeNav === label;
            return (
              <div
                key={label}
                className="group relative flex flex-col items-center cursor-pointer"
                onClick={() => dispatch(setActiveNav(label))}
              >
                <div
                  className={`text-xl transition-colors ${
                    isActive
                      ? "text-purple-500"
                      : "text-gray-500 group-hover:text-purple-600"
                  }`}
                >
                  {icon}
                </div>
                <span
                  className={`mt-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? "text-purple-600"
                      : "text-gray-600 group-hover:text-purple-600"
                  }`}
                >
                  {label}
                </span>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 rounded-lg bg-white text-gray-600 text-xs 
                font-medium whitespace-nowrap opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all 
                duration-300 pointer-events-none z-50">
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel */}
      {(activeNav === "Chat" || activeNav === "Communities") && (
        <div className="flex-1 bg-gray-100 border-l border-gray-300 flex flex-col overflow-hidden">
          {/* Search Input */}
          <div className="p-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${
                  activeNav === "Chat" ? "users" : "teams"
                }...`}
                className="w-full pl-10 pr-3 py-1.5 rounded bg-white border border-gray-300 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {activeNav === "Communities" && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-2 w-full bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                + Create Team
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {loading && activeNav === "Chat" && (
              <p className="p-4 text-sm text-gray-500">Loading users…</p>
            )}
            {error && <p className="p-4 text-sm text-red-500">{error}</p>}
            {!loading && !error && (
              <UserList
                users={activeNav === "Chat" ? filteredUsers : []}
                teams={activeNav === "Communities" ? filteredTeams : []}
                selectedUser={selectedUser}
                onSelectUser={handleSelectUser}
                onSelectTeam={handleSelectTeam} // ✅ pass to UserList
                searchQuery={searchQuery}
                setSelectedTeam={setSelectedTeam}
              />
            )}
            {!loading &&
              !error &&
              ((activeNav === "Chat" && filteredUsers.length === 0) ||
                (activeNav === "Communities" &&
                  filteredTeams.length === 0)) && (
                <p className="p-4 text-sm text-gray-500">
                  No {activeNav === "Chat" ? "users" : "teams"} found
                </p>
              )}
          </div>
        </div>
      )}

      {activeNav === "Activity" && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {activities.length === 0 ? (
            <p className="p-4 text-gray-500">No recent activity</p>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                className="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <span className="font-semibold">{act.sender_id}</span>{" "}
                {act.type.replace("_", " ")}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
