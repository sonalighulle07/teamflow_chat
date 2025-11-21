const db = require("../config/db");
const { encrypt, decrypt } = require("../Utils/crypto");

// ------------------------------
// 🔹 Get all messages (decrypted)
// ------------------------------
const getAllMessages = async () => {
  const [rows] = await db.query("SELECT * FROM chats ORDER BY created_at ASC");

  return rows.map((msg) => {
    let text = "";
    let file_name = null;
    let reactions = {};
    try {
      text = msg.text ? decrypt(msg.text) : "";
      file_name = msg.file_name ? decrypt(msg.file_name) : null;
      reactions = msg.reactions ? JSON.parse(decrypt(msg.reactions)) : {};
    } catch (err) {
      console.error("Failed to decrypt message ID", msg.id, err);
    }
    return { ...msg, text, file_name, reactions };
  });
};

// ----------------------------------------------
// 🔹 Get messages between two users (decrypted)
// ----------------------------------------------
const getMessagesBetweenUsers = async (user1, user2) => {
  const [rows] = await db.query(
    `SELECT * FROM chats
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC`,
    [user1, user2, user2, user1]
  );

  return rows.map((msg) => {
    let text = "";
    let file_name = null;
    let reactions = {};
    try {
      text = msg.text ? decrypt(msg.text) : "";
      file_name = msg.file_name ? decrypt(msg.file_name) : null;
      reactions = msg.reactions ? JSON.parse(decrypt(msg.reactions)) : {};
    } catch (err) {
      console.warn("Failed to decrypt message ID", msg.id, err);
    }

    return { ...msg, text, file_name, reactions };
  });
};

// -----------------------------
// 🔹 Insert message (encrypted)
// -----------------------------
const insertMessage = async (
  senderId,
  receiverId,
  text = "",
  fileUrl = null,
  fileType = null,
  type = "text",
  fileName = null
) => {
  try {
    const encryptedText = text ? encrypt(text) : "";
    const encryptedFileName = fileName ? encrypt(fileName) : null;
    const encryptedReactions = encrypt(JSON.stringify({}));

    const query = `
      INSERT INTO chats 
      (sender_id, receiver_id, text, file_url, file_name, file_type, type, deleted, edited, reactions, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NOW())
    `;

    const [result] = await db.query(query, [
      senderId,
      receiverId,
      encryptedText,
      fileUrl,
      encryptedFileName,
      fileType,
      type,
      encryptedReactions,
    ]);

    // Fetch the inserted message
    const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [
      result.insertId,
    ]);
    const message = rows[0];

    return {
      ...message,
      text,
      file_name: fileName,
      reactions: {},
    };
  } catch (err) {
    console.error("DB Insert Error:", err.sqlMessage || err);
    throw err;
  }
};

// ---------------------------------
// 🔹 Get single message (decrypted)
// ---------------------------------
const getMessageById = async (messageId) => {
  const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [messageId]);
  if (!rows.length) return null;

  const msg = rows[0];

  let text = "";
  let file_name = null;
  let reactions = {};
  try {
    text = msg.text ? decrypt(msg.text) : "";
    file_name = msg.file_name ? decrypt(msg.file_name) : null;
    reactions = msg.reactions ? JSON.parse(decrypt(msg.reactions)) : {};
  } catch (err) {
    console.error("Failed to decrypt message ID", msg.id, err);
  }

  return { ...msg, text, file_name, reactions };
};

// ---------------------------------------------
// 🔹 Update reactions (store encrypted JSON)
// ---------------------------------------------
const updateMessageReactions = async (messageId, emoji) => {
  const message = await getMessageById(messageId);
  if (!message) return null;

  // Update reaction counts
  const reactions = { ...message.reactions };
  reactions[emoji] = reactions[emoji] ? reactions[emoji] + 1 : 1;

  // Save encrypted reactions
  await db.query("UPDATE chats SET reactions = ? WHERE id = ?", [
    encrypt(JSON.stringify(reactions)),
    messageId,
  ]);

  // Re-fetch and decrypt the updated message
  const updatedMessage = await getMessageById(messageId);
  return updatedMessage;
};

// -----------------------------------
// 🔹 Delete message (hard delete)
// -----------------------------------
const deleteMessage = async (messageId) => {
  await db.query("DELETE FROM chats WHERE id = ?", [messageId]);
};

// -----------------------------------------
// 🔹 Update/edit text (re-encrypt on save)
// -----------------------------------------
const updateMessage = async (messageId, text) => {
  const encryptedText = encrypt(text);
  await db.query("UPDATE chats SET text = ?, edited = 1 WHERE id = ?", [
    encryptedText,
    messageId,
  ]);
};

// ---------------------------------------------------
// 🔹 Directly update reactions JSON (encrypted form)
// ---------------------------------------------------
const updateReactions = async (messageId, reactions) => {
  await db.query("UPDATE chats SET reactions = ? WHERE id = ?", [
    encrypt(JSON.stringify(reactions)),
    messageId,
  ]);
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
