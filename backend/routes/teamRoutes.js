const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/teamController");

// GET all teams
router.get("/all", getAllTeams);

// GET teams for a specific user
router.get("/", getUserTeams);

// GET single team by ID
router.get("/:id", getTeamById);

// CREATE a new team
router.post("/", createTeam);

// UPDATE a team
router.put("/:id", updateTeam);

// DELETE a team
router.delete("/:id", deleteTeam);

// ADD member to a team
router.post("/:id/members", addTeamMember);

// GET members of a team
router.get("/:id/members", getTeamMembers);

// GET messages of a team
router.get("/:id/messages", getTeamMessages);

// SEND message to a team
router.post("/:id/messages", sendTeamMessage);

module.exports = router;

