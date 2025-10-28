const db = require("../Utils/db");

const Team = {
  // Get all teams
  getAll: async () => {
    const [rows] = await db.query("SELECT * FROM teams");
    return rows;
  },

  // Get single team by ID
  getById: async (id) => {
    const [rows] = await db.query("SELECT * FROM teams WHERE id = ?", [id]);
    return rows;
  },

  // Create a new team
  create: async (name, created_by) => {
    const [result] = await db.query(
      "INSERT INTO teams (name, created_by) VALUES (?, ?)",
      [name, created_by]
    );
    return result; // contains insertId
  },

  // Update a team
  update: async (id, name) => {
    const [result] = await db.query(
      "UPDATE teams SET name = ? WHERE id = ?",
      [name, id]
    );
    return result;
  },

  // Delete a team
  delete: async (id) => {
    const [result] = await db.query("DELETE FROM teams WHERE id = ?", [id]);
    return result;
  },

  // Get teams that a user is part of
  getByUser: async (user_id) => {
    const [rows] = await db.query(
      `SELECT t.id, t.name, t.created_by
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = ?`,
      [user_id]
    );
    return rows;
  },
};

const TeamMember = {
  // Add a member to a team
  add: async (team_id, user_id, role = "member") => {
    const [result] = await db.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)",
      [team_id, user_id, role]
    );
    return result;
  },

  // Get members of a team
  getMembers: async (team_id) => {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.profile_image
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?`,
      [team_id]
    );
    return rows;
  },
};

const TeamChat = {
  // Get team chat messages
  getMessages: async (team_id) => {
    const [rows] = await db.query(
      "SELECT * FROM team_chats WHERE team_id = ? ORDER BY created_at ASC",
      [team_id]
    );
    return rows;
  },

  // Add a team chat message
  addMessage: async (team_id, sender_id, message, file_url = null, file_type = "text") => {
    const [result] = await db.query(
      "INSERT INTO team_chats (team_id, sender_id, message, file_url, file_type) VALUES (?, ?, ?, ?, ?)",
      [team_id, sender_id, message, file_url, file_type]
    );
    return result;
  },
};

const TeamMessage = {
  // Insert team message (text or file)
  insert: async (senderId, teamId, text = "", fileUrl = null, type = "text", fileName = null) => {
    const query = `
      INSERT INTO team_messages 
      (sender_id, team_id, text, file_url, file_name, type, deleted, edited, reactions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, NULL, NOW())
    `;
    const [result] = await db.query(query, [senderId, teamId, text, fileUrl, fileName, type]);
    return { insertId: result.insertId };
  },

  // Get message by ID
  getById: async (messageId) => {
    const [rows] = await db.query("SELECT * FROM team_messages WHERE id = ?", [messageId]);
    return rows[0];
  },

  // Update message text
  updateText: async (messageId, text) => {
    const [result] = await db.query(
      "UPDATE team_messages SET text = ?, edited = 1 WHERE id = ?",
      [text, messageId]
    );
    return result;
  },

  // Delete message
  delete: async (messageId) => {
    const [result] = await db.query("DELETE FROM team_messages WHERE id = ?", [messageId]);
    return result;
  },

  // Update message reactions
  updateReactions: async (messageId, reactions) => {
    const [result] = await db.query(
      "UPDATE team_messages SET reactions = ? WHERE id = ?",
      [reactions, messageId]
    );
    return result;
  },
};

module.exports = {
  Team,
  TeamMember,
  TeamChat,
  TeamMessage,
};
