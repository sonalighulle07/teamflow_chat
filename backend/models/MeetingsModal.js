const pool = require("../config/db");

exports.createMeeting = async ({ hostId, title, scheduledAt, type, code }) => {
  await pool.query(
    "INSERT INTO meetings (code, host_id, title, scheduled_at, type) VALUES (?, ?, ?, ?, ?)",
    [code, hostId, title, scheduledAt, type]
  );
};

exports.getMeetingByCode = async (code) => {
  const [rows] = await pool.query("SELECT * FROM meetings WHERE code = ?", [code]);
  return rows[0];
};

exports.getMeetingsForUser = async (userId) => {
  const [rows] = await pool.query(
    "SELECT * FROM meetings WHERE host_id = ? ORDER BY scheduled_at ASC",
    [userId]
  );
  return rows;
};

