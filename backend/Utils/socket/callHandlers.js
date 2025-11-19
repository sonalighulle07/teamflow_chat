const User = require("../../models/User");
const { sendPushNotification } = require("../../Utils/pushService");

const activeRooms = new Map(); // roomCode => Set<userIds>
const meetingSockets = new Map(); // userId => socket.id

const meetServ = require("../../controllers/services/groupMeetings"); // make sure this import is at the top

module.exports = function callHandlers(io, socket) {
   socket.on("register", ({ userId }) => {
    console.log("Registering socket for user:", userId);
    if (!userId) return;
    userId = String(userId);
    socket.userId = userId;
    socket.join(`user_${userId}`);
    meetingSockets.set(userId, socket.id);
    console.log(`✅ Registered socket for user: ${userId}`);
  });

  socket.on("callUser", async ({ from, fromUsername, to, offer, callType }) => {
    console.log(`📞 Call from ${from} to ${to} (${callType})`);
    console.log("Call from fromusername:",fromUsername);
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

socket.on("joinRoom", ({ userId, username, roomCode }, callback) => {
  if (!userId || !roomCode) {
    const msg = "Missing userId or roomCode.";
    if (callback) return callback({ success: false, message: msg });
    return socket.emit("error", { message: msg });
  }

  userId = String(userId);
  roomCode = String(roomCode);

  // prevent duplicate joins
  if (activeRooms.has(roomCode) && activeRooms.get(roomCode).has(userId)) {
    console.log(`❌ Duplicate join attempt: ${userId} in ${roomCode}`);
    if (callback) return callback({ success: false, message: "Already in meeting" });
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

  socket.to(roomCode).emit("userJoined", { userId, username });
  socket.emit("meeting-toast", { message: "You joined the meeting" });

  const existingUsers = Array.from(activeRooms.get(roomCode)).filter((id) => id !== userId);
  socket.emit("existingUsers", { users: existingUsers });

  // ✅ Confirm success back to frontend
  if (callback) callback({ success: true, users: existingUsers });
});


socket.on("checkJoined", ({ roomCode, userId }, callback) => {

  console.log("Check joined called with:",{roomCode,userId});
  const joined =
    activeRooms.has(roomCode) && activeRooms.get(roomCode).has(String(userId));

  if (callback) callback({ joined });
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

socket.on("leaveRoom", async ({ userId, username, roomCode, teamId }) => {
  console.log("🚪 leaveRoom triggered:", { userId, username, roomCode, teamId });

  userId = String(userId);
  roomCode = String(roomCode);

  socket.leave(roomCode);
  socket.to(roomCode).emit("userLeft", { userId, username });
  socket.emit("meeting-toast", { message: "You left the meeting" });

  if (activeRooms.has(roomCode)) {
  activeRooms.get(roomCode).delete(userId);

  if (activeRooms.get(roomCode).size === 0) {
    activeRooms.delete(roomCode);
    console.log(`🏁 All users left room ${roomCode}.`);

    if (teamId) {
      console.log(`Ending DB meeting for team ${teamId}...`);
      try {
        const result = await meetServ.endMeeting(Number(teamId), Number(userId));
        console.log("✅ Meeting ended successfully:", result.message);
      } catch (err) {
        console.error("❌ Failed to end meeting in DB:", err);
      }
    } else {
      console.log("🌀 Ad-hoc meeting ended (no teamId, no DB update).");
    }
  }
}

  meetingSockets.delete(userId);
  console.log(`👋 User ${userId} left room ${roomCode}`);
});

// To update the database when 
socket.on("startMeeting", async ({ teamId, startedBy, meetingCode }) => {
  try {
    console.log(`🚀 Starting meeting for team ${teamId} by user ${startedBy}`);

    await meetServ.startMeeting(teamId, startedBy, meetingCode); // service function
    console.log("✅ Meeting marked active in DB");
  } catch (error) {
    console.error("❌ Failed to start meeting in DB:", error);
  }
 });

  socket.on("disconnect", () => {
    const userId = String(socket.userId);
    const roomCode = String(socket.roomCode);

    if (roomCode && activeRooms.has(roomCode)) {
      activeRooms.get(roomCode).delete(userId);
      socket.to(roomCode).emit("userLeft", { userId });
      if (activeRooms.get(roomCode).size === 0) activeRooms.delete(roomCode);
    }

    if (userId) meetingSockets.delete(userId);
    console.log(`❌ Socket disconnected: ${socket.id} (${userId})`);

  });
};

      