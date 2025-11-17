const db = require("../config/db");

const TeamInvite = {
  create: async (team_id, user_id, invited_by) => {
    const [result] = await db.query(
      "INSERT INTO team_invites (team_id, user_id, invited_by, status) VALUES (?, ?, ?, 'pending')",
      [team_id, user_id, invited_by]
    );
    return result;
  },

  getPendingForUser: async (user_id) => {
    const [rows] = await db.query(
      `SELECT ti.id, t.name AS team_name, u.username AS invited_by_name 
       FROM team_invites ti
       JOIN teams t ON ti.team_id = t.id
       JOIN users u ON ti.invited_by = u.id
       WHERE ti.user_id = ? AND ti.status='pending'`,
      [user_id]
    );
    return rows;
  },

  respond: async (inviteId, action) => {
    const status = action === "accept" ? "accepted" : "rejected";
    await db.query("UPDATE team_invites SET status=? WHERE id=?", [status, inviteId]);
  },
};

module.exports = TeamInvite;
