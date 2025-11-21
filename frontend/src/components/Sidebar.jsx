import React, { useState, useEffect, useMemo } from "react";
import {
  FaCommentDots,
  FaVideo,
  FaUsers,
  FaCalendar,
  FaSearch,
  FaTasks,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  setSelectedUser,
  setActiveNav,
} from "../Store/Features/Users/userSlice";
import { fetchUsers } from "../Store/Features/Users/userThunks";
import {
  fetchTeams,
  fetchTeamMembers,
} from "../Store/Features/Teams/teamThunk";
import { setSelectedTeam } from "../Store/Features/Teams/teamSlice";
import axios from "axios";
import UserList from "./UserList";
import { URL } from "../config";

export default function Sidebar({ setShowModal, onCommunitiesClick, socket }) {
  const dispatch = useDispatch();

  const { currentUser, userList, selectedUser, loading, error, activeNav } =
    useSelector((state) => state.user);
  const { teamList, selectedTeam } = useSelector((state) => state.team);

  const token = sessionStorage.getItem("chatToken");

  const [searchQuery, setSearchQuery] = useState("");
  const [lastMessages, setLastMessages] = useState({});
  const [lastTeamMessages, setLastTeamMessages] = useState({});

  // -----------------------
  // Fetch users/teams periodically
  // -----------------------
  useEffect(() => {
    if (!currentUser?.organization_id) return;

    if (activeNav === "Chat") {
      dispatch(fetchUsers());
      const interval = setInterval(() => dispatch(fetchUsers()), 5000);
      return () => clearInterval(interval);
    }

    if (activeNav === "Communities") {
      dispatch(fetchTeams());
      const interval = setInterval(() => dispatch(fetchTeams()), 5000);
      return () => clearInterval(interval);
    }
  }, [activeNav, currentUser, dispatch]);

  // -----------------------
  // Fetch last messages for users
  // -----------------------
  const fetchLastMessages = async (userId) => {
    try {
      const res = await axios.get(`${URL}/api/chats/last-messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const lastMessagesObj = {};
      res.data.forEach((msg) => {
        lastMessagesObj[msg.user_id] = new Date(msg.last_message_at);
      });
      setLastMessages(lastMessagesObj);
    } catch (err) {
      console.error("Failed to fetch last messages", err);
    }
  };

  // -----------------------
  // Fetch last messages for teams
  // -----------------------
  // -----------------------
  // Fetch last messages for teams
  // -----------------------
 const fetchLastTeamMessages = async (userId) => {
  try {
    const res = await axios.get(`${URL}/api/teams/user/${userId}/sorted`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const lastMessagesObj = {};
    res.data.forEach((team) => {
      
      lastMessagesObj[team.id] = new Date(team.last_message_time || team.created_at);
    });

    setLastTeamMessages(lastMessagesObj);
    
  } catch (err) {
    console.error("Failed to fetch last team messages", err);
  }
};


  // -----------------------
  // Load saved last messages from localStorage
  // -----------------------
  useEffect(() => {
    const saved = localStorage.getItem("lastMessages");
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.keys(parsed).forEach((k) => (parsed[k] = new Date(parsed[k])));
      setLastMessages(parsed);
    }
  }, []);

  // -----------------------
  // Fetch last messages on user change
  // -----------------------
  useEffect(() => {
    if (currentUser?.id) {
      fetchLastMessages(currentUser.id);
      fetchLastTeamMessages(currentUser.id);
    }
  }, [currentUser?.id]);

  // -----------------------
  // Real-time updates for user messages
  // -----------------------
  useEffect(() => {
    if (!socket || !currentUser) return;
    socket.on("privateMessage", (msg) => {
      const otherUserId =
        msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
      setLastMessages((prev) => {
        const updated = { ...prev, [otherUserId]: new Date(msg.created_at) };
        localStorage.setItem(
          "lastMessages",
          JSON.stringify(
            Object.fromEntries(
              Object.entries(updated).map(([k, v]) => [k, v.toISOString()])
            )
          )
        );
        return updated;
      });
    });
    return () => socket.off("privateMessage");
  }, [socket, currentUser]);

  // -----------------------
  // Handle selection
  // -----------------------
  const handleSelectUser = (user) => {
    dispatch(setSelectedUser(user));
    dispatch(setSelectedTeam(null));
    setSearchQuery("");
  };

  const handleSelectTeam = (team) => {
    if (!team) return;
    dispatch(setSelectedTeam(team));
    dispatch(fetchTeamMembers());
  };

  // -----------------------
  // Filtered and sorted lists
  // -----------------------
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return userList;
    return userList.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [userList, searchQuery]);

  const filteredTeams = useMemo(() => {
    let list = [...teamList]; // ✅ make a copy
    if (searchQuery) {
      list = list.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    list.sort((a, b) => {
      const aTime = lastTeamMessages[a.id] || new Date(a.created_at);
      const bTime = lastTeamMessages[b.id] || new Date(b.created_at);
      return bTime - aTime; // newest first
    });

    return list;
  }, [teamList, searchQuery, lastTeamMessages]);

  // -----------------------
  // Sidebar nav items
  // -----------------------
  const navItems = [
    { icon: <FaCommentDots />, label: "Chat" },
    { icon: <FaVideo />, label: "Meet" },
    { icon: <FaUsers />, label: "Communities" },
    { icon: <FaCalendar />, label: "Calendar" },
    { icon: <FaTasks />, label: "Tasks" },
  ];

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar navigation */}
      <div className="flex flex-col justify-between w-20 min-w-[5rem] bg-slate-200 shadow-md px-4 py-6 flex-shrink-0">
        <div className="flex flex-col items-center gap-6">
          {navItems.map(({ icon, label }) => {
            const isActive = activeNav === label;
            return (
              <div
                key={label}
                className="group relative flex flex-col items-center cursor-pointer"
                onClick={() => {
                  dispatch(setActiveNav(label));
                  if (label === "Communities" && onCommunitiesClick)
                    onCommunitiesClick();
                }}
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel */}
      {(activeNav === "Chat" ||
        activeNav === "Communities" ||
        activeNav === "Tasks") && (
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
                className="mt-2 w-full bg-blue-400 text-white py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                + Create Team
              </button>
            )}
          </div>

          {/* User/Team List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {error && <p className="p-4 text-sm text-red-500">{error}</p>}
            {!loading && !error && (
              <UserList
                users={activeNav === "Chat" ? filteredUsers : []}
                teams={activeNav === "Communities" ? filteredTeams : []}
                selectedUser={selectedUser}
                selectedTeam={selectedTeam}
                searchQuery={searchQuery}
                lastMessages={{ ...lastMessages, ...lastTeamMessages }}
                onSelectUser={handleSelectUser}
                onSelectTeam={handleSelectTeam}
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
    </div>
  );
}
