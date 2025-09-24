const chatModel = require('../models/chatModel');

exports.getMessages = async (req, res) => {
  try {
    const messages = await chatModel.getAllMessages();
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await chatModel.getMessagesBetweenUsers(user1, user2);
    res.json(messages);
  } catch (err) {
    console.error("Error fetching conversation:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// For sending text + file
exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text, type } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const fileType = req.file ? req.file.mimetype : null;
    const msgType = fileUrl ? fileType.split("/")[0] : "text";

    const newMessage = await chatModel.insertMessage(
      senderId,
      receiverId,
      text || "",
      fileUrl,
      fileType,
      type || msgType
    );

    if (req.io) {
      req.io.to(`user_${senderId}`).emit('privateMessage', newMessage);
      req.io.to(`user_${receiverId}`).emit('privateMessage', newMessage);
    }

    res.json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
