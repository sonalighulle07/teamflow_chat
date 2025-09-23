const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
 
// GET सर्व messages
router.get("/", chatController.getMessages);
 
// GET दोन users मधील conversation
router.get("/:user1/:user2", chatController.getConversation);
 
// POST नवीन message पाठवण्यासाठी
router.post("/send", chatController.sendMessage);
 
module.exports = router;