    import React, { useState } from "react";
    import TeamsSidebar from "./TeamsSidebar";
    import ChatWindow from "./ChatWindow";
    import { useSelector } from "react-redux";

    export default function TeamsPage() {
    const { currentUser } = useSelector((state) => state.user);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [messages, setMessages] = useState([]);

    return (
        <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-300">
            <TeamsSidebar
            currentUser={currentUser}
            onSelectTeam={(team) => setSelectedTeam(team)}
            />
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
            <ChatWindow
            selectedTeam={selectedTeam}
            messages={messages}
            setMessages={setMessages}
            currentUserId={currentUser?.id}
            searchQuery={""} // can pass a search string if you want
            />
        </div>
        </div>
    );
    }
