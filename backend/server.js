const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reactionRoutes = require('./routes/reactionRoutes');

const callHandlers = require('./Utils/socket/callHandlers');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => { req.io = io; next(); });

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/reactions', reactionRoutes);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('register', ({ userId }) => {
    if (userId) {
      socket.userId = userId;
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room user_${userId}`);
    }
  });

  socket.on('privateMessage', (msg) => {
    io.to(`user_${msg.senderId}`).emit('privateMessage', msg);
    io.to(`user_${msg.receiverId}`).emit('privateMessage', msg);
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

  // Attach call handlers
  callHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
