module.exports = function callHandlers(io, socket) {
  socket.on("register", ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;
    socket.join(`user_${userId}`);
  });

  socket.on("callUser", ({ from, to, offer, callType }) => {
    io.to(`user_${to}`).emit("incomingCall", {
      from,
      offer,
      callType,
    });
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
};

