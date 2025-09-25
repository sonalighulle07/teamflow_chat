const express = require("express");
const router = express.Router();
const {
  createMeeting,
  getMeeting,
  getUserMeetings,
} = require("../controllers/meetingController");

router.post("/create", createMeeting);
router.get("/:code", getMeeting);
router.get("/user/:userId", getUserMeetings);

module.exports = router;

