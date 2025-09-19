module.exports = function callHandlers(io, socket) {
  console.log("Call handlers initialized for:", socket.id);

  socket.on("register", ({ userId }) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`User ${userId} registered`);
  });

  socket.on("callUser", ({ from, to, offer, callType }) => {
    console.log(`Call from ${from} to ${to}`);
    io.to(`user_${to}`).emit("incomingCall", { from, offer, callType });
  });

  socket.on("answerCall", ({ to, answer }) => {
    console.log(`Answer sent to ${to}`);
    io.to(`user_${to}`).emit("callAccepted", { answer });
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    console.log(`ICE candidate sent to ${to}`);
    io.to(`user_${to}`).emit("iceCandidate", {
      from: socket.userId,
      candidate
    });
  });

  socket.on("endCall", ({ to, from }) => {
    if (!from) return;
    console.log(`Call ended by ${from} to ${to}`);
    io.to(`user_${to}`).emit("endCall", { from });
    io.to(`user_${from}`).emit("endCall", { from });
  });

  socket.on("cancelCall", ({ to, from }) => {
    console.log(`Call cancelled by ${from} to ${to}`);
    io.to(`user_${to}`).emit("callCancelled", { from });
  });
};
