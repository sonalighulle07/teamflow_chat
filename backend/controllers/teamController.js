const { Team, TeamMember, TeamMessage } = require("../models/TeamModel");
const db = require("../config/db");
const path = require("path");
const meetServ = require("./services/groupMeetings")
// -----------------------
// GET all teams
// -----------------------
const getAllTeams = async (req, res) => {
  try {
    const [teams] = await Team.getAll();
    res.json(teams);
  } catch (err) {
    console.error("Failed to fetch teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
};

// -----------------------
// GET teams for a user
// -----------------------
const getUserTeams = async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "Missing userId in query" });

  try {
    const teams = await Team.getByUser(userId); // remove extra destructuring
    res.json(teams);
  } catch (err) {
    console.error("Failed to fetch user teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
};


// -----------------------
// GET single team by ID
// -----------------------
const getTeamById = async (req, res) => {
  console.log("getTeamById called with params:", req.params);
  const { teamId } = req.params;
  try {
    const [team] = await Team.getById(teamId);
    if (!team.length) return res.status(404).json({ error: "Team not found" });
    res.json(team[0]);
  } catch (err) {
    console.error("Failed to fetch team:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
};

// -----------------------
// CREATE a new team
// -----------------------
const createTeam = async (req, res) => {
  const { name, created_by, members } = req.body;
  if (!name || !created_by) return res.status(400).json({ error: "Name and created_by are required" });

  try {
    const result = await Team.create(name, created_by);
    const teamId = result.insertId;

    const meetRes = await meetServ.createMeeting(teamId);

    console.log("Meeting creation result:", meetRes);

    if (!teamId) throw new Error("Team creation failed: missing teamId");

    if (members && members.length > 0) {
      for (const userId of members) {
        await TeamMember.add(teamId, userId);
      }
    }

    res.json({ id: teamId, name, created_by, members: members || [] });
  } catch (err) {
    console.error("Team creation failed:", err);
    res.status(500).json({ error: "Failed to create team" });
  }
};

// -----------------------
// UPDATE a team
// -----------------------
const updateTeam = async (req, res) => {
  const { teamId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Team name is required" });

  try {
    await Team.update(teamId, name);
    res.json({ teamId, name });
  } catch (err) {
    console.error("Failed to update team:", err);
    res.status(500).json({ error: "Failed to update team" });
  }
};

// -----------------------
// DELETE a team
// -----------------------
const deleteTeam = async (req, res) => {
  const { teamId } = req.params;
  try {
    await Team.delete(teamId);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete team:", err);
    res.status(500).json({ error: "Failed to delete team" });
  }
};

// -----------------------
// ADD member to a team
// -----------------------
const addTeamMember = async (req, res) => {
  const { teamId } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "User ID is required" });

  try {
    await TeamMember.add(teamId, user_id);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to add member:", err);
    res.status(500).json({ error: "Failed to add member" });
  }
};

// -----------------------
// GET members of a team
// -----------------------
const getTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  console.log("getTeamMembers called with team ID:", teamId);
  try {
    const members = await TeamMember.getMembers(teamId);
    res.json(members);
  } catch (err) {
    console.error("Failed to fetch team members:", err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
};

// -----------------------
// GET team messages
// -----------------------
const getTeamMessages = async (req, res) => {
  const { teamId } = req.params;
  try {
    const [messages] = await db.query(
      "SELECT * FROM team_messages WHERE team_id = ? ORDER BY created_at ASC",
      [teamId]
    );
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch team messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// -----------------------
// SEND team message (with file support + metadata)
// -----------------------
const sendTeamMessage = async (req, res) => {
  const teamId = req.params.teamId;
  const senderId = req.user?.id;
  const { text, type, metadata } = req.body; // include metadata

  const file = req.file;

  if (!senderId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    let fileUrl = null;
    let fileName = null;

    if (file) {
      fileUrl = `/uploads/${file.filename}`;
      fileName = file.originalname;
    }

    // Insert message into DB
    const result = await TeamMessage.insert(
      senderId,
      teamId,
      text || "",
      fileUrl,
      type || (file ? "file" : "text"),
      fileName,
      metadata || null
    );

    res.json({
      id: result.insertId,
      team_id: teamId,
      sender_id: senderId,
      text: text || "",
      file_url: fileUrl,
      file_name: fileName,
      type: type || (file ? "file" : "text"),
      metadata: metadata || null,
      created_at: new Date(),
    });
  } catch (err) {
    console.error("Failed to send message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};



// -----------------------
// EDIT team message
// -----------------------
const editTeamMessage = async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;
  try {
    await TeamMessage.updateText(messageId, text);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to edit message:", err);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

// -----------------------
// DELETE team message
// -----------------------
const deleteTeamMessage = async (req, res) => {
  console.log("Delete team msg")
  const { messageId } = req.params;
  try {
    await TeamMessage.deletePermanent(messageId);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// -----------------------
// UPDATE reactions on team message
// -----------------------
const updateTeamMessageReactions = async (req, res) => {
  const { messageId } = req.params;
  const { reactions } = req.body;
  try {
    await TeamMessage.updateReactions(messageId, JSON.stringify(reactions));
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to update reactions:", err);
    res.status(500).json({ error: "Failed to update reactions" });
  }
};


// -----------------------
// GET or CREATE meeting link for a team
// -----------------------
const getTeamMeetingLink = async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user?.id || null; // ✅ get user from auth middleware

  console.log("📡 getTeamMeetingLink called with:", { teamId, userId });

  if (!teamId) {
    return res.status(400).json({ error: "teamId is required" });
  }

  try {
    console.log("calling service");
    const { meetingCode, status } = await meetServ.getOrCreateMeetingCode(teamId, userId);

    console.log("✅ Meeting code fetched/created:", meetingCode);

    const baseUrl = process.env.APP_URL || "http://localhost:5173";
    const meetingUrl = `${baseUrl}/prejoin/${meetingCode}`;

    return res.json({ teamId, meetingCode, meetingUrl, status });
  } catch (err) {
    console.error("❌ Failed to fetch/create meeting link:", err);
    return res.status(500).json({ error: "Failed to fetch/create meeting link" });
  }
};




module.exports = {
  getAllTeams,
  getUserTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  getTeamMembers,
  getTeamMessages,
  sendTeamMessage,
  editTeamMessage,
  deleteTeamMessage,
  updateTeamMessageReactions,
  getTeamMeetingLink,
};
