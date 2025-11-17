const db = require("../../config/db");
const { v4: uuidv4 } = require("uuid");


// controllers/services/groupMeetings.js
exports.getActiveMeeting = async (teamId) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM group_meetings WHERE team_id = ? AND is_active = TRUE LIMIT 1",
      [teamId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error("Error fetching active meeting:", err);
    throw err;
  }
};


/**
 * Get or create a meeting code for a team.
 * If a team already has an active meeting, returns that existing meeting.
 * Otherwise, creates a new one.
 */
exports.getOrCreateMeetingCode = async (teamId, userId = null) => {
  if (!teamId) throw new Error("❌ teamId is required");

  try {
    const [existing] = await db.query(
      "SELECT * FROM group_meetings WHERE team_id = ? LIMIT 1",
      [teamId]
    );

    console.log("🔍 Query result:", existing);

    if (existing.length > 0) {
      console.log("✅ Existing active meeting found:", existing[0]);
      return {
        meetingCode: existing[0].meeting_code,
        status: "join",
      };
    }

    const meetingCode = `team-${teamId}-${uuidv4().split("-")[0]}`;
    console.log("🆕 Creating new meeting:", meetingCode);

    const [insertResult] = await db.query(
      `
        INSERT INTO group_meetings 
          (team_id, meeting_code, is_active, started_by, started_at)
        VALUES (?, ?, 1, ?, NOW())
      `,
      [teamId, meetingCode, userId || null]
    );

    console.log("🧾 Insert result:", insertResult);
    console.log("✅ New meeting created successfully:", meetingCode);

    return { meetingCode, status: "start" };
  } catch (error) {
    console.error("❌ Error in getOrCreateMeetingCode:", error);
    throw error;
  }
};


/**
 * End a meeting and reset started_by
 */
exports.endMeeting = async (teamId, userId) => {
  // Convert safely to number
  const teamIdNum = Number(teamId);

  console.log("🔍 Ending meeting for team:", teamIdNum, "by user:", userId);

  if (isNaN(teamIdNum)) {
    console.error("❌ Invalid teamId received:", teamId);
    throw new Error("Invalid teamId (NaN)");
  }

  try {
    // Optional: see which meetings are active
    const [before] = await db.query(
      "SELECT * FROM group_meetings WHERE team_id = ? AND is_active = 1",
      [teamIdNum]
    );
    console.log("🔍 Before update:", before);

    await db.query(
      `
      UPDATE group_meetings
      SET 
        is_active = 0,
        started_by = NULL,
        ended_at = NOW()
      WHERE team_id = ? AND is_active = 1
      `,
      [teamIdNum]
    );

    return { success: true, message: "Meeting ended and reset" };
  } catch (err) {
    console.error("❌ Error ending meeting:", err);
    throw err;
  }
};

/**
 * ✅ Get all meetings
 */
exports.getAllMeetings = async () => {
  const [rows] = await db.query("SELECT * FROM group_meetings ORDER BY created_at DESC");
  return rows;
};


/**
 * ✅ Start a meeting
 */
exports.startMeeting = async (teamId, userId) => {
  await db.query(
    `UPDATE group_meetings 
     SET is_active = 1, started_by = ?, started_at = NOW(), ended_at = NULL
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
