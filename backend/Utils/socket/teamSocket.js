// backend/Utils/socket/teamSocket.js
const TeamInvite = require("../../models/TeamInvite");
const db = require("../../config/db"); // ✅ Correct path to DB

module.exports = (io) => {
  io.on("connection", (socket) => {
    // console.log("Socket connected:", socket.id);

    // -----------------------------
    // 1️⃣ Register user and send pending invites
    // -----------------------------
    socket.on("register", async ({ userId }) => {
      if (!userId) return;

      socket.userId = userId;
      socket.join(`user_${userId}`);
      // console.log(`User ${userId} joined room user_${userId}`);

      try {
        const pendingInvites = await TeamInvite.getPendingForUser(userId);

        pendingInvites.forEach((invite) => {
          io.to(`user_${userId}`).emit("teamInviteReceived", {
            id: invite.id,
            team_name: invite.team_name,
            invited_by_name: invite.invited_by_name,
            inviter_id: invite.invited_by,
          });
        });
      } catch (err) {
        console.error("Error fetching pending invites:", err);
      }
    });

    // -----------------------------
    // 2️⃣ Real-time send new invites
    // -----------------------------
    socket.on("sendTeamInvite", async ({ invite }) => {
      if (!invite) return;

      const { id, team_name, invited_by, invited_by_name, invitedUsers } = invite;

      invitedUsers.forEach((uid) => {
        io.to(`user_${uid}`).emit("teamInviteReceived", {
          id,
          team_name,
          invited_by_name,
          inviter_id: invited_by,
        });
      });
    });

    // -----------------------------
    // 3️⃣ Handle accept/reject invite
    // -----------------------------
   socket.on("teamInviteResponse", async ({ inviteId, action, userId }) => {
  if (!inviteId || !action || !userId) return;

  try {
    const [rows] = await db.query(
      "SELECT * FROM team_invites WHERE id = ?",
      [inviteId]
    );
    const invite = rows[0];
    if (!invite) return;

    if (action === "accepted") {
      // Add user from socket event, not DB invite.user_id
      await db.query(
        "INSERT INTO team_members (team_id, user_id) VALUES (?, ?)",
        [invite.team_id, userId]
      );

      console.log(`Invite ${inviteId} accepted. User ${userId} added to team ${invite.team_id}`);
    }

    const status = action === "accepted" ? "accepted" : "rejected";
    await db.query(
      "UPDATE team_invites SET status = ? WHERE id = ?",
      [status, inviteId]
    );

    io.to(`user_${invite.invited_by}`).emit("inviteHandled", {
      inviteId,
      action: status,
      userId,
    });
  } catch (err) {
    console.error("Failed to handle invite response:", err);
  }
});

    // -----------------------------
    // 4️⃣ Disconnect
    // -----------------------------
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};
