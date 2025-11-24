const Chat = require('../../models/chatModel');
const { TeamMessage } = require('../../models/TeamModel');
const { encrypt: encryptText, decrypt: decryptText } = require('../../Utils/crypto');

module.exports = (io, socket) => {
  //  Register user
  socket.on('register', ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`User registered: ${userId}`);
  });

  //  Join team room & send decrypted chat history
  socket.on('joinTeam', async ({ teamId }) => {
    if (!teamId) return;

    socket.join(`team_${teamId}`);
    console.log(`User ${socket.userId} joined team_${teamId}`);

    // Send decrypted chat history
    try {
      const messages = await TeamMessage.fetchTeamChat(teamId);
      socket.emit('teamChatHistory', messages);
    } catch (err) {
      console.error('Fetch team chat history error:', err);
    }
  });

  //  Private message
  socket.on('privateMessage', async (msg) => {
    try {
      const { senderId, receiverId, text, fileUrl, type, fileName } = msg;
      if (!senderId || !receiverId) return;

      // Save in DB (Chat model handles encryption)
      const result = await Chat.insertMessage(
        senderId,
        receiverId,
        text,
        fileUrl || null,
        null,
        type || 'text',
        fileName || null
      );

      const savedMsg = {
        id: result.insertId,
        sender_id: senderId,
        receiver_id: receiverId,
        text: text || null,
        file_url: fileUrl || null,
        type: type || 'text',
        file_name: fileName || null,
        created_at: new Date(),
      };

      io.to(`user_${senderId}`).emit('privateMessage', savedMsg);
      io.to(`user_${receiverId}`).emit('privateMessage', savedMsg);
    } catch (err) {
      console.error('Private message error:', err);
    }
  });

  //  Team message
  socket.on('teamMessage', async (msg) => {
    try {
      const { senderId, teamId, text, fileUrl, type, fileName, metadata } = msg;
      if (!senderId || !teamId) return;

      // Insert plain text, model will encrypt internally
      const result = await TeamMessage.insert(
        senderId,
        teamId,
        text || "",
        fileUrl || null,
        type || 'text',
        fileName || null,
        metadata || null
      );

      // Fetch the saved message decrypted
      const savedMsg = await TeamMessage.getById(result.insertId);

      // Emit decrypted message
      io.to(`team_${teamId}`).emit('teamMessage', savedMsg);
    } catch (err) {
      console.error('Team message error:', err);
    }
  });
 
 // Delete message
socket.on('deleteMessage', async ({ messageId }) => {
  try {
    const message =
      (await Chat.getMessageById(messageId)) ||
      (await TeamMessage.getById(messageId));
    if (!message) return;

    if (message.receiver_id) {
      await Chat.deleteMessage(messageId);

      const payload = { messageId, senderId: message.sender_id };

      io.to(`user_${message.sender_id}`).emit('messageDeleted', payload);
      io.to(`user_${message.receiver_id}`).emit('messageDeleted', payload);
    } else if (message.team_id) {
      await TeamMessage.delete(messageId);

      const payload = { messageId, senderId: message.sender_id, teamId: message.team_id };

      io.to(`team_${message.team_id}`).emit('messageDeleted', payload);
    }
  } catch (err) {
    console.error('Delete message error:', err);
  }
});


  //  Edit message
  socket.on('editMessage', async ({ id, text }) => {
  try {
    const message =
      (await Chat.getMessageById(id)) || (await TeamMessage.getById(id));
    if (!message) return;

    let updated;

    if (message.receiver_id) {
      await Chat.updateMessage(id, text); 
      updated = await Chat.getMessageById(id);
      updated.text = decryptText(updated.text);
      updated.metadata = updated.metadata ? JSON.parse(decryptText(updated.metadata)) : null;

      // Emit updated message in real-time
      io.to(`user_${message.sender_id}`).emit('messageEdited', updated);
      io.to(`user_${message.receiver_id}`).emit('messageEdited', updated);
    } else if (message.team_id) {
      await TeamMessage.updateText(id, text); 
      updated = await TeamMessage.getById(id);
      updated.text = decryptText(updated.text);
      updated.metadata = updated.metadata ? JSON.parse(decryptText(updated.metadata)) : null;

      io.to(`team_${message.team_id}`).emit('messageEdited', updated);
    }
  } catch (err) {
    console.error('Edit message error:', err);
  }
});

 // Server-side: team chat reaction
socket.on('reaction', async ({ messageId, userId, emoji }) => {
  try {
    if (!messageId || !userId || !emoji) return;

    const message = await TeamMessage.getById(messageId);
    if (!message) return;

    let reactions = message.reactions || {};

    // Toggle reaction
    if (!reactions[emoji]) reactions[emoji] = { count: 0, users: {} };
    const emojiData = reactions[emoji];
    if (emojiData.users[userId]) delete emojiData.users[userId];
    else emojiData.users[userId] = 1;

    // Recalculate count
    emojiData.count = Object.keys(emojiData.users).length;
    if (emojiData.count === 0) delete reactions[emoji];

    // Save updated reactions
    await TeamMessage.updateReactions(messageId, reactions);

    // Fetch updated message to send to frontend
    const updatedMessage = await TeamMessage.getById(messageId);

    // Emit to team room
    io.to(`team_${message.team_id}`).emit('teamMessageUpdated', updatedMessage);
    
  } catch (err) {
    console.error('Reaction error:', err);
  }
});
// Server-side: private chat reaction
socket.on('privateReaction', async ({ messageId, userId, emoji }) => {
  try {
    if (!messageId || !userId || !emoji) return;

    const message = await Chat.getMessageById(messageId);
    if (!message) return;

    let reactions = message.reactions || {};

    // Toggle reaction
    if (!reactions[emoji]) reactions[emoji] = { count: 0, users: {} };
    const emojiData = reactions[emoji];
    if (emojiData.users[userId]) delete emojiData.users[userId];
    else emojiData.users[userId] = 1;

    // Recalculate count
    emojiData.count = Object.keys(emojiData.users).length;
    if (emojiData.count === 0) delete reactions[emoji];

    // Save updated reactions in DB
    await Chat.updateReactions(messageId, reactions);

    // Fetch updated message to send to frontend
    const updatedMessage = await Chat.getMessageById(messageId);

    // Emit to both sender and receiver
    io.to(`user_${message.sender_id}`).emit('privateMessageUpdated', updatedMessage);
    io.to(`user_${message.receiver_id}`).emit('privateMessageUpdated', updatedMessage);

  } catch (err) {
    console.error('Private reaction error:', err);
  }
});


  //  Typing indicators
  socket.on('typingStart', ({ teamId, receiverId }) => {
    if (teamId) socket.to(`team_${teamId}`).emit('userTyping', { userId: socket.userId });
    else if (receiverId) socket.to(`user_${receiverId}`).emit('userTyping', { userId: socket.userId });
  });

  socket.on('typingStop', ({ teamId, receiverId }) => {
    if (teamId) socket.to(`team_${teamId}`).emit('userStoppedTyping', { userId: socket.userId });
    else if (receiverId) socket.to(`user_${receiverId}`).emit('userStoppedTyping', { userId: socket.userId });
  });

  //  Read receipts
  socket.on('messageRead', async ({ messageId }) => {
    try {
      const message =
        (await Chat.getMessageById(messageId)) ||
        (await TeamMessage.getById(messageId));
      if (!message) return;

      const payload = { messageId, readerId: socket.userId, readAt: new Date() };

      if (message.receiver_id) io.to(`user_${message.sender_id}`).emit('messageReadAck', payload);
      else if (message.team_id) io.to(`team_${message.team_id}`).emit('messageReadAck', payload);
    } catch (err) {
      console.error('Read receipt error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
};
