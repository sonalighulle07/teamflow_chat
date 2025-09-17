const express = require('express');
const router = express.Router();
const { sendMessage, getChats } = require('../controllers/chatController');
const upload = require('../middlewares/uploadMiddleware');

router.post('/', upload.single('file'), sendMessage);
router.get('/:userId/:otherId', getChats);

module.exports = router;
