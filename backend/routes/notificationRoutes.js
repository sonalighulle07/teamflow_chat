const express = require("express");
const router = express.Router();
const { saveSubscription } = require("../controllers/notificationController");

router.post("/", saveSubscription); // ✅ Matches POST /api/subscribe

module.exports = router;
