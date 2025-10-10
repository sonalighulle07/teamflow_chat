const Event = require('../models/Event');
const db = require("../Utils/db"); // If you use raw DB queries

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.getAll();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.createEvent = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const event = await Event.create(req.body);
    res.json(event);
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.update(req.params.id, req.body);
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    await Event.delete(req.params.id);
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
