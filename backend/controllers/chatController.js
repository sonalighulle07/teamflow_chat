const chatModel = require("../models/chatModel");
 
 
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
 
exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text, fileUrl, fileType, type } = req.body;
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
 
    const newMessage = await chatModel.insertMessage(
      senderId,
      receiverId,
      text || "",
      fileUrl || null,
      fileType || null,
      type || "text"
    );
 
    res.json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
//chat controller