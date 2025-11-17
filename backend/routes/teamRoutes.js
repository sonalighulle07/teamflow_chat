const express = require("express");
const router = express.Router();
const meetServ = require("../controllers/services/groupMeetings");
const TeamInvite = require("../models/TeamInvite");
const { authenticateToken } = require("../middlewares/authMiddleware");
const checkTeamMember = require("../middlewares/teamAuthMiddleware");
const uploadMiddleware = require("../middlewares/uploadMiddleware");

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
  editTeamMessage,
  deleteTeamMessage,
  updateTeamMessageReactions,
  getTeamMeetingLink,
  getPendingInvites,
  respondToInvite,
  sendTeamInvites,
  getTeamsSortedByActivity,
} = require("../controllers/teamController");

// -----------------------
// Team Invites (place first!)
// -----------------------
router.post("/send-invites", authenticateToken, sendTeamInvites);
router.get("/invites", authenticateToken, getPendingInvites);
router.post("/invites/respond", authenticateToken, respondToInvite);

// -----------------------
// Team Meeting Routes
// -----------------------
router.get("/teams/:teamId/meeting-link", authenticateToken, getTeamMeetingLink);
router.post("/meetings/end/:teamId", authenticateToken, async (req, res) => {
  try {
    const result = await meetServ.endMeeting(req.params.teamId, req.user?.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to end meeting" });
  }
});

// -----------------------
// Team CRUD Routes
// -----------------------

router.get("/user/:userId/sorted", authenticateToken, getTeamsSortedByActivity);
router.get("/all", authenticateToken, getAllTeams);
router.get("/", authenticateToken, getUserTeams);
router.post("/", authenticateToken, createTeam);
router.put("/:teamId", authenticateToken, checkTeamMember, updateTeam);
router.delete("/:teamId", authenticateToken, checkTeamMember, deleteTeam);
router.get("/:teamId", authenticateToken, checkTeamMember, getTeamById);


// -----------------------
// Member Management
// -----------------------
router.post("/:teamId/members", authenticateToken, checkTeamMember, addTeamMember);
router.get("/:teamId/members", authenticateToken, checkTeamMember, getTeamMembers);

// -----------------------
// Team Chat
// -----------------------
router.get("/:teamId/messages", authenticateToken, checkTeamMember, getTeamMessages);
router.post(
  "/:teamId/messages",
  authenticateToken,
  checkTeamMember,
  uploadMiddleware.single("file"),
  sendTeamMessage
);
router.put("/:teamId/messages/:messageId", authenticateToken, checkTeamMember, editTeamMessage);
router.delete("/:teamId/messages/:messageId", authenticateToken, checkTeamMember, deleteTeamMessage);
router.put("/:teamId/messages/:messageId/reactions", authenticateToken, checkTeamMember, updateTeamMessageReactions);

module.exports = router;
