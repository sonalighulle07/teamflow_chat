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
 
// नवीन message insert करण्यासाठी
const insertMessage = async (senderId, receiverId, text, fileUrl = null, fileType = null, type = "text") => {
  const query = `
    INSERT INTO chats (sender_id, receiver_id, text, file_url, file_type, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const [result] = await db.query(query, [
    senderId,
    receiverId,
    text,
    fileUrl,
    fileType,
    type,
  ]);
 
  // inserted message परत करा
  const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [
    result.insertId,
  ]);
 
  return rows[0];
};
 
module.exports = {
  getAllMessages,
  getMessagesBetweenUsers,
  insertMessage,
};
 //chatModel