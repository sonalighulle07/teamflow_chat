const express = require("express");
const router = express.Router();

// Middlewares
const { authenticateToken } = require("../middlewares/authMiddleware"); // general auth
const checkTeamMember = require("../middlewares/teamAuthMiddleware");   // check team membership
const uploadMiddleware = require("../middlewares/uploadMiddleware");     // file upload

// Controllers
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

// -----------------------
// Teams Routes
// -----------------------

// GET all teams (authenticated)
router.get("/all", authenticateToken, getAllTeams);

// GET teams for a specific user (authenticated)
router.get("/", authenticateToken, getUserTeams);

// GET single team by ID (authenticated + team member)
router.get("/:id", authenticateToken, checkTeamMember, getTeamById);

// CREATE a new team (authenticated)
router.post("/", authenticateToken, createTeam);

// UPDATE a team (authenticated + team member)
router.put("/:id", authenticateToken, checkTeamMember, updateTeam);

// DELETE a team (authenticated + team member)
router.delete("/:id", authenticateToken, checkTeamMember, deleteTeam);

// ADD member to a team (authenticated + team member)
router.post("/:id/members", authenticateToken, checkTeamMember, addTeamMember);

// GET members of a team (authenticated + team member)
router.get("/:id/members", authenticateToken, checkTeamMember, getTeamMembers);

// GET messages of a team (authenticated + team member)
router.get("/:id/messages", authenticateToken, checkTeamMember, getTeamMessages);

// SEND message to a team (authenticated + team member + file upload)
router.post(
  "/:id/messages",
  authenticateToken,
  checkTeamMember,
  uploadMiddleware.single("file"), // for single file upload
  sendTeamMessage
);

module.exports = router;
