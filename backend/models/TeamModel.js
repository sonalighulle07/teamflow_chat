const db = require("../Utils/db");

const Team = {
  getAll: () => db.query("SELECT * FROM teams"),

  getById: (id) => db.query("SELECT * FROM teams WHERE id=?", [id]),

  create: async (name, created_by) => {
  const [result] = await db.query(
    "INSERT INTO teams (name, created_by) VALUES (?, ?)",
    [name, created_by]
  );
  return result; // ✅ This must be returned so insertId is available
},



  update: (id, name) =>
    db.query("UPDATE teams SET name = ? WHERE id = ?", [name, id]),

  delete: (id) => db.query("DELETE FROM teams WHERE id = ?", [id]),

  // ✅ Get teams that a user is part of
  getByUser: (user_id) =>
    db.query(
      `SELECT t.id, t.name, t.created_by
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = ?`,
      [user_id]
    ),
};

const TeamMember = {
  add: (team_id, user_id, role = "member") =>
    db.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)",
      [team_id, user_id, role]
    ),

  getMembers: (team_id) =>
    db.query(
      `SELECT u.id, u.username, u.profile_image
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?`,
      [team_id]
    ),
};

const TeamChat = {
  getMessages: (team_id) =>
    db.query(
      "SELECT * FROM team_chats WHERE team_id=? ORDER BY created_at ASC",
      [team_id]
    ),

  addMessage: (
    team_id,
    sender_id,
    message,
    file_url = null,
    file_type = "text"
  ) =>
    db.query(
      "INSERT INTO team_chats (team_id, sender_id, message, file_url, file_type) VALUES (?, ?, ?, ?, ?)",
      [team_id, sender_id, message, file_url, file_type]
    ),
};

const TeamMessage = {
  insert: async (
    senderId,
    teamId,
    text = "",
    fileUrl = null,
    type = "text",
    fileName = null
  ) => {
    const query = `
      INSERT INTO team_messages 
      (sender_id, team_id, text, file_url, file_name, type, deleted, edited, reactions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, NULL, NOW())
    `;
    const [result] = await db.query(query, [
      senderId,
      teamId,
      text,
      fileUrl,
      fileName,
      type,
    ]);
    return { insertId: result.insertId };
  },

  getById: async (messageId) => {
    const [rows] = await db.query("SELECT * FROM team_messages WHERE id = ?", [
      messageId,
    ]);
    return rows[0];
  },

  updateText: async (messageId, text) => {
    await db.query(
      "UPDATE team_messages SET text = ?, edited = 1 WHERE id = ?",
      [text, messageId]
    );
  },

  delete: async (messageId) => {
    await db.query("DELETE FROM team_messages WHERE id = ?", [messageId]);
  },

  updateReactions: async (messageId, reactions) => {
    await db.query("UPDATE team_messages SET reactions = ? WHERE id = ?", [
      reactions,
      messageId,
    ]);
  },
};

module.exports = {
  Team,
  TeamMember,
  TeamChat,
  TeamMessage,
};
