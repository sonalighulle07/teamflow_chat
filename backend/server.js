
// server.js

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

const notificationRoutes = require("./routes/notificationRoutes");


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
      console.log(`User registered: ${userId}`);
    }
  });


  // Private messages (text or file)

  socket.on('privateMessage', async (msg) => {
    try {
      const { senderId, receiverId, text, fileUrl, fileType, type, fileName } = msg;
      if (!senderId || !receiverId || (!text && !fileUrl)) return;


      // Save message to DB

      const result = await Chat.insertMessage(
        senderId,
        receiverId,
        text || "",
        fileUrl || null,
        fileType || null,
        type || "text",
        fileName || null
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


      // Emit to sender and receiver only


      io.to(`user_${senderId}`).emit('privateMessage', savedMsg);
      io.to(`user_${receiverId}`).emit('privateMessage', savedMsg);
    } catch (err) {
      console.error('Message save failed:', err);
    }
  });


  // Message deleted
socket.on("deleteMessage", ({ messageId }) => {
  io.emit("messageDeleted", { messageId });
});

// Message edited
socket.on("editMessage", (updatedMsg) => {
  io.emit("messageEdited", updatedMsg);
});

  // Reaction events

  socket.on('sendReaction', async ({ msgId, userId, emoji }) => {
    try {
      const message = await Chat.getMessageById(msgId);
      if (!message) return;

      let reactions = message.reactions ? JSON.parse(message.reactions) : {};
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      await Chat.updateReactions(msgId, JSON.stringify(reactions));

      // Emit only to sender & receiver
      io.to(`user_${message.sender_id}`).emit('reaction', { messageId: msgId, reactions });
      io.to(`user_${message.receiver_id}`).emit('reaction', { messageId: msgId, reactions });
    } catch (err) {
      console.error('Reaction save failed:', err);
    }
  });


  // Attach call handlers (video/audio)

  callHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));


