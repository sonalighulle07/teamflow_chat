const express = require('express');
const router = express.Router();
const { sendReaction } = require('../controllers/reactionController');

router.post('/', sendReaction);

module.exports = router;
