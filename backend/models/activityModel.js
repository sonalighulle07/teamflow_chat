// models/activityModel.js
import pool from "../db.js"; // your MySQL connection

export const getActivitiesByUser = async (userId) => {
  const [rows] = await pool.query(
    "SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows;
};

export const createActivity = async (activity) => {
  const { user_id, type, sender_id, team_id, chat_id, content, reactions } = activity;
  const [result] = await pool.query(
    "INSERT INTO activities (user_id, type, sender_id, team_id, chat_id, content, reactions) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [user_id, type, sender_id, team_id, chat_id, content, JSON.stringify(reactions)]
  );
  return { id: result.insertId, ...activity };
};

export const markActivityRead = async (activityId) => {
  await pool.query("UPDATE activities SET read_status = 1 WHERE id = ?", [activityId]);
};
