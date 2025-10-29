const User = require("../../models/User");
const { sendPushNotification } = require("../../Utils/pushService");

const activeRooms = new Map(); // roomCode => Set<userIds>
const meetingSockets = new Map(); // userId => socket.id

module.exports = function callHandlers(io, socket) {
   socket.on("register", ({ userId }) => {
    if (!userId) return;
    userId = String(userId);
    socket.userId = userId;
    socket.join(`user_${userId}`);
    meetingSockets.set(userId, socket.id);
    console.log(`✅ Registered socket for user: ${userId}`);
  });

  socket.on("callUser", async ({ from, fromUsername, to, offer, callType }) => {
    io.to(`user_${to}`).emit("incomingCall", { from, fromUsername, offer, callType });
    try {
      const subscription = await User.getPushSubscription(to);
      if (subscription) {
        await sendPushNotification(subscription, {
          title: "Incoming Call",
          body: `📞 ${callType} call from ${fromUsername || from}`,
          icon: "/icons/call.png",
        });
      }
    } catch (err) {
      console.error("Push notification failed:", err);
    }
  });

  socket.on("answerCall", ({ to, answer, from, fromUsername }) => {
    io.to(`user_${to}`).emit("callAccepted", { answer, from, fromUsername });
  });

  socket.on("iceCandidate", ({ to, from, candidate }) => {
    io.to(`user_${to}`).emit("iceCandidate", { from, candidate });
  });

  socket.on("endCall", ({ from, fromUsername, to }) => {
    if (to) io.to(`user_${to}`).emit("endCall", { from, fromUsername });
    if (from) io.to(`user_${from}`).emit("endCall", { from, fromUsername });
  });

  socket.on("cancelCall", ({ to, from, fromUsername }) => {
    io.to(`user_${to}`).emit("callCancelled", { from, fromUsername });
  });

  socket.on("joinRoom", ({ userId,username, roomCode }) => {
    if (!userId || !roomCode) return socket.emit("error", { message: "Missing userId or roomCode." });

    userId = String(userId);
    roomCode = String(roomCode);

    if (activeRooms.has(roomCode) && activeRooms.get(roomCode).has(userId)) {
      console.log(`❌ Duplicate join attempt: ${userId} in ${roomCode}`);
      return socket.emit("error", { message: "You are already in this meeting." });
    }

    socket.userId = userId;
    socket.roomCode = roomCode;
    socket.join(roomCode);

    if (!activeRooms.has(roomCode)) activeRooms.set(roomCode, new Set());
    activeRooms.get(roomCode).add(userId);

    meetingSockets.set(userId, socket.id);

    console.log(`👥 User ${userId} joined room ${roomCode}`);
    console.log(`Room ${roomCode} now has:`, Array.from(activeRooms.get(roomCode)));

    socket.to(roomCode).emit("userJoined", { userId,username });
    socket.emit("meeting-toast", { message: "You joined the meeting" });

    const existingUsers = Array.from(activeRooms.get(roomCode)).filter((id) => id !== userId);
    socket.emit("existingUsers", { users: existingUsers });
  });

  socket.on("offer", ({ to, offer }) => {
    const targetSocketId = meetingSockets.get(String(to));
    if (targetSocketId) {
      io.to(targetSocketId).emit("offer", { from: socket.userId, offer });
    }
  });

  socket.on("answer", ({ to, answer }) => {
    const targetSocketId = meetingSockets.get(String(to));
    if (targetSocketId) {
      io.to(targetSocketId).emit("answer", { from: socket.userId, answer });
    }
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    const targetSocketId = meetingSockets.get(String(to));
    if (targetSocketId) {
      io.to(targetSocketId).emit("iceCandidate", { from: socket.userId, candidate });
    }
  });

  socket.on("leaveRoom", ({ userId,username, roomCode }) => {
    userId = String(userId);
    roomCode = String(roomCode);

    socket.leave(roomCode);
    socket.to(roomCode).emit("userLeft", { userId,username });
    
    socket.emit("meeting-toast", { message: "You left the meeting" });

    if (activeRooms.has(roomCode)) {
      activeRooms.get(roomCode).delete(userId);
      if (activeRooms.get(roomCode).size === 0) activeRooms.delete(roomCode);
    }

    meetingSockets.delete(userId);
    console.log(`👋 User ${userId} left room ${roomCode}`);
  });

  socket.on("disconnect", () => {
    const userId = String(socket.userId);
    const roomCode = String(socket.roomCode);

    if (roomCode && activeRooms.has(roomCode)) {
      activeRooms.get(roomCode).delete(userId);
      // socket.to(roomCode).emit("userLeft", { userId });
      if (activeRooms.get(roomCode).size === 0) activeRooms.delete(roomCode);
    }

    if (userId) meetingSockets.delete(userId);
    console.log(`❌ Socket disconnected: ${socket.id} (${userId})`);
  });
};

      