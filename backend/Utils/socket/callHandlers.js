const User = require("../../models/User");
const { sendPushNotification } = require("../../Utils/pushService");



module.exports = function callHandlers(io, socket) {
  socket.on("register", ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;
    socket.join(`user_${userId}`);
  });

socket.on("callUser", async ({ from, to, offer, callType }) => {
  // Emit to callee’s socket
  io.to(`user_${to}`).emit("incomingCall", { from, offer, callType });

  // Send push notification to callee
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

  socket.on("answerCall", ({ to, answer }) => {
    io.to(`user_${to}`).emit("callAccepted", { answer });
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    io.to(`user_${to}`).emit("iceCandidate", { candidate });
  });

  socket.on("endCall", (payload) => {
    const { to, from } = payload;
    if (!to || !from) return;
    // notify the callee
    io.to(`user_${to}`).emit("endCall", { from });
    // notify the caller
    io.to(`user_${from}`).emit("endCall", { from });
  });

  socket.on("cancelCall", ({ to, from }) => {
    io.to(`user_${to}`).emit("callCancelled", { from });
  });

  socket.on("joinMeeting", ({ code, userId }) => {
  socket.join(`meeting_${code}`);
  io.to(`meeting_${code}`).emit("userJoined", { userId });
});




};

