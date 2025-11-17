const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // ✅ Import your DB connection
const User = require('../models/User');


// ===== Register =====
exports.register = async (req, res) => {
  try {
    const { full_name, email, contact, username, password, organization_id } = req.body;
    console.log("📥 Incoming registration data:", req.body); 

    // ✅ Validate organization selection
    if (!organization_id) {
      return res.status(400).json({ success: false, message: "Organization ID is required" });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Insert new user
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, contact, username, password, organization_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, contact, username, hashedPassword, organization_id]
    );

    const userId = result.insertId;

    // ✅ Generate JWT token
    const token = jwt.sign({ id: userId, username }, process.env.JWT_SECRET || "secret_key", {
      expiresIn: "7d",
    });

    // ✅ Response
    res.status(201).json({
      success: true,
      message: " registered successfully!",
      user: { id: userId, full_name, email, username, organization_id },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
};

// ===== Login =====
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    // ✅ Set user as online
    await pool.query('UPDATE users SET is_online = 1 WHERE id = ?', [user.id]);

    // ✅ Generate JWT
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, username: user.username, organization_id: user.organization_id },
      token
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: 'Login failed due to server error' });
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
