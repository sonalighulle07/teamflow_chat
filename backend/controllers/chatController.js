const chatModel = require("../models/chatModel");
const User = require("../models/User");
const { sendPushNotification } = require("../Utils/pushService");

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
    const { senderId, receiverId, text } = req.body;
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let fileUrl = null;
    let fileType = null;
    let fileName = null;
    let msgType = "text";

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileType = req.file.mimetype;
      fileName = req.file.originalname;

      // set message type properly
      if (fileType.startsWith("image/")) {
        msgType = "image";
      } else if (fileType.startsWith("video/")) {
        msgType = "video";
      } else if (fileType.startsWith("audio/")) {
        msgType = "audio";
      } else {
        msgType = "file"; // pdf, docx, excel etc.
      }
    }

   const newMessage = await chatModel.insertMessage(
  senderId,
  receiverId,
  text || "",
  fileUrl,
  fileType,
  msgType
);



    // Emit via Socket.IO
    if (req.io) {
      req.io.to(`user_${senderId}`).emit("privateMessage", newMessage);
      req.io.to(`user_${receiverId}`).emit("privateMessage", newMessage);
    }

    const sender = await User.findById(senderId);

    // Send push notification to receiver
    try {
      const subscription = await User.getPushSubscription(receiverId);
      if (subscription) {
        await sendPushNotification(subscription, {
          title: "New Message",
          body: text
            ? `💬 ${sender.username}: ${text}`
            : fileType
            ? `📎 ${sender.username} sent a ${fileType.split("/")[0]} file`
            : `${sender.username} sent you a message`,
          icon: "/icons/message.png",
        });
      }
    } catch (pushErr) {
      console.error("Push notification failed:", pushErr);
    }

    res.json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
