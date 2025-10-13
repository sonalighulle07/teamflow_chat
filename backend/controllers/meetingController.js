const { v4: uuidv4 } = require("uuid");
const Meeting = require("../models/MeetingsModal");

exports.createMeeting = async (req, res) => {
  const { hostId, title, scheduledAt, type } = req.body;
  const code = uuidv4().slice(0, 8);

  // Convert ISO to MySQL DATETIME format: "YYYY-MM-DD HH:MM:SS"
  const date = new Date(scheduledAt);
  const mysqlDate = date.toISOString().slice(0, 19).replace("T", " ");


  try {
    await Meeting.createMeeting({
      hostId,
      title,
      scheduledAt: mysqlDate,
      type,
      code,
    });

    console.log("Meeting created...")

    res.status(201).json({
      meetingCode: code,
      link: `http://localhost:5173/prejoin/${code}`,
    });
  } catch (err) {
    console.error("Meeting creation failed:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getMeeting = async (req, res) => {
  const { code } = req.params;

  try {
    const meeting = await Meeting.getMeetingByCode(code);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.status(200).json(meeting);
  } catch (err) {
    console.error(" Failed to fetch meeting:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUserMeetings = async (req, res) => {
  const { userId } = req.params;

  try {
    const meetings = await Meeting.getMeetingsForUser(userId);
    res.status(200).json(meetings);
  } catch (err) {
    console.error(" Failed to fetch user meetings:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

