const db = require("../config/db");
const { encrypt, decrypt } = require("../Utils/crypto");

const getAllMessages = async () => {
  const [rows] = await db.query(
    "SELECT * FROM chats ORDER BY created_at ASC"
  );

  // Decrypt text before returning
  return rows.map(msg => ({
    ...msg,
    text: msg.text ? decrypt(msg.text) : ""
  }));
};

const getMessagesBetweenUsers = async (user1, user2) => {
  const [rows] = await db.query(
    `SELECT * FROM chats
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC`,
    [user1, user2, user2, user1]
  );

  return rows.map(msg => ({
    ...msg,
    text: msg.text ? decrypt(msg.text) : ""
  }));
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
    const encryptedText = text ? encrypt(text) : "";

    const query = `
      INSERT INTO chats 
      (sender_id, receiver_id, text, file_url, file_name, file_type, type, deleted, edited, reactions, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, NOW())
    `;
    const [result] = await db.query(query, [
      senderId,
      receiverId,
      encryptedText, // store encrypted text
      fileUrl,
      fileName,
      fileType,
      type,
    ]);

    const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [
      result.insertId,
    ]);

    const message = rows[0];
    message.text = text || ""; // return decrypted for consistency
    return message;
  } catch (err) {
    console.error("DB Insert Error:", err.sqlMessage || err);
    throw err;
  }
};

// get a single message by id
const getMessageById = async (messageId) => {
  const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [messageId]);
  if (!rows.length) return null;

  const message = rows[0];
  message.text = message.text ? decrypt(message.text) : "";
  return message;
};

// update reactions
const updateMessageReactions = async (messageId, emoji) => {
  const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [messageId]);
  if (!rows.length) return null;

  let message = rows[0];
  let reactions;
  try {
    reactions = message.reactions ? JSON.parse(message.reactions) : {};
  } catch (err) {
    console.error("Error parsing reactions:", err);
    reactions = {};
  }

  // Increment emoji count
  reactions[emoji] = reactions[emoji] ? reactions[emoji] + 1 : 1;

  // Update in DB
  await db.query("UPDATE chats SET reactions = ? WHERE id = ?", [JSON.stringify(reactions), messageId]);

  // Decrypt text before returning
  message.text = message.text ? decrypt(message.text) : "";

  return { message, reactions };
};

// delete message
const deleteMessage = async (messageId) => {
  await db.query("DELETE FROM chats WHERE id = ?", [messageId]);
};

// update/edit message text (encrypt before saving)
const updateMessage = async (messageId, text) => {
  const encryptedText = encrypt(text);
  await db.query("UPDATE chats SET text = ?, edited = 1 WHERE id = ?", [encryptedText, messageId]);
};

// update reactions JSON directly
const updateReactions = async (messageId, reactions) => {
  await db.query("UPDATE chats SET reactions = ? WHERE id = ?", [reactions, messageId]);
};

module.exports = {
  getAllMessages,
  getMessagesBetweenUsers,
  insertMessage,
  getMessageById,
  updateMessageReactions,
  deleteMessage,      
  updateMessage,      
  updateReactions,    
};
