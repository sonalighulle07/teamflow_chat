// server callHandlers (replaces your previous file)
const User = require("../../models/User");
const { sendPushNotification } = require("../../Utils/pushService");
const meetServ = require("../../controllers/services/groupMeetings");

// For group meetings (unchanged, left in place)
const activeRooms = new Map();

// For WebRTC signalling for ANY CALL TYPE (1:1 or group)
const meetingSockets = new Map();

// Active CALLS (1:1 or multi-user)
const activeCalls = new Map();
/*
activeCalls = {
   callId: {
      participants: Map<userId, { userId, username, socketId, joinedAt }>
   }
}
*/

let NEXT_CALL_ID = 1000;

module.exports = function callHandlers(io, socket) {
  // ---------- HELPERS ----------
  const log = (...args) => console.log("[callHandlers]", ...args);

  const setSocketForUser = (userId, sId) => {
    if (!userId) return;
    meetingSockets.set(String(userId), sId);
    log(`meetingSockets.set ${userId} -> ${sId}`);
  };

  const getSocketForUser = (userId) => {
    if (!userId) return null;
    const sid = meetingSockets.get(String(userId));
    return sid || null;
  };

  // ----------------------------------------------------------
  // REGISTER USER
  // ----------------------------------------------------------
  socket.on("register", ({ userId } = {}) => {
    if (!userId) return;

    userId = String(userId);
    socket.userId = userId;

    socket.join(`user_${userId}`);
    setSocketForUser(userId, socket.id);

    log(`Registered user ${userId} (socket: ${socket.id})`);
  });

  // ============================================================
  //                     1 : 1 CALLS (UPGRADED)
  // ============================================================
  function createCallRoom(user1, user2) {
    const callId = `call_${NEXT_CALL_ID++}`;

    activeCalls.set(callId, {
      participants: new Map(),
    });

    const map = activeCalls.get(callId).participants;

    map.set(String(user1.userId), {
      userId: String(user1.userId),
      username: user1.username,
      socketId: user1.socketId || getSocketForUser(user1.userId) || null,
      joinedAt: Date.now(),
    });

    map.set(String(user2.userId), {
      userId: String(user2.userId),
      username: user2.username,
      socketId: user2.socketId || getSocketForUser(user2.userId) || null,
      joinedAt: null, // second user not joined yet
    });

    log("Created callId:", callId, "participants:", Array.from(map.keys()));
    return callId;
  }

  function joinCallRoom(callId, userId, username) {
    const call = activeCalls.get(callId);
    if (!call) {
      log("joinCallRoom: call not found", callId);
      return;
    }

    call.participants.set(String(userId), {
      userId: String(userId),
      username,
      socketId: socket.id,
      joinedAt: Date.now(),
    });

    // ensure socket is in call room (so broadcast to callId reaches them)
    socket.join(callId);

    // make sure meetingSockets mapping is up-to-date
    setSocketForUser(userId, socket.id);

    log(`User ${userId} joined ${callId} (socket ${socket.id})`);
  }

  // ------------------- BASIC 1:1 CALL HANDLERS -------------------

  socket.on("callUser", async ({ from, fromUsername, to, offer, callType } = {}) => {
    if (!to || !from) return;

    try {
      // if caller already has callId on socket (rare), use it, otherwise create a new call
      let callId = socket.callId;
      if (!callId) {
        callId = createCallRoom(
          { userId: String(from), username: fromUsername, socketId: socket.id },
          { userId: String(to), username: "Unknown", socketId: null }
        );
        // store callId on caller socket so subsequent adds use it
        socket.callId = callId;
      }

      // Make caller join the call room (so caller sees call events)
      joinCallRoom(callId, from, fromUsername);
      // store callId on caller socket
      socket.callId = callId;

      // Emit incomingCall to the callee's socketId if available; fallback to user_<id> room
      const targetSocketId = getSocketForUser(to);
      const payload = { from, fromUsername, offer, callType, callId };

      if (targetSocketId) {
        io.to(targetSocketId).emit("incomingCall", payload);
      } else {
        // fallback: emit to user_<to> room — frontends listening on user_<id> will receive
        io.to(`user_${to}`).emit("incomingCall", payload);
      }

      // ALSO notify caller about created callId (so frontend knows)
      io.to(socket.id).emit("call-created", { callId });

      // Push notification (best-effort)
      try {
        const subscription = await User.getPushSubscription(to);
        if (subscription) {
          await sendPushNotification(subscription, {
            title: "Incoming Call",
            body: `📞 ${callType} call from ${fromUsername || from}`,
          });
        }
      } catch (err) {
        log("Push notification failed:", err);
      }

      log(`callUser: ${from} -> ${to} (callId=${callId})`);
    } catch (err) {
      log("callUser error:", err);
    }
  });

  socket.on("answerCall", ({ to, answer, from, fromUsername, callId } = {}) => {
    // Caller may have created the callId earlier; ensure callee is added to call room
    if (callId) {
      // when callee answers, join them into the call room
      joinCallRoom(callId, from, fromUsername);
      // attach callId on this socket
      socket.callId = callId;
    }

    // relay the answer to the peer (use mapping)
    const targetSocketId = getSocketForUser(to);
    const payload = { answer, from, fromUsername, callId };
    if (targetSocketId) io.to(targetSocketId).emit("callAccepted", payload);
    else io.to(`user_${to}`).emit("callAccepted", payload);

    log(`answerCall from ${from} relayed to ${to} (callId=${callId})`);
  });

  socket.on("cancelCall", ({ to, from, fromUsername, callId } = {}) => {
    const payload = { from, fromUsername, callId };
    const targetSocketId = getSocketForUser(to);
    if (targetSocketId) io.to(targetSocketId).emit("callCancelled", payload);
    else io.to(`user_${to}`).emit("callCancelled", payload);

    // Also inform call room (if any) that this call was cancelled
    if (callId) io.to(callId).emit("callCancelled", payload);

    log(`cancelCall ${from} -> ${to} (callId=${callId})`);
  });

  socket.on("endCall", ({ to, from, fromUsername, callId } = {}) => {
    if (callId) {
      // broadcast to whole call room
      io.to(callId).emit("endCall", { from, fromUsername, callId });

      // remove sockets from that room and delete the call
      try {
        io.in(callId).socketsLeave(callId);
      } catch (e) {
        log("socketsLeave error:", e);
      }
      activeCalls.delete(callId);
      log(`endCall: call ${callId} ended by ${from}`);
    } else {
      // fallback: direct end to 'to' user
      const targetSocketId = getSocketForUser(to);
      if (targetSocketId) io.to(targetSocketId).emit("endCall", { from, fromUsername, callId: null });
      else io.to(`user_${to}`).emit("endCall", { from, fromUsername, callId: null });
      log(`endCall: direct end from ${from} to ${to}`);
    }
  });

  // ============================================================
  //             ADD USER TO EXISTING CALL (MULTI-USER)
  // ============================================================

  socket.on("call-add-user", ({ addedUserId, addedUsername, inviterId, callId } = {}) => {
    if (!addedUserId || !callId) {
      log("call-add-user missing params", { addedUserId, callId });
      return;
    }

    const call = activeCalls.get(callId);
    if (!call) {
      log("call-add-user: call not found", callId);
      return;
    }

    // Add invited user as participant placeholder (not joined yet)
    call.participants.set(String(addedUserId), {
      userId: String(addedUserId),
      username: addedUsername,
      socketId: getSocketForUser(addedUserId) || null,
      joinedAt: null,
    });

    // Prepare payload
    const payload = {
      userId: addedUserId,
      username: addedUsername,
      inviterId,
      callId,
    };

    // Ring the invited user directly if we know their socketId
    const invitedSocketId = getSocketForUser(addedUserId);
    if (invitedSocketId) {
      io.to(invitedSocketId).emit("call-invite-ringing", payload);
    } else {
      // fallback to user_<id> room
      io.to(`user_${addedUserId}`).emit("call-invite-ringing", payload);
    }

    // Also notify everyone already inside the call room
    io.to(callId).emit("call-invite-ringing", payload);

    log("call-add-user → ringing", addedUserId, "in", callId);
  });

  socket.on("call-invite-joined", ({ userId, username, callId } = {}) => {
    if (!callId || !userId) {
      log("call-invite-joined missing params", { userId, callId });
      return;
    }

    const call = activeCalls.get(callId);
    if (!call) {
      log("call-invite-joined: call not found", callId);
      return;
    }

    // Put the joining user into participants map (update socket & joinedAt)
    call.participants.set(String(userId), {
      userId: String(userId),
      username,
      socketId: socket.id,
      joinedAt: Date.now(),
    });

    // Ensure the user socket is in the call room
    socket.join(callId);
    socket.callId = callId;
    setSocketForUser(userId, socket.id);

    // Notify all participants in the call
    io.to(callId).emit("call-invite-joined", { userId, username, callId });

    log("call-invite-joined", userId, "in", callId);
  });

  socket.on("call-invite-cancel", ({ userId, callId } = {}) => {
    if (!callId || !userId) return;

    // remove placeholder participant (if exists)
    const call = activeCalls.get(callId);
    if (call && call.participants.has(String(userId))) {
      call.participants.delete(String(userId));
    }

    // notify only call room participants
    io.to(callId).emit("call-invite-cancel", { userId, callId });

    // also notify the invited user directly if connected
    const invitedSocketId = getSocketForUser(userId);
    if (invitedSocketId) io.to(invitedSocketId).emit("call-invite-cancel", { userId, callId });

    log("call-invite-cancel", userId, "in", callId);
  });

  socket.on("call-invite-timeout", ({ userId, callId } = {}) => {
    if (!callId || !userId) return;
    io.to(callId).emit("call-invite-timeout", { userId, callId });

    // notify invited user if connected
    const invitedSocketId = getSocketForUser(userId);
    if (invitedSocketId) io.to(invitedSocketId).emit("call-invite-timeout", { userId, callId });

    log("call-invite-timeout", userId, "in", callId);
  });

  socket.on("call-invite-timeout-remove", ({ userId, callId } = {}) => {
    if (!callId || !userId) return;
    const call = activeCalls.get(callId);
    if (call && call.participants.has(String(userId))) {
      call.participants.delete(String(userId));
    }

    io.to(callId).emit("call-invite-timeout-remove", { userId, callId });

    const invitedSocketId = getSocketForUser(userId);
    if (invitedSocketId) io.to(invitedSocketId).emit("call-invite-timeout-remove", { userId, callId });

    log("call-invite-timeout-remove", userId, "in", callId);
  });

  // ============================================================
  //                WEBRTC RELAY
  // ============================================================
  const relaySignal = (type, payload = {}) => {
    if (!payload || typeof payload.to === "undefined") {
      log("relaySignal missing 'to' in payload", { type, payload });
      return;
    }

    const to = String(payload.to);
    const from = payload.from || socket.userId;

    const targetSocket = getSocketForUser(to);

    if (targetSocket) {
      io.to(targetSocket).emit(type, { ...payload, from });
      return;
    }

    // fallback to room
    io.to(`user_${to}`).emit(type, { ...payload, from });
  };

  socket.on("offer", (payload) => relaySignal("offer", payload));
  socket.on("answer", (payload) => relaySignal("answer", payload));
  socket.on("iceCandidate", (payload) => relaySignal("iceCandidate", payload));

  // ============================================================
  //                GROUP ROOMS (UNCHANGED)
  // ============================================================
  socket.on("joinRoom", ({ userId, username, roomCode } = {}, callback) => {
    if (!userId || !roomCode) return;

    userId = String(userId);
    roomCode = String(roomCode);

    if (!activeRooms.has(roomCode)) activeRooms.set(roomCode, new Map());
    const roomMap = activeRooms.get(roomCode);

    if (roomMap.has(userId))
      return callback && callback({ success: false, message: "Already in room" });

    socket.userId = userId;
    socket.roomCode = roomCode;
    socket.join(roomCode);

    roomMap.set(userId, { username, socketId: socket.id, joinedAt: Date.now() });
    setSocketForUser(userId, socket.id);

    const existingUsers = Array.from(roomMap.entries())
      .filter(([id]) => id !== userId)
      .map(([id, u]) => ({ userId: id, username: u.username, socketId: u.socketId }));

    socket.emit("existingUsers", { users: existingUsers });
    socket.to(roomCode).emit("userJoined", { userId, username });

    callback && callback({ success: true, users: existingUsers });
  });

  socket.on("leaveRoom", ({ userId, username, roomCode } = {}) => {
    if (!userId || !roomCode) return;

    userId = String(userId);
    roomCode = String(roomCode);

    socket.leave(roomCode);
    socket.to(roomCode).emit("userLeft", { userId, username });

    const roomMap = activeRooms.get(roomCode);
    if (roomMap) {
      roomMap.delete(userId);
      if (roomMap.size === 0) activeRooms.delete(roomCode);
    }

    meetingSockets.delete(userId);
  });

  socket.on("checkJoined", ({ roomCode, userId } = {}, cb) => {
    const joined =
      activeRooms.has(String(roomCode)) &&
      activeRooms.get(String(roomCode)).has(String(userId));

    cb && cb({ joined: !!joined });
  });

  socket.on("startMeeting", async ({ teamId, startedBy, meetingCode } = {}) => {
    try {
      await meetServ.startMeeting(teamId, startedBy, meetingCode);
    } catch (err) {
      log("startMeeting error:", err);
    }
  });

  // ----------------------------------------------------------
  // DISCONNECT
  // ----------------------------------------------------------
  socket.on("disconnect", () => {
    const userId = socket.userId;
    const roomCode = socket.roomCode;

    log("disconnect", { socketId: socket.id, userId, roomCode });

    // Remove from group rooms
    if (roomCode && activeRooms.has(roomCode)) {
      const roomMap = activeRooms.get(roomCode);
      roomMap.delete(userId);
      socket.to(roomCode).emit("userLeft", { userId });

      if (roomMap.size === 0) activeRooms.delete(roomCode);
    }

    // Remove from 1:1 / call rooms
    activeCalls.forEach((call, callId) => {
      if (call.participants.has(String(userId))) {
        call.participants.delete(String(userId));
        io.to(callId).emit("userLeftCall", { userId });

        if (call.participants.size === 0) {
          activeCalls.delete(callId);
        }
      }
    });

    meetingSockets.delete(userId);
  });
};
