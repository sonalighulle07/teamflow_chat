const Chat = require('../../models/chatModel');
const { TeamMessage } = require('../../models/TeamModel');

module.exports = (io, socket) => {
  // Register user
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

  // Delete / Edit / Reaction / Typing / Read logic can remain here
};
