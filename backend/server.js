const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Routes
const meetingRoutes = require("./routes/meetingRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const taskRoutes = require("./routes/taskRoutes");
const teamRoutes = require("./routes/teamRoutes");
const eventRoutes = require("./routes/eventRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// Socket handlers
const teamSocket = require("./Utils/socket/teamSocket");
const callHandlers = require("./Utils/socket/callHandlers");
const messageHandlers = require("./Utils/socket/messageHandlers");
const eventHandlers = require("./Utils/socket/eventHandlers");
const sidebarSocket = require("./Utils/socket/sidebarSocket");
const meetingHandlers = require("./Utils/socket/meetingHandlers");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://192.168.1.28:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// GLOBAL — Supports multiple sockets per user
// Map<userId => Set(socketIds)>
const connectedSockets = new Map(); 

const log = (...args) => console.log("[SERVER]", ...args);

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://192.168.1.28:5173"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/subscribe", notificationRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tasks", taskRoutes);


// SOCKET.IO
io.on("connection", (socket) => {

  console.log("Socket connected:", socket.id);

  const addSocketForUser = (userId, socketId) => {
    if (!connectedSockets.has(userId)) {
      connectedSockets.set(userId, new Set());
    }
    connectedSockets.get(userId).add(socketId);

    log(`Added socket ${socketId} for user ${userId}`);
  };

  const removeSocketForUser = (userId, socketId) => {
    const set = connectedSockets.get(userId);
    if (!set) return;

    set.delete(socketId);
    log(`Removed socket ${socketId} for user ${userId}`);

    if (set.size === 0) {
      connectedSockets.delete(userId);
      log(`All sockets removed for user ${userId} → deleted mapping`);
    }
  };

  // ---------------- REGISTER USER ----------------
  socket.on("register", ({ userId } = {}) => {
    if (!userId) return;

    userId = String(userId);
    socket.userId = userId;

    socket.join(`user_${userId}`);
    addSocketForUser(userId, socket.id);

    log(`Registered user ${userId} (socket: ${socket.id})`);
  });

  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", () => {
    const { userId } = socket;
    if (!userId) return;

    removeSocketForUser(userId, socket.id);
  });

  // Attach handlers
  messageHandlers(io, socket);
  callHandlers(io, socket, connectedSockets);
  eventHandlers(io, socket);
  teamSocket(io, socket);
  meetingHandlers(io, socket, connectedSockets);
  sidebarSocket(io, socket);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running at http://0.0.0.0:${PORT}`)
);
