const User = require("../../models/User");
const { sendPushNotification } = require("../../Utils/pushService");

const activeRooms = {};  // { roomCode: { userId: { username, socketId } } }
const meetingSockets = new Map(); // userId => socketId

const meetServ = require("../../controllers/services/groupMeetings");

module.exports = function callHandlers(io, socket) {
  // -----------------------------------------------------
  // REGISTER USER → For Direct Calls
  // -----------------------------------------------------
  socket.on("register", ({ userId }) => {
    if (!userId) return;

    userId = String(userId);
    socket.userId = userId;
    socket.join(`user_${userId}`);
    meetingSockets.set(userId, socket.id);

    console.log(`✅ Registered socket for user: ${userId}`);
  });

  // -----------------------------------------------------
  // ONE-TO-ONE CALL EVENTS
  // -----------------------------------------------------
  socket.on("callUser", async ({ from, fromUsername, to, offer, callType }) => {
    io.to(`user_${to}`).emit("incomingCall", { from, fromUsername, offer, callType });

    // Push Notification
    try {
      const subscription = await User.getPushSubscription(to);
      if (subscription) {
        await sendPushNotification(subscription, {
          title: "Incoming Call",
          body: `📞 ${callType} call from ${fromUsername}`,
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

  socket.on("cancelCall", ({ to, from, fromUsername }) => {
    io.to(`user_${to}`).emit("callCancelled", { from, fromUsername });
  });

  socket.on("endCall", ({ from, fromUsername, to }) => {
    if (to) io.to(`user_${to}`).emit("endCall", { from, fromUsername });
    if (from) io.to(`user_${from}`).emit("endCall", { from, fromUsername });
  });

  // -----------------------------------------------------
  // WEBRTC SIGNAL RELAY
  // -----------------------------------------------------
  socket.on("offer", ({ to, offer }) => {
    const target = meetingSockets.get(String(to));
    if (target) io.to(target).emit("offer", { from: socket.userId, offer });
  });

  socket.on("answer", ({ to, answer }) => {
    const target = meetingSockets.get(String(to));
    if (target) io.to(target).emit("answer", { from: socket.userId, answer });
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    const target = meetingSockets.get(String(to));
    if (target) io.to(target).emit("iceCandidate", { from: socket.userId, candidate });
  });

  // -----------------------------------------------------
  // GROUP MEETING — JOIN ROOM
  // -----------------------------------------------------
socket.on("joinRoom", ({ userId, username, roomCode }, callback) => {
  if (!userId || !roomCode) {
    const msg = "Missing userId or roomCode.";
    if (callback) return callback({ success: false, message: msg });
    return socket.emit("error", { message: msg });
  }

  userId = String(userId);
  roomCode = String(roomCode);

  // Prevent duplicate join
  if (activeRooms[roomCode] && activeRooms[roomCode][userId]) {
    const msg = "Already in meeting";
    if (callback) return callback({ success: false, message: msg });
    return socket.emit("error", { message: msg });
  }

  if (!activeRooms[roomCode]) {
    activeRooms[roomCode] = {};
  }

  socket.userId = userId;
  socket.roomCode = roomCode;
  socket.join(roomCode);

  // Store user
  activeRooms[roomCode][userId] = {
    username,
    socketId: socket.id,
    joinedAt: Date.now(),
  };

  // Existing users
  const existingUsers = Object.entries(activeRooms[roomCode])
    .filter(([id]) => id !== userId)
    .map(([id, u]) => ({ userId: id, username: u.username }));

  // BACKEND FIX HERE 👇
  socket.emit("existingUsers", { users: existingUsers });

  meetingSockets.set(userId, socket.id);

  socket.to(roomCode).emit("userJoined", { userId, username });

  console.log(`👥 User ${userId} joined room ${roomCode}`);
  console.log("Room Users:", activeRooms[roomCode]);

  if (callback) callback({ success: true, users: existingUsers });
});


  // -----------------------------------------------------
  // CHECK JOIN STATUS (Reconnect Support)
  // -----------------------------------------------------
  socket.on("checkJoined", ({ roomCode, userId }, callback) => {
    userId = String(userId);
    const joined =
      activeRooms[roomCode] && activeRooms[roomCode][userId]
        ? true
        : false;
    if (callback) callback({ joined });
  });

  // -----------------------------------------------------
  // LEAVE ROOM
  // -----------------------------------------------------
  socket.on("leaveRoom", async ({ userId, username, roomCode, teamId }) => {
    userId = String(userId);
    roomCode = String(roomCode);

    socket.leave(roomCode);
    socket.to(roomCode).emit("userLeft", { userId,username });

    if (activeRooms[roomCode]) {
      delete activeRooms[roomCode][userId];

      // If room empty → delete room
      if (Object.keys(activeRooms[roomCode]).length === 0) {
        delete activeRooms[roomCode];

        if (teamId) {
          try {
            await meetServ.endMeeting(Number(teamId), Number(userId));
            console.log(`🏁 Meeting ended for team ${teamId}`);
          } catch (err) {
            console.error("❌ DB meeting end failed:", err);
          }
        }
      }
    }

    meetingSockets.delete(userId);
  });

  // -----------------------------------------------------
  // START MEETING (DB)
  // -----------------------------------------------------
  socket.on("startMeeting", async ({ teamId, startedBy, meetingCode }) => {
    try {
      await meetServ.startMeeting(teamId, startedBy, meetingCode);
      console.log("Meeting marked active in DB");
    } catch (err) {
      console.error(err);
    }
  });

  // -----------------------------------------------------
  // DISCONNECT
  // -----------------------------------------------------
  socket.on("disconnect", () => {
    const userId = String(socket.userId);
    const roomCode = String(socket.roomCode);

    if (roomCode && activeRooms[roomCode]) {
      delete activeRooms[roomCode][userId];

      socket.to(roomCode).emit("userLeft", { userId });

      if (Object.keys(activeRooms[roomCode]).length === 0) {
        delete activeRooms[roomCode];
      }
    }

    meetingSockets.delete(userId);
    console.log(`❌ Socket disconnected: ${socket.id} (${userId})`);
  });
};
