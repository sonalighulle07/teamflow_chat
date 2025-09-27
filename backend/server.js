const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require("dotenv").config();

const meetingRoutes = require("./routes/meetingRoutes");
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reactionRoutes = require('./routes/reactionRoutes');
const notificationRoutes = require("./routes/notificationRoutes");

const callHandlers = require('./Utils/socket/callHandlers');
const Chat = require('./models/chatModel');
const webpush = require("web-push");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => { req.io = io; next(); });

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/reactions', reactionRoutes);
app.use("/api/subscribe", notificationRoutes);
app.use("/api/meetings", meetingRoutes);

// Socket.io logic
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('register', ({ userId }) => {
    if (userId) {
      socket.userId = userId;
      socket.join(`user_${userId}`);
    }
  });

  socket.on('privateMessage', async (msg) => {
    try {
      const { senderId, receiverId, text, fileUrl, fileType, type } = msg;
      if (!senderId || !receiverId || (!text && !fileUrl)) return;

      const result = await Chat.insertMessage(
        senderId,
        receiverId,
        text || null,
        type || "text",
        fileUrl || null,
        fileType || null
      );

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

      io.to(`user_${senderId}`).emit('privateMessage', savedMsg);
      io.to(`user_${receiverId}`).emit('privateMessage', savedMsg);
    } catch (err) {
      console.error('Message save failed:', err);
    }
  });

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

  callHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

