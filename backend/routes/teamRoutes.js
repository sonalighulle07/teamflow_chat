const express = require("express");
const router = express.Router();

// Middlewares
const { authenticateToken } = require("../middlewares/authMiddleware");
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
  updateTeamMessageReactions   // ✅ correct
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

module.exports = router;
