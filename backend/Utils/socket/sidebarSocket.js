module.exports = (io, socket) => {
  console.log("Sidebar socket connected:", socket.id);

  // ---------------------------------------------------------
  // USERS — Real-time Sorting Events
  // ---------------------------------------------------------

  // When user becomes online
  socket.on("userOnline", ({ userId }) => {
    io.emit("userActivity", {
      id: userId,
      time: new Date().toISOString(),
    });
  });

  // When user goes offline
  socket.on("userOffline", ({ userId }) => {
    io.emit("userActivity", {
      id: userId,
      time: new Date().toISOString(),
    });
  });

  // When user sends or receives private message
  socket.on("userChatActivity", ({ userId }) => {
    io.emit("userActivity", {
      id: userId,
      time: new Date().toISOString(),
    });
  });

  // ---------------------------------------------------------
  // TEAMS — Real-time Sorting Events
  // ---------------------------------------------------------

  // When team gets new message
  socket.on("teamChatActivity", ({ teamId }) => {
    io.emit("teamActivity", {
      id: teamId,
      time: new Date().toISOString(),
    });
  });

  // When team is updated (new member added)
  socket.on("teamUpdated", ({ teamId }) => {
    io.emit("teamActivity", {
      id: teamId,
      time: new Date().toISOString(),
    });
  });

  // When invite accepted — team becomes active
  socket.on("teamInviteAccepted", ({ teamId }) => {
    io.emit("teamActivity", {
      id: teamId,
      time: new Date().toISOString(),
    });
  });
};
