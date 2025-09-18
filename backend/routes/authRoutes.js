const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Register a new user
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

// Live username availability check
router.get("/check-username", authController.checkUsername);

// Live email availability check
router.get("/check-email", authController.checkEmail);

module.exports = router;
