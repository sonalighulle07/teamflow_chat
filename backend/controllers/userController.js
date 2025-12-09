const fs = require('fs').promises;
const pool = require('../config/db');
const User = require('../models/User');

// ==========================================================
// SUPER ADMIN: Create new organization
// ==========================================================
exports.createOrganization = async (req, res) => {
  try {
    const { name, email, contact, address, status } = req.body;

    if (!name || !email || !contact || !address) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    const domain = email.split("@")[1]?.toLowerCase();

    const [existing] = await pool.query(
      "SELECT id FROM organizations WHERE domain = ? LIMIT 1",
      [domain]
    );

    if (existing.length > 0) {
      return res.json({
        success: false,
        message: "Organization domain already exists",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO organizations 
      (name, address, email, contact, domain, status)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [name, address, email, contact, domain, status || "active"]
    );

    res.json({
      success: true,
      message: "Organization created successfully",
      organization_id: result.insertId,
    });

  } catch (err) {
    console.log("Create Org Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// ==========================================================
// SUPER ADMIN: Fetch all organizations
// ==========================================================
exports.getAllOrganizations = async (req, res) => {
  try {
    const [orgs] = await pool.query(
      "SELECT id, name, created_at FROM organizations ORDER BY id DESC"
    );
    res.status(200).json(orgs);
  } catch (err) {
    console.error("Error fetching all orgs:", err);
    res.status(500).json({ message: "Error fetching organizations" });
  }
};

// ==========================================================
// Get organizations (normal users)
// ==========================================================
exports.getOrganizations = async (req, res) => {
  try {
    const [orgs] = await pool.query('SELECT id, name FROM organizations ORDER BY name');
    res.status(200).json(orgs);
  } catch (err) {
    console.error("Error fetching organizations:", err);
    res.status(500).json({ message: "Error fetching organizations" });
  }
};

// ==========================================================
// Register new user  (UPDATED -> role support)
// ==========================================================
exports.registerUser = async (req, res) => {
  try {
    const { full_name, email, contact, username, password, role } = req.body;

    // 1. Validate required fields
    if (!full_name || !email || !contact || !username || !password) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    // 2. Super Admin cannot be created from frontend
    if (role === "super_admin") {
      return res.status(400).json({ success: false, message: "Super Admin cannot be registered" });
    }

    // 3. Extract domain from email
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // 4. Check if organization exists with this domain
    const [org] = await pool.query(
      "SELECT id FROM organizations WHERE domain = ? LIMIT 1",
      [domain]
    );

    if (org.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Organization does not exist. Contact your admin.",
      });
    }

    const organization_id = org[0].id; // ⭐ assign organization

    // 5. Check if username/email already used
    const [existingUser] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1",
      [email, username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email or username is already registered."
      });
    }

    // 6. Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Create user under the found organization
    const [result] = await pool.query(
      `INSERT INTO users 
      (full_name, email, username, contact, password, role, organization_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, username, contact, hashedPassword, role, organization_id]
    );

    // 8. Respond
    return res.status(200).json({
      success: true,
      message: "Registered successfully",
      user_id: result.insertId,
      organization_id,
    });

  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



// ==========================================================
// Get all users (UPDATED -> return roles + correct status field)
// ==========================================================
exports.getUsers = async (req, res) => {
  try {
    const { organization_id } = req.query;

    let users;

    const query = `
      SELECT 
        id, 
        full_name, 
        username, 
        profile_image, 
        status,        -- corrected field
        role 
      FROM users
      ${organization_id ? "WHERE organization_id = ?" : ""}
      ORDER BY username ASC
    `;

    if (organization_id) {
      const [rows] = await pool.query(query, [organization_id]);
      users = rows;
    } else {
      const [rows] = await pool.query(query);
      users = rows;
    }

    res.status(200).json(users);

  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
};


// ==========================================================
// Update Avatar
// ==========================================================
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

// ==========================================================
// Remove Avatar
// ==========================================================
exports.removeAvatar = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Delete file from disk
    if (user.profile_image) {
      const filePath = `./public${user.profile_image}`;
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn("Avatar delete warning:", err);
      }
    }

    await User.updateAvatar(userId, null);
    res.json({ success: true, message: "Avatar removed" });
  } catch (err) {
    console.error("Remove avatar error:", err);
    res.status(500).json({ error: "Failed to remove avatar" });
  }
};

// ==========================================================
// Delete User Account
// ==========================================================
exports.deleteAccount = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("Deleting userId:", userId);

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID missing" });
    }

    const result = await User.deleteById(userId);

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
