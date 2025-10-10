const chatModel = require("../models/chatModel");
const User = require("../models/User");
const { sendPushNotification } = require("../Utils/pushService");
const db = require("../Utils/db"); 


// GET all messages
exports.getMessages = async (req, res) => {
  try {
    const messages = await chatModel.getAllMessages();
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};        

// GET conversation between two users
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

// POST send message (text or file)
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

      if (fileType.startsWith("image/")) msgType = "image";
      else if (fileType.startsWith("video/")) msgType = "video";
      else if (fileType.startsWith("audio/")) msgType = "audio";
      else msgType = "file";
    }

    const newMessage = await chatModel.insertMessage(
      senderId,
      receiverId,
      text || "",
      fileUrl,
      fileType,
      msgType,
      fileName
    );

    // Emit message to both sender & receiver
    if (req.io) {
      req.io.to(`user_${senderId}`).emit("privateMessage", newMessage);
      req.io.to(`user_${receiverId}`).emit("privateMessage", newMessage);
    }

    // Push notification
    try {
      const sender = await User.findById(senderId);
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

// POST /api/chats/:messageId/react
exports.reactMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.id;

    if (!emoji || !userId) {
      return res.status(400).json({ error: "Emoji and userId are required" });
    }

    // Fetch current reactions
    const [rows] = await db.execute(
      "SELECT reactions FROM chats WHERE id = ?",
      [messageId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Message not found" });
    }

    let reactions = {};
    try {
      reactions = rows[0].reactions ? JSON.parse(rows[0].reactions) : {};
    } catch {
      reactions = {};
    }

    // Ensure emoji key exists
    if (!reactions[emoji]) {
      reactions[emoji] = { count: 0, users: {} };
    }

    const emojiData = reactions[emoji];

    // Toggle reaction: add or remove
    if (emojiData.users[userId]) {
      delete emojiData.users[userId];
    } else {
      emojiData.users[userId] = 1;
    }

    // Update total count
    emojiData.count = Object.values(emojiData.users).reduce((sum, c) => sum + c, 0);

    // Save updated reactions
    await db.execute(
      "UPDATE chats SET reactions = ? WHERE id = ?",
      [JSON.stringify(reactions), messageId]
    );

    res.json({ reactions });

    // Broadcast via Socket.IO
    if (req.io) {
      req.io.emit("reaction", { messageId, reactions });
    }
  } catch (err) {
    console.error("Failed to react to message:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};







// DELETE message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Delete message from DB
    await db.execute("DELETE FROM chats WHERE id = ?", [messageId]);

    // Broadcast delete event via socket
    if (req.io) {
      req.io.emit("messageDeleted", { messageId });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// PUT edit message
exports.editMessage = async (req, res) => {
  const { text } = req.body;
  const { messageId } = req.params;

  try {
    const [updatedRows] = await db.execute(
      "UPDATE chats SET text = ?, edited = 1, edited_at = NOW() WHERE id = ?",
      [text, messageId]
    );

    if (updatedRows.affectedRows === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    const [updatedMessage] = await db.execute(
      "SELECT * FROM chats WHERE id = ?",
      [messageId]
    );

    res.json(updatedMessage[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Edit failed" });
  }
};
exports.forwardMessage = async (req, res) => {
  const { messageId } = req.params;
  const { toUserIds, senderId } = req.body;

  if (!senderId) return res.status(400).json({ error: "senderId required" });
  if (!toUserIds || !Array.isArray(toUserIds) || toUserIds.length === 0) {
    return res.status(400).json({ error: "No recipients provided" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM chats WHERE id = ?", [messageId]);
    if (!rows[0]) return res.status(404).json({ error: "Message not found" });

    const message = rows[0];
    const newMessages = [];

    for (const receiverId of toUserIds) {
      if (receiverId === senderId) continue; // skip if sender selects themselves

      const [result] = await db.query(
        `INSERT INTO chats 
          (sender_id, receiver_id, text, file_url, file_name, file_type, type, forwarded_from, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          senderId,
          receiverId,
          message.text,
          message.file_url,
          message.file_name,
          message.file_type,
          message.type,
          message.id,
        ]
      );

      const [insertedRows] = await db.query(
        "SELECT * FROM chats WHERE id = ?", [result.insertId]
      );
      const newMsg = insertedRows[0];
      newMessages.push(newMsg);

      // Emit ONLY to the recipient
      if (req.io) {
        req.io.to(`user_${receiverId}`).emit("privateMessage", newMsg);
      }
    }

    res.json({ success: true, messages: newMessages });
  } catch (err) {
    console.error("Forward error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
