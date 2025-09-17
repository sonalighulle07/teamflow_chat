const express = require('express');
const router = express.Router();
const { getUsers, updateAvatar } = require('../controllers/userController');
const upload = require('../middlewares/uploadMiddleware');

router.get('/', getUsers);
router.post('/avatar', upload.single('profile_image'), updateAvatar);

module.exports = router;
