const db = require("../../config/db");
const { v4: uuidv4 } = require("uuid");



/**
 * ✅ Get active meeting for a team
 * GET /api/meetings/team/:teamId/active
 */
exports.getActiveMeeting = async (req, res) => {
  const { teamId } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT * FROM group_meetings WHERE team_id = ? AND is_active = TRUE LIMIT 1",
      [teamId]
    );

    if (rows.length === 0) {
      return res.json({ active: false, meeting: null });
    }

    return res.json({ active: true, meeting: rows[0] });
  } catch (err) {
    console.error("Error fetching active meeting:", err);
    res.status(500).json({ error: "Failed to fetch active meeting" });
  }
};


/**
 * Get or create a meeting code for a team
 */
exports.getOrCreateMeetingCode = async (teamId, userId = null) => {
  if (!teamId) throw new Error("teamId is required");

  // 1️⃣ Check if there's an *active* meeting already
  const [existing] = await db.query(
    "SELECT * FROM group_meetings WHERE team_id = ? AND is_active = 1 LIMIT 1",
    [teamId]
  );

  if (existing.length > 0) {
    return { meetingCode: existing[0].meeting_code, status: "join" };
  }

  // 2️⃣ Create new meeting code
  const meetingCode = `team-${teamId}-${uuidv4().split("-")[0]}`;

  await db.query(
    `INSERT INTO group_meetings 
      (team_id, meeting_code, is_active, started_by, started_at) 
     VALUES (?, ?, 1, ?, NOW())`,
    [teamId, meetingCode, userId]
  );

  return { meetingCode, status: "start" };
};

/**
 * End a meeting
 */
exports.endMeeting = async (teamId, userId) => {
  await db.query(
    `UPDATE group_meetings
     SET is_active = 0, ended_by = ?, ended_at = NOW()
     WHERE team_id = ? AND is_active = 1`,
    [userId, teamId]
  );
  return { success: true, message: "Meeting ended" };
};


/**
 * ✅ Get all meetings
 */
exports.getAllMeetings = async () => {
  const [rows] = await db.query("SELECT * FROM group_meetings ORDER BY created_at DESC");
  return rows;
};

/**
 * ✅ Get a meeting by team ID
 */
exports.getOrCreateMeetingCode = async (teamId) => {
  if (!teamId) throw new Error("teamId is required");

  // Check if a meeting already exists for this team
  const [existing] = await db.query("SELECT * FROM group_meetings WHERE team_id = ?", [teamId]);
  if (existing.length > 0) {
    return existing[0].meeting_code;
  }

  // Create new meeting code
  const meetingCode = `team-${teamId}-${uuidv4()}`;
  await db.query("INSERT INTO group_meetings (team_id, meeting_code, is_active, created_at) VALUES (?, ?, 0, NOW())", [teamId, meetingCode]);

  return meetingCode;
};

/**
 * ✅ Start a meeting
 */
exports.startMeeting = async (teamId, userId) => {
  await db.query(
    `UPDATE group_meetings 
     SET is_active = TRUE, started_by = ?, started_at = NOW(), ended_by = NULL, ended_at = NULL
     WHERE team_id = ?`,
    [userId, teamId]
  );
  return { success: true, message: "Meeting started" };
};


/**
 * ✅ Delete a meeting
 */
exports.deleteMeeting = async (id) => {
  await db.query("DELETE FROM group_meetings WHERE id = ?", [id]);
  return { success: true, message: "Meeting deleted" };
};
