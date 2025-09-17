const Chat = require('../models/Chat');

exports.sendMessage = async (req, res) => {
    try {
        const { senderId, receiverId, text } = req.body;
        let fileUrl = null, fileType = null, type = 'text';
        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
            fileType = req.file.mimetype;
            type = fileType.startsWith('image') ? 'image' :
                   fileType.startsWith('video') ? 'video' :
                   fileType.startsWith('audio') ? 'audio' : 'file';
        }

        const message = await Chat.send({ senderId, receiverId, text, fileUrl, fileType, type });
        res.json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Message send failed' });
    }
};

exports.getChats = async (req, res) => {
    try {
        const { userId, otherId } = req.params;
        const messages = await Chat.fetchChat(userId, otherId);
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chat fetch failed' });
    }
};
