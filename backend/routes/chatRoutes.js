const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const upload = require("../middlewares/uploadMiddleware");
const { authenticateToken } = require("../middlewares/authMiddleware"); // <-- import it
const { getLastMessagesByUser } = require("../controllers/chatController");

router.get("/last-messages/:userId", getLastMessagesByUser);
// GET all messages
router.get("/", authenticateToken, chatController.getMessages);

// GET conversation between two users
router.get("/:user1/:user2",  chatController.getConversation);

// POST send message (text or file)
router.post("/send", authenticateToken, upload.single("file"), chatController.sendMessage);

// React to a message
router.post("/:messageId/react", authenticateToken, chatController.reactMessage);

// DELETE
router.delete("/:messageId", authenticateToken, chatController.deleteMessage);

// PUT edit
router.put("/:messageId", authenticateToken, chatController.editMessage);

// POST forward
router.post("/:messageId/forward", authenticateToken, chatController.forwardMessage);


module.exports = router;
