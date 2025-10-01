const { Team, TeamMember, TeamChat } = require("../models/TeamModel");

const getAllTeams = async (req, res) => {
  const teams = await Team.getAll();
  res.json(teams);
};

const createTeam = async (req, res) => {
  const { name, created_by, members } = req.body;
  if (!name || !created_by) return res.status(400).json({ error: "Name and created_by are required" });

  try {
    const result = await Team.create(name, created_by);
    const teamId = result.insertId;

    if (members && members.length > 0) {
      for (const userId of members) {
        await TeamMember.add(teamId, userId);
      }
    }

    res.json({ id: teamId, name, created_by });
  } catch (err) {
    console.error("Team creation failed:", err);
    res.status(500).json({ error: "Failed to create team" });
  }
};

const addTeamMember = async (req, res) => {
  const { teamId } = req.params;
  const { user_id } = req.body;
  await TeamMember.add(teamId, user_id);
  res.json({ success: true });
};

const getTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  const members = await TeamMember.getMembers(teamId);
  res.json(members);
};

const getTeamMessages = async (req, res) => {
  const { teamId } = req.params;
  const messages = await TeamChat.getMessages(teamId);
  res.json(messages);
};

const sendTeamMessage = async (req, res) => {
  const { teamId } = req.params;
  const { sender_id, message, file_url, file_type } = req.body;
  const result = await TeamChat.addMessage(teamId, sender_id, message, file_url, file_type);
  res.json({ id: result.insertId, teamId, sender_id, message, file_url, file_type });
};

module.exports = {
  getAllTeams,
  createTeam,
  addTeamMember,
  getTeamMembers,
  getTeamMessages,
  sendTeamMessage,
};
