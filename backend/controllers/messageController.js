import { saveMessage, getMessages } from "../models/Message.js";

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    let fileUrl = null;
    let fileType = null;

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileType = req.file.mimetype;
    }

    const id = await saveMessage({ senderId, receiverId, text, fileUrl, fileType });
    res.status(201).json({ success: true, id, fileUrl, fileType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const fetchMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await getMessages(user1, user2);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
