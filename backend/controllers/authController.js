const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper validation functions
const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
const isValidContact = (contact) => /^[0-9]{10,15}$/.test(contact);

exports.register = async (req, res) => {
  try {
    const { full_name, email, contact, username, password, confirmPassword } = req.body;

    // ===== Basic validation =====
    if (!full_name || !email || !contact || !username || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (full_name.length < 3) {
      return res.status(400).json({ success: false, message: 'Full name must be at least 3 characters' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (!isValidContact(contact)) {
      return res.status(400).json({ success: false, message: 'Contact must be 10–15 digits' });
    }

    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // ===== Uniqueness check =====
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // ===== Save user =====
    const hashed = await bcrypt.hash(password, 10);
    const userId = await User.create({ full_name, email, contact, username, password: hashed });

    // ===== JWT Token =====
    const token = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: 'Registration successful',
      user: { id: userId, full_name, email, contact, username },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

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

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, full_name: user.full_name, email: user.email, contact: user.contact, username: user.username },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};
