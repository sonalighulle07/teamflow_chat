const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'All fields required' });

        const existing = await User.findByUsername(username);
        if (existing) return res.status(400).json({ error: 'Username already exists' });

        const hashed = await bcrypt.hash(password, 10);
        const userId = await User.create(username, hashed);

        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret_key');
        res.json({ id: userId, username, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'All fields required' });

        const user = await User.findByUsername(username);
        if (!user) return res.status(400).json({ error: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Incorrect password' });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key');
        res.json({ id: user.id, username: user.username, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
};
