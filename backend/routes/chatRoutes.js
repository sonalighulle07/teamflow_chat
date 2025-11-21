const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const upload = require("../middlewares/uploadMiddleware");
const { authenticateToken } = require("../middlewares/authMiddleware");

// Update Chat
router.put("/chats/:id", upload.single("file"), chatController.updateChat);

// Last messages
router.get("/last-messages/:userId", chatController.getLastMessagesByUser);

// GET all messages
router.get("/", authenticateToken, chatController.getMessages);

// GET conversation
router.get("/:user1/:user2", chatController.getConversation);

// Send message
router.post("/send", authenticateToken, upload.single("file"), chatController.sendMessage);

// React to message
router.post("/:messageId/react", authenticateToken, chatController.reactMessage);

// Delete message
router.delete("/:messageId", authenticateToken, chatController.deleteMessage);

// Edit message
router.put("/edit/:messageId", authenticateToken, chatController.editMessage);

// Forward message
router.post("/:messageId/forward", authenticateToken, chatController.forwardMessage);

module.exports = router;
