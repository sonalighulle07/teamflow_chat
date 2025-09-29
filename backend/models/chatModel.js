const db = require("../Utils/db");
 
// सर्व messages fetch करण्यासाठी (सर्व history)
const getAllMessages = async () => {
  const [rows] = await db.query(
    "SELECT * FROM chats ORDER BY created_at ASC"
  );
  return rows;
};
 
// दोन users मधील conversation fetch करण्यासाठी
const getMessagesBetweenUsers = async (user1, user2) => {
  const [rows] = await db.query(
    `SELECT * FROM chats
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC`,
    [user1, user2, user2, user1]
  );
  return rows;
};
 
const insertMessage = async (
  senderId,
  receiverId,
  text,
  fileUrl = null,
  fileType = null,
  type = "text",
  fileName = null
) => {
  try {
    const query = `
      INSERT INTO chats 
      (sender_id, receiver_id, text, file_url, file_name, file_type, type, deleted, edited, reactions, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, NOW())
    `;
    const [result] = await db.query(query, [
      senderId,
      receiverId,
      text,
      fileUrl,
      fileName,
      fileType,
      type,
    ]);

    const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [
      result.insertId,
    ]);
    return rows[0];
  } catch (err) {
    console.error("DB Insert Error:", err.sqlMessage || err);
    throw err;
  }
};

// get a single message by id
const getMessageById = async (messageId) => {
  const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [messageId]);
  return rows[0];
};

// update reactions
const updateMessageReactions = async (messageId, emoji) => {
  const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [messageId]);
  if (!rows.length) return null;

  let message = rows[0];
  let reactions;
  try {
    reactions = message.reactions ? JSON.parse(message.reactions) : {};
  } catch {
    reactions = {};
  }

  reactions[emoji] = reactions[emoji] ? reactions[emoji] + 1 : 1;

  await db.query("UPDATE chats SET reactions = ? WHERE id = ?", [JSON.stringify(reactions), messageId]);

  return { message, reactions };
};



module.exports = {
  getAllMessages,
  getMessagesBetweenUsers,
  insertMessage,
  getMessageById,
  updateMessageReactions,
};
