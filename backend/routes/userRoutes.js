const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: './public/uploads/' });

const userController = require('../controllers/userController');

// ============ SUPER ADMIN MIDDLEWARE ============
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "superAdmin") {
    return res.status(403).json({ message: "Access denied. Super Admin only." });
  }
  next();
};

// ============ EXISTING ROUTES ============
router.get('/', userController.getUsers);
router.post("/register", userController.registerUser);
router.post('/avatar', upload.single('profile_image'), userController.updateAvatar);
router.post('/remove-avatar', userController.removeAvatar);
router.post('/delete-account', userController.deleteAccount);
router.get("/organizations", userController.getOrganizations);

// ============ SUPER ADMIN ROUTES ============
router.get("/super-admin/organizations", requireSuperAdmin, userController.getAllOrganizations);
router.post("/super-admin/create-organization", requireSuperAdmin, userController.createOrganization);

module.exports = router;
