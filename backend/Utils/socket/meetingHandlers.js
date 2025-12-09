// handlers/meetingHandlers.js
const meetServ = require("../../controllers/services/groupMeetings");

// MAP structure:
// activeRooms = Map {
//   roomCode => Map {
//       userId => { username, socketId, joinedAt }
//   }
// }

const activeRooms = new Map();

module.exports = function meetingHandlers(io, socket, connectedSockets) {
  const log = (...args) => console.log("[meetingHandlers]", ...args);

  const ensureRoom = (roomCode) => {
    if (!activeRooms.has(roomCode)) {
      activeRooms.set(roomCode, new Map());
    }
    return activeRooms.get(roomCode);
  };

  // // Helper: create room if missing
  // const ensureRoom = (roomCode,roomState) => {
  //   if (!activeRooms.has(roomCode)) {
  //     activeRooms.set(roomCode, {
  //       users: new Map(),
  //       permissions: new Map(),
  //       hostId: null               // <-- store meeting host
  //       roomState: from frontend when the meeting is started or add from feild for global meeting
  //     });
  //   }
  //   return activeRooms.get(roomCode);
  // };

  // -------------------------------------------------------
  // JOIN MEETING
  // -------------------------------------------------------
  socket.on("meet-joinRoom", ({ userId, username, roomCode/*, roomState*/ } = {}, cb) => {
    
    if (!userId || !roomCode) {
      return cb?.({ success: false, message: "Missing userId or roomCode." });
    }

    userId = String(userId);
    roomCode = String(roomCode);

    const room = ensureRoom(roomCode);

    if (room.has(userId)) {
      return cb?.({ success: false, message: "Already in meeting" });
    }

    // Store in socket
    socket.userId = userId;
    socket.roomCode = roomCode;
    socket.join(roomCode);

    // Add user to room
    room.set(userId, {
      username,
      socketId: socket.id,
      joinedAt: Date.now(),
    });

    // Add to connectedSockets[userId] -> Set(socketIds)
    if (!connectedSockets.has(userId)) {
      connectedSockets.set(userId, new Set());
    }

    connectedSockets.get(userId).add(socket.id);

    // Build existing users list
    const existingUsers = [...room.entries()]
      .filter(([id]) => id !== userId)
      .map(([id, u]) => ({ userId: id, username: u.username }));

    socket.emit("existingUsers", { users: existingUsers });
    socket.to(roomCode).emit("userJoined", { userId, username });

    log("JOIN ROOM", roomCode, "user:", userId);
    cb?.({ success: true, users: existingUsers });
  });

  // -------------------------------------------------------
  // LEAVE MEETING
  // -------------------------------------------------------
  socket.on("meet-leaveRoom", async ({ userId, username, roomCode, teamId = null } = {}) => {
    if (!userId || !roomCode) return;

    userId = String(userId);
    roomCode = String(roomCode);

    socket.leave(roomCode);
    socket.to(roomCode).emit("userLeft", { userId,username });

    const room = activeRooms.get(roomCode);
    if (room) {
      room.delete(userId);

      if (room.size === 0) {
        activeRooms.delete(roomCode);

        // End meeting in DB
        if (teamId) {
          try {
            await meetServ.endMeeting(Number(teamId), Number(userId));
            log(`Meeting ended for team ${teamId}`);
          } catch (err) {
            console.error("DB meeting end failed:", err);
          }
        }
      }
    }

    log("LEAVE ROOM", roomCode, "user:", userId);
  });

  // -------------------------------------------------------
  // CHECK JOINED (MAP VERSION)
  // -------------------------------------------------------
  socket.on("checkJoined", ({ roomCode, userId } = {}, cb) => {
    if (!roomCode || !userId) {
      return cb?.({ joined: false });
    }

    roomCode = String(roomCode);
    userId = String(userId);

    const room = activeRooms.get(roomCode);
    const joined = room?.has(userId) || false;

    console.log(`[checkJoined] room=${roomCode}, user=${userId}, joined=${joined}`);

    cb?.({ joined });
  });



// =============================
// GET ACTIVE USERS IN A ROOM
// =============================
socket.on("get-active-users", ({ roomCode }, callback) => {

  console.log(`[get-active-users] room=${roomCode}`);

  try {
    if (!roomCode) {
      return callback({ success: false, message: "roomCode missing" });
    }

    const room = activeRooms.get(roomCode);
    if (!room) {
      return callback({ success: false, users: [] });
    }

    // Convert map -> array
    const users = Array.from(room.entries()).map(([userId, data]) => ({
      userId,
      username: data.username,
      joinedAt: data.joinedAt,
    }));

    callback({
      success: true,
      users,
    });
  } catch (err) {
    console.error("Error in get-active-users:", err);
    callback({ success: false, users: [] });
  }
});


// -------------------------------------------------------
// CHECK JOINED — SAFE VERSION (MULTI-TAB FRIENDLY)
// -------------------------------------------------------
socket.on("header-checkJoined", ({ roomCode, userId, requesterSocketId }) => {
  if (!roomCode || !userId || !requesterSocketId) {
    return; // ignore bad payload
  }

  roomCode = String(roomCode);
  userId = String(userId);

  const room = activeRooms.get(roomCode);

  const joined = room?.has(userId) || false;

  // Send response back ONLY to the requesting socket
  io.to(requesterSocketId).emit("checkJoinedResponse", { joined });

  console.log(
    `[checkJoined] room=${roomCode}, user=${userId}, requestingSocket=${requesterSocketId}, joined=${joined}`
  );
});


  // -------------------------------------------------------
  // START MEETING (DB ONLY)
  // -------------------------------------------------------
  socket.on("startMeeting", async ({ teamId, startedBy, meetingCode }) => {
    try {
      await meetServ.startMeeting(teamId, startedBy, meetingCode);
      log("Meeting started:", meetingCode);
    } catch (err) {
      log("startMeeting error:", err);
    }
  });


  // -------------------------------------------------------
  // WEBRTC RELAY
  // -------------------------------------------------------

  const relay = (eventType, payload = {}) => {
    if (!payload || !payload.to) return;

    const targetId = String(payload.to);

    const socketSet = connectedSockets.get(targetId);
    if (!socketSet || socketSet.size === 0) {
      log(`relay fail: no socket for ${payload.to}`);
      return;
    }

    const forward = {
      ...payload,
      from: socket.userId,
    };

    socketSet.forEach((sid) => {
      io.to(sid).emit(eventType, forward);
    });
  };

  socket.on("meet-offer", (p) => relay("meet-offer", p));
  socket.on("meet-answer", (p) => relay("meet-answer", p));
  socket.on("meet-iceCandidate", (p) => relay("meet-iceCandidate", p));

  // -------------------------------------------------------
  // DISCONNECT HANDLER
  // -------------------------------------------------------
  socket.on("disconnect", () => {
    const userId = socket.userId;
    const roomCode = socket.roomCode;

    // Remove socket from connectedSockets map
    if (userId && connectedSockets.has(userId)) {
      const set = connectedSockets.get(userId);
      set.delete(socket.id);
      if (set.size === 0) connectedSockets.delete(userId);
    }

    // Remove only from roomCode's meeting
    if (roomCode && activeRooms.has(roomCode)) {
      const room = activeRooms.get(roomCode);
      room.delete(userId);

      socket.to(roomCode).emit("userLeft", { userId });

      if (room.size === 0) {
        activeRooms.delete(roomCode);
      }
    }

    log("socket disconnected", socket.id);
  });
};
