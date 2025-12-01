const express = require("express");
const router = express.Router();

const meetServ = require("../controllers/services/groupMeetings");
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
  addTeamMembers,
  addTeamMember,
  getTeamMembers,
  getTeamMessages,
  sendTeamMessage,
  editTeamMessage,
  deleteTeamMessage,
  reactMessage,
  getTeamMeetingLink,
  getPendingInvites,
  respondToInvite,
  sendTeamInvites,
  getTeamsSortedByActivity,
  removeMember
} = require("../controllers/teamController");

/* ----------------------------------------
   TEAM INVITES
---------------------------------------- */
router.post("/send-invites", authenticateToken, sendTeamInvites);
router.get("/invites", authenticateToken, getPendingInvites);
router.post("/invites/respond", authenticateToken, respondToInvite);

/* ----------------------------------------
   ACTIVE MEETING CHECK (must be BEFORE :teamId routes)
---------------------------------------- */
router.get("/team/:teamId/active", authenticateToken, async (req, res) => {
  const { teamId } = req.params;
  try {
    const active = await meetServ.getActiveMeeting(teamId);
    res.json({ active: !!active, meeting: active });
  } catch (err) {
    console.error("Error getting active meeting:", err);
    res.status(500).json({ error: "Failed to get active meeting" });
  }
});

/* ----------------------------------------
   MEETING LINKS
---------------------------------------- */
router.get("/:teamId/meeting-link", authenticateToken, getTeamMeetingLink);

router.post("/meetings/end/:teamId", authenticateToken, async (req, res) => {
  try {
    const result = await meetServ.endMeeting(req.params.teamId, req.user?.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to end meeting" });
  }
});

/* ----------------------------------------
   TEAM CRUD
---------------------------------------- */
router.get("/user/:userId/sorted", authenticateToken, getTeamsSortedByActivity);
router.get("/all", authenticateToken, getAllTeams);
router.get("/", authenticateToken, getUserTeams);

router.post("/", authenticateToken, createTeam);
router.put("/:teamId", authenticateToken, checkTeamMember, updateTeam);
router.delete("/:teamId", authenticateToken, checkTeamMember, deleteTeam);
router.get("/:teamId", authenticateToken, checkTeamMember, getTeamById);

/* ----------------------------------------
   MEMBER MANAGEMENT (FINAL CLEAN VERSION)
---------------------------------------- */

// Add multiple members
router.post("/:teamId/members", authenticateToken, addTeamMembers);

// Add single member (optional legacy)
router.post("/:teamId/members/add", authenticateToken, addTeamMember);

// List team members
router.get("/:teamId/members", authenticateToken, checkTeamMember, getTeamMembers);
// POST or DELETE method; choose what matches your app
// Remove single member (correct route)
router.delete("/:teamId/members/:memberId", authenticateToken, removeMember);



/* ----------------------------------------
   TEAM CHAT
---------------------------------------- */
router.get("/:teamId/messages", authenticateToken, checkTeamMember, getTeamMessages);

router.post(
  "/:teamId/messages",
  authenticateToken,
  checkTeamMember,
  uploadMiddleware.single("file"),
  sendTeamMessage
);

router.put(
  "/:teamId/messages/:messageId",
  authenticateToken,
  checkTeamMember,
  uploadMiddleware.single("file"),
  editTeamMessage
);

router.delete("/:teamId/messages/:messageId", authenticateToken, checkTeamMember, deleteTeamMessage);

router.put(
  "/:teamId/messages/:messageId/reactions",
  authenticateToken,
  checkTeamMember,
  reactMessage
);

module.exports = router;
