//server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require("dotenv").config();

 
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reactionRoutes = require('./routes/reactionRoutes');
 
const callHandlers = require('./Utils/socket/callHandlers');
const Chat = require('./models/chatModel');
const webpush = require("web-push");

const notificationRoutes = require("./routes/notificationRoutes");

 
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
 
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
 
app.use((req, res, next) => { req.io = io; next(); });
 
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/reactions', reactionRoutes);

app.use("/api/subscribe", notificationRoutes);


// Push notification Keys
// console.log(webpush.generateVAPIDKeys());

// Set the keys in .env file
// console.log("VAPID_PUBLIC_KEY:", process.env.VAPID_PUBLIC_KEY);

 
// Socket.io logic
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
 
  // Register userId for private messaging
  socket.on('register', ({ userId }) => {
    if (userId) {
      socket.userId = userId;
      socket.join(`user_${userId}`);
    }
  });
 
  // Private messages (text or file)
  socket.on('privateMessage', async (msg) => {
    try {
      const { senderId, receiverId, text, fileUrl, fileType, type } = msg;
      if (!senderId || !receiverId || (!text && !fileUrl)) return;
 
      // Save message to DB
      const result = await Chat.insertMessage(
        senderId,
        receiverId,
        text || null,
        type || "text",
        fileUrl || null,
        fileType || null
      );
 
      // Construct message object
      const savedMsg = {
        id: result.insertId,
        sender_id: senderId,
        receiver_id: receiverId,
        text: text || null,
        file_url: fileUrl || null,
        file_type: fileType || null,
        type: type || "text",
        created_at: new Date()
      };
 
      // Emit to sender and receiver
      io.to(`user_${senderId}`).emit('privateMessage', savedMsg);
      io.to(`user_${receiverId}`).emit('privateMessage', savedMsg);
 
    } catch (err) {
      console.error('Message save failed:', err);
    }
  });
 
  // Reaction events
  socket.on('sendReaction', async ({ msgId, userId, emoji }) => {
    try {
      const { addOrUpdateReaction, getReactionsByMessage } = require('./models/reactionModel');
      await addOrUpdateReaction(msgId, userId, emoji);
      const reactions = await getReactionsByMessage(msgId);
      io.emit('reactionUpdated', { msgId, reactions });
    } catch (err) {
      console.error('Reaction save failed:', err);
    }
  });
 
  // Attach call handlers here
  callHandlers(io, socket);
 
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});
 
// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
 