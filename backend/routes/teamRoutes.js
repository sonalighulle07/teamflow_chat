const express = require("express");
const router = express.Router();
const meetServ = require("../controllers/services/groupMeetings");

// Middlewares
const { authenticateToken } = require("../middlewares/authMiddleware")
const checkTeamMember = require("../middlewares/teamAuthMiddleware");
const uploadMiddleware = require("../middlewares/uploadMiddleware");

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
  editTeamMessage,              
  deleteTeamMessage,           // ✅ correct
  updateTeamMessageReactions,   // ✅ correct
  getTeamMeetingLink
} = require("../controllers/teamController");

// -----------------------
// Team Routes
// -----------------------

router.get("/all", authenticateToken, getAllTeams);
router.get("/", authenticateToken, getUserTeams);
router.get("/:teamId", authenticateToken, checkTeamMember, getTeamById);
router.post("/", authenticateToken, createTeam);
router.put("/:teamId", authenticateToken, checkTeamMember, updateTeam);
router.delete("/:teamId", authenticateToken, checkTeamMember, deleteTeam);
router.post("/:teamId/members", authenticateToken, checkTeamMember, addTeamMember);
router.get("/:teamId/members", authenticateToken, checkTeamMember, getTeamMembers);

// -----------------------
// Team Chat Routes
// -----------------------

router.get("/:teamId/messages", authenticateToken, checkTeamMember, getTeamMessages);
router.post("/:teamId/messages",
  authenticateToken,
  checkTeamMember,
  uploadMiddleware.single("file"),
  sendTeamMessage
);

// ✅ UPDATE (EDIT) TEAM MESSAGE
router.put(
  "/:teamId/messages/:messageId",
  authenticateToken,
  checkTeamMember,
  editTeamMessage   // ✅ Correct function name
);


// Delete team message
router.delete("/:teamId/messages/:messageId",
  authenticateToken,
  checkTeamMember,
  deleteTeamMessage
);

// Update reaction
router.put("/:teamId/messages/:messageId/reactions",
  authenticateToken,
  checkTeamMember,
  updateTeamMessageReactions
);

// -----------------------
// Team Meeting Routes
// -----------------------

// Team-level meeting link
router.get("/teams/:teamId/meeting-link", getTeamMeetingLink);

// End meeting
router.post("/meetings/end/:teamId", async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user?.id || null;
  try {
    const result = await meetServ.endMeeting(teamId, userId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to end meeting" });
  }
});

// ✅ Get active meeting for a team
router.get("/team/:teamId/active", async (req, res) => {
  const { teamId } = req.params;
  try {
    const active = await meetServ.getActiveMeeting(teamId);
    res.json({ active: !!active, meeting: active });
  } catch (err) {
    console.error("Error getting active meeting:", err);
    res.status(500).json({ error: "Failed to get active meeting" });
  }
});




module.exports = router;
