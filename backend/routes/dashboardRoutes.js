const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const { getDashboardStats } = require("../controllers/dashboard.controller");

// Protect route with JWT
router.get("/stats", authenticateToken, getDashboardStats);

module.exports = router;
