const fs = require('fs').promises;
const pool = require('../config/db');
const User = require('../models/User');

// ✅ Get all organizations
exports.getOrganizations = async (req, res) => {
  try {
    // Make sure your User model actually has this function or query directly from DB
    const [orgs] = await pool.query('SELECT id, name FROM organizations ORDER BY name');
    res.status(200).json(orgs);
  } catch (err) {
    console.error("Error fetching organizations:", err);
    res.status(500).json({ message: "Error fetching organizations" });
  }
};

// ✅ Register new user
exports.registerUser = async (req, res) => {
  try {
    const { full_name, email, contact, username, password, organization_id } = req.body;

    if (!organization_id) {
      return res.status(400).json({ success: false, message: "Organization is required" });
    }

    // Make sure your User.create handles password hashing
    const userId = await User.create({
      full_name,
      email,
      contact,
      username,
      password,
      organization_id,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      userId,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
};

// ✅ Get all users
exports.getUsers = async (req, res) => {
  try {
    const { organization_id } = req.query; // get orgId from query params

    let users;
    if (organization_id) {
      users = await User.getAllByOrganization(organization_id);
    } else {
      // fallback: fetch all (if admin)
      const [rows] = await pool.query(
        `SELECT id, full_name, username, profile_image, is_online FROM users ORDER BY username ASC`
      );
      users = rows;
    }

    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Error fetching users" });
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

    if (!updatedUser)
      return res.status(404).json({ error: "User not found or update failed" });

    res.json({
      success: true,
      message: "Avatar updated successfully",
      profile_image: updatedUser.profile_image || filePath,
    });
  } catch (err) {
    console.error("Error updating avatar:", err);
    res.status(500).json({ error: "Failed to update avatar" });
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
        console.warn("Avatar delete warning:", err);
      }
    }

    // Remove avatar path from DB
    await User.updateAvatar(userId, null);
    res.json({ success: true, message: "Avatar removed" });
  } catch (err) {
    console.error("Remove avatar error:", err);
    res.status(500).json({ error: "Failed to remove avatar" });
  }
};

// ✅ Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("Deleting userId:", userId);

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID missing" });
    }

    const result = await User.deleteById(userId);
    console.log("Delete result:", result);

    if (result) {
      res.json({ success: true, message: "User deleted successfully" });
    } else {
      res.status(404).json({ success: false, message: "User not found or delete failed" });
    }
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
