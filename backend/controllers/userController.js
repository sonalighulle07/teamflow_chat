const User = require('../models/User');

exports.getUsers = async (req, res) => {
    try {
        const users = await User.getAll();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

exports.updateAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const filePath = `/uploads/${req.file.filename}`;
        const user = await User.updateAvatar(req.body.userId, filePath);
        res.json({ profile_image: user.profile_image });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update avatar' });
    }
};
