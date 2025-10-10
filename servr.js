  const express = require('express');
  const http = require('http');
  const socketIo = require('socket.io');
  const cors = require('cors');
  const path = require('path');
  require('dotenv').config();
 
  const meetingRoutes = require('./routes/meetingRoutes');
  const authRoutes = require('./routes/authRoutes');
  const userRoutes = require('./routes/userRoutes');
  const chatRoutes = require('./routes/chatRoutes');
  const reactionRoutes = require('./routes/reactionRoutes');
  const teamRoutes = require('./routes/teamRoutes');
  const notificationRoutes = require('./routes/notificationRoutes');
 
  const callHandlers = require('./utils/socket/callHandlers');
  const Chat = require('./models/chatModel');
  const eventRoutes = require('./routes/eventRoutes');
 
 
 
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://192.168.1.25:5173',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
 
  // Middleware
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://192.168.1.25:5173',
    ],
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
  // app.use("/uploads", express.static("uploads"));
 
  // Pass io to routes
  app.use((req, res, next) => {
    req.io = io;
    next();
  });
 
  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/reactions', reactionRoutes);
  app.use('/api/subscribe', notificationRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/events', eventRoutes);
  // ---- Socket.io ----
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
 
   
 
    // Register user for private messages
    socket.on('register', ({ userId }) => {
      if (userId) {
        socket.userId = userId;
        socket.join(`user_${userId}`);
        console.log(`User registered: ${userId}`);
      }
    });
 
    // Private message
    socket.on('privateMessage', async (msg) => {
      try {
        const { senderId, receiverId, text, fileUrl, type, fileName } = msg;
        if (!senderId || !receiverId) return;
 
        const result = await Chat.insertMessage(
          senderId,
          receiverId,
          text || '',
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
          created_at: new Date(),
        };
 
        io.to(`user_${senderId}`).emit('privateMessage', savedMsg);
        io.to(`user_${receiverId}`).emit('privateMessage', savedMsg);
      } catch (err) {
        console.error('Private message failed:', err);
      }
    });
 
    // Join team
    socket.on('joinTeam', ({ teamId }) => {
      if (teamId) socket.join(`team_${teamId}`);
    });
 
    // Team message
    socket.on('teamMessage', async (msg) => {
      try {
        const { senderId, teamId, text, fileUrl, type, fileName } = msg;
        if (!senderId || !teamId) return;
 
        const result = await Chat.insertTeamMessage(
          senderId,
          teamId,
          text || '',
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
          created_at: new Date(),
        };
 
        io.to(`team_${teamId}`).emit('teamMessage', savedMsg);
      } catch (err) {
        console.error('Team message failed:', err);
      }
    });
 
    socket.on("deleteMessage", async ({ messageId }) => {
      try {
        const message = await Chat.getMessageById(messageId); // get message details
        if (!message) return;
 
        // Delete from DB
        await Chat.deleteMessage(messageId);
 
        // Emit deletion event
        if (message.receiver_id) {
          // private message
          io.to(`user_${message.sender_id}`).emit("messageDeleted", { messageId });
          io.to(`user_${message.receiver_id}`).emit("messageDeleted", { messageId });
        } else if (message.team_id) {
          // team message
          io.to(`team_${message.team_id}`).emit("messageDeleted", { messageId });
        }
      } catch (err) {
        console.error("Delete failed:", err);
      }
    });
 
 
 
    // Edit message
  socket.on('editMessage', async (updatedMsg) => {
    try {
      const { id, text } = updatedMsg;
      await Chat.updateMessage(id, text); // persist edit
      const message = await Chat.getMessageById(id); // good
 
      if (message.receiver_id) {
        io.to(`user_${message.sender_id}`).emit('messageEdited', message);
        io.to(`user_${message.receiver_id}`).emit('messageEdited', message);
      } else if (message.team_id) {
        io.to(`team_${message.team_id}`).emit('messageEdited', message);
      }
    } catch (err) {
      console.error('Edit failed:', err);
    }
  });
 
    // Reaction
    socket.on('reaction', async ({ messageId, userId, emoji }) => {
      try {
        const message = await Chat.getMessageById(messageId);
        if (!message) return;
 
        let reactions = message.reactions ? JSON.parse(message.reactions) : {};
 
        if (!reactions[emoji]) reactions[emoji] = {};
        if (reactions[emoji][userId]) delete reactions[emoji][userId];
        else reactions[emoji][userId] = 1;
 
        await Chat.updateReactions(messageId, JSON.stringify(reactions));
 
        // Emit updated reactions
        if (message.receiver_id) {
          io.to(`user_${message.sender_id}`).emit('reaction', { messageId, reactions });
          io.to(`user_${message.receiver_id}`).emit('reaction', { messageId, reactions });
        } else if (message.team_id) {
          io.to(`team_${message.team_id}`).emit('reaction', { messageId, reactions });
        }
      } catch (err) {
        console.error('Reaction failed:', err);
      }
    });
 
    // Call handlers
    callHandlers(io, socket);
 
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
 
    // Disconnect
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
 
  // Start server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => console.log(`Server running at http://0.0.0.0:${PORT}`));
 
 