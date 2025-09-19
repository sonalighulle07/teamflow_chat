const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ===== Register =====
exports.register = async (req, res) => {
  try {
    const { full_name, email, contact, username, password } = req.body;


    if (!full_name || !email || !contact || !username || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if username or email already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = await User.create({
      full_name,
      email,
      contact,
      username,
      password: hashedPassword
    });

    // Generate JWT
    const token = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: { id: userId, username },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Registration failed' });
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

    // Optional: set user as online
    const pool = require('../utils/db');
    await pool.query('UPDATE users SET is_online = 1 WHERE id = ?', [user.id]);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, username: user.username },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};


// Check username availability
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

// Check email availability
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
