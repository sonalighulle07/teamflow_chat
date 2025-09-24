const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const upload = require('../middlewares/uploadMiddleware');

// GET all messages
router.get("/", chatController.getMessages);

// GET conversation between 2 users
router.get("/:user1/:user2", chatController.getConversation);

// POST message with optional file
router.post("/send", upload.single("file"), chatController.sendMessage);

module.exports = router;
