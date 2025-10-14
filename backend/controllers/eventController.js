const Event = require('../models/Event');
 
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.getAll();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
 
// ✅ Create Event with Socket.IO
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
 
    // Emit eventCreated to all connected clients
    if (req.io) req.io.emit("eventCreated", event);
 
    res.json(event);
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ error: "Server error" });
  }
};
 
// ✅ Update Event with Socket.IO
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.update(req.params.id, req.body);
 
    // Emit eventUpdated to all connected clients
    if (req.io) req.io.emit("eventUpdated", event);
 
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
 
// ✅ Delete Event with Socket.IO
exports.deleteEvent = async (req, res) => {
  try {
    await Event.delete(req.params.id);
 
    // Emit eventDeleted with the deleted event id
    if (req.io) req.io.emit("eventDeleted", { id: req.params.id });
 
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};