const User = require("../../models/User");
const { sendPushNotification } = require("../../Utils/pushService");

const activeRooms = new Map(); // roomCode => Set of userIds

module.exports = function callHandlers(io, socket) {
  socket.on("register", ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;
    socket.join(`user_${userId}`);
  });

  // 1:1 Call Flow
  socket.on("callUser", async ({ from, to, offer, callType }) => {
    io.to(`user_${to}`).emit("incomingCall", { from, offer, callType });

    try {
      const subscription = await User.getPushSubscription(to);
      if (subscription) {
        await sendPushNotification(subscription, {
          title: "Incoming Call",
          body: `📞 ${callType} call from ${from}`,
          icon: "/icons/call.png",
        });
      }
    } catch (err) {
      console.error("Push notification failed:", err);
    }
  });

  socket.on("answerCall", ({ to, answer, from }) => {
    if (!to) return;
    io.to(`user_${to}`).emit("callAccepted", { answer, from });
  });

  socket.on("iceCandidate", ({ to, from, candidate }) => {
    if (!to || !candidate) return;
    io.to(`user_${to}`).emit("iceCandidate", { from, candidate });
  });

  socket.on("endCall", ({ from, to }) => {
    if (to) io.to(`user_${to}`).emit("endCall", { from });
    if (from) io.to(`user_${from}`).emit("endCall", { from });
  });

  socket.on("cancelCall", ({ to, from }) => {
    if (to) io.to(`user_${to}`).emit("callCancelled", { from });
  });

  // Multi-user Meeting Flow
  socket.on("joinRoom", ({ userId, roomCode }) => {
    socket.userId = userId;
    socket.roomCode = roomCode;
    socket.join(roomCode);

    if (!activeRooms.has(roomCode)) activeRooms.set(roomCode, new Set());
    activeRooms.get(roomCode).add(userId);

    console.log(`👥 User ${userId} joined room ${roomCode}`);
    console.log(`Room ${roomCode} now has:`, Array.from(activeRooms.get(roomCode)));

    socket.to(roomCode).emit("userJoined", { userId });

    const existingUsers = Array.from(activeRooms.get(roomCode)).filter((id) => id !== userId);
    socket.emit("existingUsers", { users: existingUsers });
  });

  socket.on("offer", ({ to, offer }) => {
    const targetSocket = findSocketByUserId(io, to);
    if (targetSocket) {
      targetSocket.emit("offer", { from: socket.userId, offer });
    }
  });

  socket.on("answer", ({ to, answer }) => {
    const targetSocket = findSocketByUserId(io, to);
    if (targetSocket) {
      targetSocket.emit("answer", { from: socket.userId, answer });
    }
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    const targetSocket = findSocketByUserId(io, to);
    if (targetSocket) {
      targetSocket.emit("iceCandidate", { from: socket.userId, candidate });
    }
  });

  socket.on("leaveRoom", ({ userId, roomCode }) => {
    socket.leave(roomCode);
    socket.to(roomCode).emit("userLeft", { userId });

    if (activeRooms.has(roomCode)) {
      activeRooms.get(roomCode).delete(userId);
      if (activeRooms.get(roomCode).size === 0) activeRooms.delete(roomCode);
    }
  });

  socket.on("disconnect", () => {
    const { userId, roomCode } = socket;
    if (roomCode && activeRooms.has(roomCode)) {
      activeRooms.get(roomCode).delete(userId);
      socket.to(roomCode).emit("userLeft", { userId });
      if (activeRooms.get(roomCode).size === 0) activeRooms.delete(roomCode);
    }
  });
};

function findSocketByUserId(io, userId) {
  for (const [id, socket] of io.of("/").sockets) {
    if (socket.userId === userId) return socket;
  }
  return null;
}

