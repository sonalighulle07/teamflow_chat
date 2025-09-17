const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reactionRoutes = require('./routes/reactionRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Make io accessible in routes/controllers
app.use((req, res, next) => { req.io = io; next(); });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/reactions', reactionRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Socket.io logic
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('register', ({ userId }) => {
        if (userId) socket.join(`user_${userId}`);
    });

    socket.on('privateMessage', (msg) => {
        io.to(`user_${msg.senderId}`).emit('privateMessage', msg);
        io.to(`user_${msg.receiverId}`).emit('privateMessage', msg);
    });

    // Reaction event
    socket.on('sendReaction', async ({ msgId, userId, emoji }) => {
        try {
            const { addOrUpdateReaction, getReactionsByMessage } = require('./models/reactionModel');

            // Save reaction to DB
            await addOrUpdateReaction(msgId, userId, emoji);

            // Fetch updated reactions
            const reactions = await getReactionsByMessage(msgId);

            // Emit to all clients
            io.emit('reactionUpdated', { msgId, reactions });
        } catch (err) {
            console.error('Reaction save failed:', err);
        }
    });

    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
