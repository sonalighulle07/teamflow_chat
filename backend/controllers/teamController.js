const { Team, TeamMember, TeamMessage } = require("../models/TeamModel");
const db = require("../Utils/db");

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
  console.log("Request for getUserTeams...")
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "Missing userId in query" });

  try {
    const [teams] = await Team.getByUser(userId);
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
  const { id } = req.params;
  try {
    const [team] = await Team.getById(id);
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
  console.log("Request for createTeam")
  const { name, created_by, members } = req.body;
  if (!name || !created_by) return res.status(400).json({ error: "Name and created_by are required" });

  try {
    const result = await Team.create(name, created_by);
const teamId = result.insertId;

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
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Team name is required" });

  try {
    await Team.update(id, name);
    res.json({ id, name });
  } catch (err) {
    console.error("Failed to update team:", err);
    res.status(500).json({ error: "Failed to update team" });
  }
};

// -----------------------
// DELETE a team
// -----------------------
const deleteTeam = async (req, res) => {
  const { id } = req.params;
  try {

 await Team.delete(id);
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
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "User ID is required" });

  try {
    await TeamMember.add(id, user_id);
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
  const { id } = req.params;
  try {
    const [members] = await TeamMember.getMembers(id);
    res.json(members);
  } catch (err) {
    console.error("Failed to fetch team members:", err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
};

// -----------------------
// GET rich team messages
// -----------------------
const getTeamMessages = async (req, res) => {
  const { id } = req.params;
  try {
    const [messages] = await db.query(
      "SELECT * FROM team_messages WHERE team_id = ? ORDER BY created_at ASC",
      [id]

);
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch team messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// -----------------------
// SEND rich team message
// -----------------------
const sendTeamMessage = async (req, res) => {
  const { id } = req.params;
  const { sender_id, text, file_url, type, file_name } = req.body;
  try {
    const result = await TeamMessage.insert(sender_id, id, text, file_url, type, file_name);
    res.json({ id: result.insertId, team_id: id, sender_id, text, file_url, type, file_name });
  } catch (err) {
    console.error("Failed to send message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// -----------------------
// EDIT rich team message
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
// DELETE rich team message
// -----------------------
const deleteTeamMessage = async (req, res) => {
  const { messageId } = req.params;
  try {
    await TeamMessage.delete(messageId);
    res.json({ success: true });
  } catch (err) {

console.error("Failed to delete message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// -----------------------
// UPDATE reactions on rich team message
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
};

