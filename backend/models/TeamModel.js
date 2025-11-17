const db = require("../config/db");
const { encrypt, decrypt } = require("../Utils/crypto");

// ---------------------------
// Team
// ---------------------------
const Team = {
  // Get all teams
  getAll: async () => {
    const [rows] = await db.query("SELECT * FROM teams");
    return rows;
  },

  // Get a single team by ID
  getById: async (id) => {
    const [rows] = await db.query("SELECT * FROM teams WHERE id = ?", [id]);
    return rows.length ? rows[0] : null;
  },

  // Create a new team and return its ID
  create: async (name, created_by) => {
    const [result] = await db.query(
      "INSERT INTO teams (name, created_by) VALUES (?, ?)",
      [name, created_by]
    );
    if (!result.insertId) {
      throw new Error("Team creation failed: insertId missing");
    }
    return result.insertId; // Always return the new team ID
  },

  // Update team name
  update: async (id, name) => {
    const [result] = await db.query(
      "UPDATE teams SET name = ? WHERE id = ?",
      [name, id]
    );
    return result;
  },

  // Delete a team
  delete: async (id) => {
    const [result] = await db.query(
      "DELETE FROM teams WHERE id = ?",
      [id]
    );
    return result;
  },

  // Get all teams a user belongs to
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


// ---------------------------
// Team Members
// ---------------------------
const TeamMember = {
  add: async (team_id, user_id, role = "member") => {
    const [result] = await db.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)",
      [team_id, user_id, role]
    );
    return result;
  },
  getMembers: async (team_id) => {
    const [rows] = await db.query(
      `SELECT 
         t.id AS team_id,
         t.name AS team_name,
         u.id AS user_id,
         u.username,
         u.profile_image,
         tm.role
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       JOIN users u ON tm.user_id = u.id
       WHERE t.id = ?`,
      [team_id]
    );
    return rows;
  },
};

// ---------------------------
// Team Messages (Encrypted)
// ---------------------------
const TeamMessage = {
  // Insert team message
  insert: async (
    senderId,
    teamId,
    text = "",
    fileUrl = null,
    type = "text",
    fileName = null,
    metadata = null
  ) => {
    const query = `
      INSERT INTO team_messages 
      (sender_id, team_id, text, file_url, file_name, type, metadata, deleted, edited, reactions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NOW())
    `;

    const encryptedText = text ? encrypt(text) : "";
    const encryptedFileUrl = fileUrl ? encrypt(fileUrl) : null;
    const encryptedFileName = fileName ? encrypt(fileName) : null;
    const encryptedType = type ? encrypt(type) : null;
    const encryptedMetadata = metadata ? encrypt(JSON.stringify(metadata)) : null;
    const encryptedReactions = encrypt(JSON.stringify({})); // empty reactions

    const [result] = await db.query(query, [
      senderId,
      teamId,
      encryptedText,
      encryptedFileUrl,
      encryptedFileName,
      encryptedType,
      encryptedMetadata,
      encryptedReactions,
    ]);

    return { insertId: result.insertId };
  },

  // Get single message (decrypted)
  getById: async (messageId) => {
    const [rows] = await db.query(
      "SELECT * FROM team_messages WHERE id = ?",
      [messageId]
    );
    if (!rows.length) return null;

    const msg = rows[0];
    return {
      ...msg,
      text: msg.text ? decrypt(msg.text) : "",
      file_url: msg.file_url ? decrypt(msg.file_url) : null,
      file_name: msg.file_name ? decrypt(msg.file_name) : null,
      type: msg.type ? decrypt(msg.type) : "text",
      metadata: msg.metadata ? JSON.parse(decrypt(msg.metadata)) : null,
      reactions: msg.reactions ? JSON.parse(decrypt(msg.reactions)) : {},
    };
  },

  // Get all messages for a team (decrypted)
  getMessages: async (teamId) => {
    const [rows] = await db.query(
      "SELECT * FROM team_messages WHERE team_id = ? ORDER BY created_at ASC",
      [teamId]
    );

    return rows.map((msg) => ({
      ...msg,
      text: msg.text ? decrypt(msg.text) : "",
      file_url: msg.file_url ? decrypt(msg.file_url) : null,
      file_name: msg.file_name ? decrypt(msg.file_name) : null,
      type: msg.type ? decrypt(msg.type) : "text",
      metadata: msg.metadata ? JSON.parse(decrypt(msg.metadata)) : null,
      reactions: msg.reactions ? JSON.parse(decrypt(msg.reactions)) : {},
    }));
  },

  // Update message text
  updateText: async (messageId, text) => {
    const encryptedText = encrypt(text);
    const [result] = await db.query(
      "UPDATE team_messages SET text = ?, edited = 1 WHERE id = ?",
      [encryptedText, messageId]
    );
    return result;
  },

  // Soft delete
  softDelete: async (messageId) => {
    const [result] = await db.query(
      "UPDATE team_messages SET deleted = 1 WHERE id = ?",
      [messageId]
    );
    return result;
  },

  // Hard delete
  deletePermanent: async (messageId) => {
    const [result] = await db.query(
      "DELETE FROM team_messages WHERE id = ?",
      [messageId]
    );
    return result;
  },

  // Update reactions
  updateReactions: async (messageId, reactions) => {
    const encryptedReactions = encrypt(JSON.stringify(reactions));
    const [result] = await db.query(
      "UPDATE team_messages SET reactions = ? WHERE id = ?",
      [encryptedReactions, messageId]
    );
    return result;
  },
};

module.exports = {
  Team,
  TeamMember,
  TeamMessage,
};
