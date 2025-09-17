import pool from "../config/db.js";

export const saveMessage = async ({ senderId, receiverId, text, fileUrl, fileType }) => {
  const [rows] = await pool.query(
    "INSERT INTO messages (sender_id, receiver_id, text, file_url, file_type, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
    [senderId, receiverId, text, fileUrl, fileType]
  );
  return rows.insertId;
};

export const getMessages = async (user1, user2) => {
  const [rows] = await pool.query(
    "SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at ASC",
    [user1, user2, user2, user1]
  );
  return rows;
};
