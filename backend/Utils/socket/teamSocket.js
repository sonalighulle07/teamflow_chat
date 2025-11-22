const TeamInvite = require("../../models/TeamInvite");
const db = require("../../config/db");
module.exports = (io, socket) => {

  // REGISTER USER
  socket.on("register", async ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;
    socket.join(`user_${userId}`);

    try {
      const pendingInvites = await TeamInvite.getPendingForUser(userId);

      pendingInvites.forEach((invite) => {
        io.to(`user_${userId}`).emit("teamInviteReceived", {
          id: invite.id,
          team_id: invite.team_id,
          team_name: invite.team_name,
          inviter_id: invite.invited_by,
          invited_by_name: invite.invited_by_name,
        });
      });
    } catch (err) {
      console.error(" Error fetching pending invites:", err);
    }
  });

  // JOIN TEAM ROOM
  socket.on("joinRoom", ({ teamId }) => {
    if (!teamId) return;
    socket.join(`team_${teamId}`);
  });

  
  // LEAVE TEAM ROOM
  socket.on("leaveRoom", ({ teamId }) => {
    if (!teamId) return;
    socket.leave(`team_${teamId}`);
  });


  // SEND TEAM MESSAGE
  socket.on("sendTeamMessage", (msg) => {
    io.to(`team_${msg.team_id}`).emit("teamMessage", msg);
  });


  // EDIT TEAM MESSAGE
  socket.on("editTeamMessage", (msg) => {
    io.to(`team_${msg.team_id}`).emit("teamMessageEdited", msg);
  });


  // DELETE TEAM MESSAGE
  socket.on("deleteTeamMessage", ({ messageId, teamId }) => {
    io.to(`team_${teamId}`).emit("teamMessageDeleted", {
      messageId,
      teamId,
    });
  });


  // REACT TO TEAM MESSAGE
  socket.on("reactTeamMessage", ({ messageId, emoji, userId, teamId }) => {
    io.to(`team_${teamId}`).emit("teamMessageReaction", {
      messageId,
      emoji,
      userId,
      teamId,
    });
  });
};
