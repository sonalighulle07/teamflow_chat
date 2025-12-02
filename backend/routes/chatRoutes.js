const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const upload = require("../middlewares/uploadMiddleware");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.put("/chats/:id", upload.single("file"), chatController.updateChat);
router.get("/last-messages/:userId", chatController.getLastMessagesByUser);
router.get("/", authenticateToken, chatController.getMessages);
router.get("/:user1/:user2", chatController.getConversation);
router.post("/send", authenticateToken, upload.single("file"), chatController.sendMessage);
router.post("/:messageId/react", authenticateToken, chatController.reactMessage);
router.delete("/:messageId", authenticateToken, chatController.deleteMessage);
router.put("/edit/:messageId", authenticateToken, chatController.editMessage);
router.post("/:messageId/forward", authenticateToken, chatController.forwardMessage);

module.exports = router;
