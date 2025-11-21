const db = require("../config/db");
const { encrypt, decrypt } = require("../Utils/crypto");

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
    return result.insertId; 
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
   getTeamsWithLastMessage: async (userId) => {
    const [rows] = await db.query(
      `
      SELECT 
        t.id, 
        t.name, 
        t.created_by, 
        t.created_at,
        tm.id AS last_message_id,
        tm.text AS last_message_text,
        tm.type AS last_message_type,
        tm.created_at AS last_message_time
      FROM teams t
      JOIN team_members tmbr ON tmbr.team_id = t.id
      LEFT JOIN team_messages tm ON tm.id = (
        SELECT id FROM team_messages 
        WHERE team_id = t.id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
      WHERE tmbr.user_id = ?
      ORDER BY last_message_time DESC, t.created_at DESC
      `,
      [userId]
    );

    return rows.map((team) => ({
      ...team,
      last_message_text: team.last_message_text
        ? decrypt(team.last_message_text)
        : "",
      last_message_time: team.last_message_time
        ? new Date(team.last_message_time)
        : new Date(team.created_at),
    }));
  },
};

// Team Members
const TeamMember = {
  add: async (team_id, user_id, role = "member") => {
    const [result] = await db.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)",
      [team_id, user_id, role]
    );
    return result;
  },

  // Get members of a specific team
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
WHERE t.id = ?;
`,
    [team_id]
  );
  return rows;
},

};

const TeamChat = {
  // Get team chat messages
  getMessages: async (team_id) => {

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

// Insert team message (all fields encrypted)
const TeamMessage = {
insert: async (
  senderId,
  teamId,
  text = "",
  fileUrl = null,
  type = "text",
  fileName = null,
  reactions = {}
) => {
  const query = `
    INSERT INTO team_messages 
    (sender_id, team_id, text, file_url, file_name, type, deleted, edited, reactions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0,  ?, NOW())
  `;

  const encryptedText = text ? encrypt(text) : "";
  const encryptedFileUrl = fileUrl ? encrypt(fileUrl) : null;
  const encryptedFileName = fileName ? encrypt(fileName) : null;
 
  const encryptedReactions = encrypt(JSON.stringify(reactions || {}));

  const [result] = await db.query(query, [
    senderId,
    teamId,
    encryptedText,
    encryptedFileUrl,
    encryptedFileName,
    type, 
    encryptedReactions,
  ]);

  return { insertId: result.insertId };
},

  
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

      reactions: msg.reactions ? JSON.parse(decrypt(msg.reactions)) : {},
    }));
  },

  // Update message text
 updateMessage: async (messageId, { text, fileUrl, fileName, type }) => {
  const fields = [];
  const values = [];

  if (text !== undefined) {
    fields.push("text = ?");
    values.push(encrypt(text));
  }

  if (fileUrl !== undefined) {
    fields.push("file_url = ?");
    values.push(encrypt(fileUrl));
  }

  if (fileName !== undefined) {
    fields.push("file_name = ?");
    values.push(encrypt(fileName));
  }

  if (type !== undefined) {
    fields.push("type = ?");
    values.push(type);
  }

  fields.push("edited = 1");

  values.push(messageId);

  await db.query(`UPDATE team_messages SET ${fields.join(", ")} WHERE id = ?`, values);
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
    console.log("Updating reactions for messageId:", messageId, "with reactions:", reactions);
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
