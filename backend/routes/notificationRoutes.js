const express = require("express");
const router = express.Router();
const { saveSubscription } = require("../controllers/notificationController");

router.post("/", saveSubscription); 

module.exports = router;
