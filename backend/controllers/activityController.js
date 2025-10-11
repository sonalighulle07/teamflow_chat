// controllers/activityController.js
import * as Activity from "../models/activityModel.js";

export const fetchUserActivities = async (req, res) => {
  const { userId } = req.params;
  try {
    const activities = await Activity.getActivitiesByUser(userId);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};

export const addActivity = async (req, res) => {
  try {
    const activity = await Activity.createActivity(req.body);
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: "Failed to create activity" });
  }
};

export const readActivity = async (req, res) => {
  const { id } = req.params;
  try {
    await Activity.markActivityRead(id);
    res.json({ message: "Activity marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark activity read" });
  }
};
