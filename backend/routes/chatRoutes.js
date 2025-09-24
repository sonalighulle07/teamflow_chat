const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const upload = require("../middlewares/uploadMiddleware"); // your multer middleware

// GET all messages
router.get("/", chatController.getMessages);

// GET conversation between two users
router.get("/:user1/:user2", chatController.getConversation);

// POST send message (text or file)
router.post("/send", upload.single("file"), chatController.sendMessage);

module.exports = router;
