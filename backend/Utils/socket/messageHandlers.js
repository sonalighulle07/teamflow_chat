const Chat = require('../../models/chatModel');
const { TeamMessage } = require('../../models/TeamModel');

module.exports = (io, socket) => {
  socket.on('register', ({ userId }) => {
    if (userId) {
      socket.userId = userId;
      socket.join(`user_${userId}`);
      console.log(`User registered: ${userId}`);
    }
  });

  // Private message
  socket.on('privateMessage', async (msg) => {
    const { senderId, receiverId, text, fileUrl, type, fileName } = msg;
    if (!senderId || !receiverId) return;

    const result = await Chat.insertMessage(senderId, receiverId, text || '', fileUrl || null, type || 'text', fileName || null);
    const savedMsg = {
      id: result.insertId,
      sender_id: senderId,
      receiver_id: receiverId,
      text: text || null,
      file_url: fileUrl || null,
      type: type || 'text',
      created_at: new Date(),
    };

    io.to(`user_${senderId}`).emit('privateMessage', savedMsg);
    io.to(`user_${receiverId}`).emit('privateMessage', savedMsg);
  });

  // Team message
  socket.on('teamMessage', async (msg) => {
    const { senderId, teamId, text, fileUrl, type, fileName } = msg;
    if (!senderId || !teamId) return;

    const result = await TeamMessage.insert(senderId, teamId, text || '', fileUrl || null, type || 'text', fileName || null);
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
  });

  // Delete message
  socket.on('deleteMessage', async ({ messageId }) => {
    const message = await Chat.getMessageById(messageId) || await TeamMessage.getById(messageId);
    if (!message) return;

    if (message.receiver_id) {
      await Chat.deleteMessage(messageId);
      io.to(`user_${message.sender_id}`).emit("messageDeleted", { messageId });
      io.to(`user_${message.receiver_id}`).emit("messageDeleted", { messageId });
    } else if (message.team_id) {
      await TeamMessage.delete(messageId);
      io.to(`team_${message.team_id}`).emit("messageDeleted", { messageId });
    }
  });

  // Edit message
  socket.on('editMessage', async ({ id, text }) => {
    const message = await Chat.getMessageById(id) || await TeamMessage.getById(id);
    if (!message) return;

    if (message.receiver_id) {
      await Chat.updateMessage(id, text);
      const updated = await Chat.getMessageById(id);
      io.to(`user_${message.sender_id}`).emit('messageEdited', updated);
      io.to(`user_${message.receiver_id}`).emit('messageEdited', updated);
    } else if (message.team_id) {
      await TeamMessage.updateText(id, text);
      const updated = await TeamMessage.getById(id);
      io.to(`team_${message.team_id}`).emit('messageEdited', updated);
    }
  });

  // Reaction
  socket.on('reaction', async ({ messageId, userId, emoji }) => {
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
  });

  // Typing indicators
  socket.on("typingStart", ({ teamId, receiverId }) => {
    if (teamId) {
      socket.to(`team_${teamId}`).emit("userTyping", { userId: socket.userId, teamId });
    } else if (receiverId) {
      socket.to(`user_${receiverId}`).emit("userTyping", { userId: socket.userId });
    }
  });

  socket.on("typingStop", ({ teamId, receiverId }) => {
    if (teamId) {
      socket.to(`team_${teamId}`).emit("userStoppedTyping", { userId: socket.userId, teamId });
    } else if (receiverId) {
      socket.to(`user_${receiverId}`).emit("userStoppedTyping", { userId: socket.userId });
    }
  });

  // Read receipts
  socket.on("messageRead", async ({ messageId }) => {
    const message = await Chat.getMessageById(messageId) || await TeamMessage.getById(messageId);
    if (!message) return;

    const payload = { messageId, readerId: socket.userId, readAt: new Date() };

    if (message.receiver_id) {
      io.to(`user_${message.sender_id}`).emit("messageReadAck", payload);
    } else if (message.team_id) {
      io.to(`team_${message.team_id}`).emit("messageReadAck", payload);
    }
  });

  socket.on('createEvent', async (data) => {
      try {
        const event = await Event.create(data);
        io.emit('newEvent', event); // broadcast to all clients
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('updateEvent', async (data) => {
      try {
        const event = await Event.update(data.id, data);
        io.emit('updateEvent', event);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('deleteEvent', async (id) => {
      try {
        await Event.delete(id);
        io.emit('deleteEvent', id);
      } catch (err) {
        console.error(err);
      }
    });



  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
};

