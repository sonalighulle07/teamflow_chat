module.exports = function callHandlers(io, socket) {
  console.log("Call handlers initialized for:", socket.id);

  socket.on("register", ({ userId }) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
  });

  socket.on("callUser", ({ from, to, offer, callType }) => {
    console.log("Inside Call user")
    io.to(`user_${to}`).emit("incomingCall", { from, offer, callType });
  });

  socket.on("answerCall", ({ to, answer }) => {
    io.to(`user_${to}`).emit("callAccepted", { answer });
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    io.to(`user_${to}`).emit("iceCandidate", {
      from: socket.userId,
      candidate
    });
  });

  socket.on("endCall", ({ to }) => {
    if (!socket.userId) return;
    io.to(`user_${to}`).emit("endCall", { from: socket.userId });
  });

  socket.on("cancelCall", ({ to }) => {
    io.to(`user_${to}`).emit("callCancelled", { from: socket.userId });
  });
};
