const User = require("../models/User");

exports.saveSubscription = async (req, res) => {
  const { userId, subscription } = req.body;

  if (!userId || !subscription) {
    return res.status(400).json({ error: "Missing userId or subscription" });
  }

  try {
    await User.savePushSubscription(userId, subscription);
    res.status(201).json({ message: "Subscription saved" });
  } catch (err) {
    console.error("Failed to save subscription:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
};

