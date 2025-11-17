// 📁 src/components/TeamInvites.jsx
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  UserPlusIcon,
} from "@heroicons/react/24/solid";
import { URL } from "../config";

export default function TeamInvites({ socket, show, setShow }) {
  const [invites, setInvites] = useState([]);
  const token = sessionStorage.getItem("chatToken");
  const currentUserId = parseInt(sessionStorage.getItem("userId"));

  // Track invite IDs to avoid duplicates
  const inviteIdsRef = useRef(new Set());

  // -----------------------------
  // 1️⃣ Fetch pending invites ONCE (only invites sent by others)
  // -----------------------------
  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    const fetchInvites = async () => {
      try {
        const res = await axios.get(`${URL}/api/teams/invites`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const fetchedInvites = res.data || [];

        // Filter out invites sent by self
        const pendingInvites = fetchedInvites.filter(
          (invite) => invite.inviter_id !== currentUserId
        );

        pendingInvites.forEach((i) => inviteIdsRef.current.add(i.id));
        setInvites(pendingInvites);

        // Open modal only if there are pending invites from others
        if (pendingInvites.length > 0) setShow(true);
      } catch (err) {
        if (err.name !== "CanceledError") {
          console.error("❌ Failed to fetch invites:", err);
        }
      }
    };

    fetchInvites();

    return () => controller.abort();
  }, [token, setShow, currentUserId]);

  // -----------------------------
  // 2️⃣ Real-time invite listener
  // -----------------------------
  const handleInvite = (invite) => {
    if (!invite?.id) return;

    // Ignore invites sent by self
    if (invite.inviter_id === currentUserId) return;

    // Ignore duplicates
    if (inviteIdsRef.current.has(invite.id)) return;

    inviteIdsRef.current.add(invite.id);
    setInvites((prev) => [...prev, invite]);

    // Open modal for new real-time invite
    setShow(true);
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("teamInviteReceived", handleInvite);

    return () => {
      socket.off("teamInviteReceived", handleInvite);
    };
  }, [socket]);

  // -----------------------------
  // 3️⃣ Accept or Reject
  // -----------------------------
  const handleResponse = async (inviteId, accept) => {
    const action = accept ? "accept" : "reject";

    try {
      await axios.post(
        `${URL}/api/teams/invites/respond`,
        { inviteId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      inviteIdsRef.current.delete(inviteId);

      // Notify backend
      if (socket) {
        socket.emit("teamInviteResponse", { inviteId, action });
      }

      // Close modal if no invites remain
      setTimeout(() => {
        setInvites((curr) => {
          if (curr.length === 0) setShow(false);
          return curr;
        });
      }, 300);

      alert(`Invitation ${action} successfully`);
    } catch (err) {
      console.error("❌ Failed to respond:", err);
    }
  };

  // -----------------------------
  // 4️⃣ Don’t render modal if empty
  // -----------------------------
  if (!show || invites.length === 0) return null;

  // -----------------------------
  // 5️⃣ Render modal
  // -----------------------------
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-[400px] max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-5"
      >
        <div className="flex justify-between items-center mb-3 border-b pb-2">
          <h2 className="font-semibold text-lg text-purple-700">
            Team Invitations
          </h2>
          <button
            onClick={() => setShow(false)}
            className="text-gray-500 hover:text-red-500 text-xl"
          >
            ×
          </button>
        </div>

        <AnimatePresence>
          {invites.map((invite) => (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border border-purple-100 p-4 rounded-xl mb-3 shadow-sm bg-purple-50"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-200 p-2 rounded-full">
                  <UserPlusIcon className="h-6 w-6 text-purple-700" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-purple-800 text-md">
                    {invite.team_name}
                  </p>
                  <p className="text-sm text-purple-700">
                    Invited by{" "}
                    <span className="font-semibold">
                      {invite.invited_by_name || "Unknown"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleResponse(invite.id, true)}
                  className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
                >
                  <CheckCircleIcon className="h-4 w-4" /> Accept
                </button>
                <button
                  onClick={() => handleResponse(invite.id, false)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
                >
                  <XCircleIcon className="h-4 w-4" /> Reject
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
