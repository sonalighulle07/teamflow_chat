const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: './public/uploads/' });
const userController = require('../controllers/userController');

router.get('/', userController.getUsers);
router.post("/register", userController.registerUser);
router.post('/avatar', upload.single('profile_image'), userController.updateAvatar);
router.post('/remove-avatar', userController.removeAvatar);
router.post('/delete-account', userController.deleteAccount);
router.get("/organizations", userController.getOrganizations);

module.exports = router;
