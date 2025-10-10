const User = require('../models/User');
const fs = require('fs').promises;

// ✅ Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    return res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
};

// ✅ Update user avatar
exports.updateAvatar = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = `/uploads/${req.file.filename}`;
    const updatedUser = await User.updateAvatar(userId, filePath);

    if (!updatedUser) return res.status(404).json({ error: "User not found or update failed" });

    return res.json({
      message: "Avatar updated successfully",
      profile_image: updatedUser.profile_image || filePath,
    });
  } catch (err) {
    console.error("Error updating avatar:", err);
    return res.status(500).json({ error: "Failed to update avatar" });
  }
};

// ✅ Remove avatar permanently
exports.removeAvatar = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Delete file from disk if exists
    if (user.profile_image) {
      const filePath = `./public${user.profile_image}`;
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn("Failed to delete avatar:", err);
      }
    }

    // Remove avatar path from DB
    await User.updateAvatar(userId, null);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to remove avatar" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("Deleting userId:", userId);

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId missing" });
    }

    const result = await User.deleteById(userId); // safe delete
    console.log("Delete result:", result);

    if (result) {
      return res.json({ success: true });
    } else {
      return res.status(404).json({ success: false, message: "User not found or delete failed" });
    }
  } catch (err) {
    console.error("Delete account error:", err); // log full error
    res.status(500).json({ success: false, message: "Server error" });
  }
};
