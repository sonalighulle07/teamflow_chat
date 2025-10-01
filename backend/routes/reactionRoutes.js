const express = require('express');
const router = express.Router();
const { sendReaction } = require('../controllers/reactionController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// routes/chatRoutes.js
router.post("/:msgId/react", authenticateToken, sendReaction);

module.exports = router;
