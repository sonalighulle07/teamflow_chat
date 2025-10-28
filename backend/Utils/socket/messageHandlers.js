const Chat = require('../../models/chatModel');
const { TeamMessage } = require('../../models/TeamModel');
const { encryptText, decryptText } = require('../../Utils/crypto');

module.exports = (io, socket) => {

  // Register user
  socket.on('register', ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`User registered: ${userId}`);
  });

  // Private message
  socket.on('privateMessage', async (msg) => {
    try {
      const { senderId, receiverId, text, fileUrl, type, fileName } = msg;
      if (!senderId || !receiverId) return;

      const encryptedText = text ? encryptText(text) : null;
      const result = await Chat.insertMessage(
        senderId,
        receiverId,
        encryptedText,
        fileUrl || null,
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

  // Team message
  socket.on('teamMessage', async (msg) => {
    try {
      const { senderId, teamId, text, fileUrl, type, fileName } = msg;
      if (!senderId || !teamId) return;

      const encryptedText = text ? encryptText(text) : null;
      const result = await TeamMessage.insert(
        senderId,
        teamId,
        encryptedText,
        fileUrl || null,
        type || 'text',
        fileName || null
      );

      const savedMsg = {
        id: result.insertId,
        sender_id: senderId,
        team_id: teamId,
        text: text || null,
        file_url: fileUrl || null,
        type: type || 'text',
        file_name: fileName || null,
        created_at: new Date(),
      };

      io.to(`team_${teamId}`).emit('teamMessage', savedMsg);
    } catch (err) {
      console.error('Team message error:', err);
    }
  });

  // Delete message
  socket.on('deleteMessage', async ({ messageId }) => {
    try {
      const message = await Chat.getMessageById(messageId) || await TeamMessage.getById(messageId);
      if (!message) return;

      if (message.receiver_id) {
        await Chat.deleteMessage(messageId);
        io.to(`user_${message.sender_id}`).emit('messageDeleted', { messageId });
        io.to(`user_${message.receiver_id}`).emit('messageDeleted', { messageId });
      } else if (message.team_id) {
        await TeamMessage.delete(messageId);
        io.to(`team_${message.team_id}`).emit('messageDeleted', { messageId });
      }
    } catch (err) {
      console.error('Delete message error:', err);
    }
  });

  // Edit message
 socket.on('editMessage', async ({ id, text }) => {
  try {
    const message = await Chat.getMessageById(id) || await TeamMessage.getById(id);
    if (!message) return;

   
    if (message.receiver_id) {
      await Chat.updateMessage(id, text);  // no encryption here
      const updated = await Chat.getMessageById(id);

      // Emit already decrypted message
      io.to(`user_${message.sender_id}`).emit('messageEdited', updated);
      io.to(`user_${message.receiver_id}`).emit('messageEdited', updated);
    } 
    else if (message.team_id) {
      await TeamMessage.updateText(id, text);  
      const updated = await TeamMessage.getById(id);
      io.to(`team_${message.team_id}`).emit('messageEdited', updated);
    }
  } catch (err) {
    console.error('Edit message error:', err);
  }
});


  // Reaction
  socket.on('reaction', async ({ messageId, userId, emoji }) => {
    try {
      const message = await Chat.getMessageById(messageId) || await TeamMessage.getById(messageId);
      if (!message) return;

      let reactions = message.reactions ? JSON.parse(message.reactions) : {};
      if (!reactions[emoji]) reactions[emoji] = {};
      if (reactions[emoji][userId]) delete reactions[emoji][userId];
      else reactions[emoji][userId] = 1;

      const updatedReactions = JSON.stringify(reactions);

      if (message.receiver_id) {
        await Chat.updateReactions(messageId, updatedReactions);
        io.to(`user_${message.sender_id}`).emit('reaction', { messageId, reactions });
        io.to(`user_${message.receiver_id}`).emit('reaction', { messageId, reactions });
      } else if (message.team_id) {
        await TeamMessage.updateReactions(messageId, updatedReactions);
        io.to(`team_${message.team_id}`).emit('reaction', { messageId, reactions });
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  });

  // Typing indicators
  socket.on('typingStart', ({ teamId, receiverId }) => {
    if (teamId) socket.to(`team_${teamId}`).emit('userTyping', { userId: socket.userId, teamId });
    else if (receiverId) socket.to(`user_${receiverId}`).emit('userTyping', { userId: socket.userId });
  });

  socket.on('typingStop', ({ teamId, receiverId }) => {
    if (teamId) socket.to(`team_${teamId}`).emit('userStoppedTyping', { userId: socket.userId, teamId });
    else if (receiverId) socket.to(`user_${receiverId}`).emit('userStoppedTyping', { userId: socket.userId });
  });

  // Read receipts
  socket.on('messageRead', async ({ messageId }) => {
    try {
      const message = await Chat.getMessageById(messageId) || await TeamMessage.getById(messageId);
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
