const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const User = require("../models/User");

// =====================================================
// REGISTER USER (Only allow if organization/domain exists)
// =====================================================

exports.register = async (req, res) => {
  try {
    const { full_name, email, contact, username, password, role } = req.body;

    // extract domain
    const domain = email.split("@")[1];

    // check if organization exists
    const [orgRows] = await pool.query(
      "SELECT id FROM organizations WHERE domain = ? LIMIT 1",
      [domain]
    );

    if (orgRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This email domain has no registered organization. Contact support."
      });
    }

    const organization_id = orgRows[0].id;

    // ===== Email exists? =====
    const existingEmail = await User.findByEmail(email);
    if (existingEmail)
      return res.status(400).json({ success: false, message: "Email already used" });

    // ===== Username exists? =====
    const existingUser = await User.findByUsername(username);
    if (existingUser)
      return res.status(400).json({ success: false, message: "Username taken" });

    // ===== Role handling =====
    let finalRole = role;

    // prevent frontend from creating super_admin
    if (finalRole === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "You cannot create a Super Admin"
      });
    }

    // default fallback
    if (!finalRole) finalRole = "user";

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, contact, username, password, role, organization_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, contact, username, hashedPassword, finalRole, organization_id]
    );

    const token = jwt.sign(
      { id: result.insertId, role: finalRole },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Registration successful",
      user: {
        id: result.insertId,
        full_name,
        email,
        username,
        role: finalRole,
        organization_id,
      },
      token,
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// =====================================================
// LOGIN
// =====================================================
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findByUsername(username);
    if (!user)
      return res.status(400).json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ success: false, message: "Incorrect password" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      user,
      token,
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// ===== Check username availability =====
exports.checkUsername = async (req, res) => {
  try {
    const username = req.query.username;
    if (!username) return res.json({ available: false });

    const user = await User.findByUsername(username);
    res.json({ available: !user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ available: false });
  }
};

// ===== Check email availability =====
exports.checkEmail = async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.json({ available: false });

    const user = await User.findByEmail(email);
    res.json({ available: !user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ available: false });
  }
};
