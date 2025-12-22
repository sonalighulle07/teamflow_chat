// Utils/socket/callHandlers.js
const User = require("../../models/User");
const { sendPushNotification } = require("../../Utils/pushService");
const meetServ = require("../../controllers/services/groupMeetings");
 
// For group meetings (unchanged, left in place)
const activeRooms = new Map();
 
// Active CALLS (1:1 or multi-user)
const activeCalls = new Map();

/*
activeCalls = {
   callId: {
      participants: Map<userId, { userId, username, socketId, joinedAt }>,
      meta: {  }
   }
}
*/
 
let NEXT_CALL_ID = 1000;
 
module.exports = function callHandlers(io, socket, connectedSockets) {
  
  const log = (...args) => console.log("[callHandlers]", ...args);
 
  // ---------- HELPERS ----------
  // connectedSockets is Map<userId -> Set<socketIds>>
  const getSocketForUser = (userId) => {
    if (!userId) return null;
    const s = connectedSockets.get(String(userId));
    if (!s) return null;

    // Return the most-recently-added socket id (last entry in Set)
    // Array.from preserves insertion order; pop last
    const arr = Array.from(s);
    const sid = arr.length ? arr[arr.length - 1] : null;
    log("getSocketForUser:", userId, "->", sid, "(set size:", s.size, ")");
    return sid || null;
  };
 
  const ringUser = (targetUserId, eventName, payload) => {
    const sid = getSocketForUser(targetUserId);
    if (sid) {
      io.to(sid).emit(eventName, payload);
      log(`Emitted ${eventName} to ${targetUserId} via socket ${sid}`);
    } else {
      // fallback to user_<id> room so any listening socket (maybe not registered) receives it
      io.to(`user_${targetUserId}`).emit(eventName, payload);
      log(`Emitted ${eventName} to room user_${targetUserId} (fallback)`);
    }
  };
 
  // ============================================================
  //                     1 : 1 CALLS (UPGRADED)
  // ============================================================
  function createCallRoom(user1, user2) {
    console.log("Inside createCallRoom...",user1,user2)
    const callId = `call_${NEXT_CALL_ID++}`;
 
    activeCalls.set(callId, {
      participants: new Map(),
      meta: {},
    });
 
    const map = activeCalls.get(callId).participants;
 
    // Use provided socketId or lookup via connectedSockets
    const socketId1 =
      user1.socketId || getSocketForUser(user1.userId) || null;
    const socketId2 =
      user2.socketId || getSocketForUser(user2.userId) || null;
 
    map.set(String(user1.userId), {
      userId: String(user1.userId),
      username: user1.username,
      socketId: socketId1,
      joinedAt: Date.now(),
    });
 
    map.set(String(user2.userId), {
      userId: String(user2.userId),
      username: user2.username,
      socketId: socketId2,
      joinedAt: null, // second user not joined yet
    });
 
    log("Created callId:", callId, "participants:", Array.from(map.keys()));
    return callId;
  }
 
  function joinCallRoom(callId, userId, username) {
    console.log("##################Join call room for:",callId,userId,username+"########################");

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
    User.setInCallStatus(userId);

        socket.callId = callId;
 
    io.to(callId).emit("call-invite-joined", { userId, username, callId });
 
    const participantsArray = Array.from(call.participants.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      socketId: p.socketId,
      joinedAt: p.joinedAt,
    }));
 
    socket.to(callId).emit("participant-joined", {
      newUser: { userId: String(userId), username },
      callId,
      participants: participantsArray,
    });
 
    log(`User ${userId} joined ${callId} (socket ${socket.id})`);
  }
 
  // ------------------- BASIC 1:1 CALL HANDLERS -------------------
  socket.on(
    "callUser",
    async ({ from, fromUsername, to, offer, callType } = {}) => {

      if (!to || !from) return;

      console.log("callUser event recieved:");

      try {
        // create call room (caller + callee placeholder)
        const callId = createCallRoom(
          {
            userId: String(from),
            username: fromUsername,
            socketId: socket.id,
          },
          { userId: String(to), username: "Unknown", socketId: null }
        );
 
        // store callId on caller socket
        socket.callId = callId;
        joinCallRoom(callId, from, fromUsername);
 
        const payload = { from: String(from), fromUsername, offer, callType, callId };
 
        // Try to ring the callee
        ringUser(to, "incomingCall", payload);
 
        // Inform caller that call created
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
    }
  );

 
  socket.on("cancelCall", ({ to, from, fromUsername, callId } = {}) => {
    const payload = { from: String(from), fromUsername, callId };
    ringUser(to, "callCancelled", payload);
 
    // Also inform call room (if any) that this call was cancelled
    if (callId) io.to(callId).emit("callCancelled", payload);
 
    log(`cancelCall ${from} -> ${to} (callId=${callId})`);
  });


  socket.on("endCall", ({ from, fromUsername, callId } = {}) => {

    log("Inside end call....", { from, callId });
 
    if (!callId || !activeCalls.has(callId)) {
      log("endCall: Call not found", callId);
      return;
    }
 
    const call = activeCalls.get(callId);
    const participants = call.participants; // Map

    User.setOnlineStatus(from);

    // remove user from participants
    if (participants.has(String(from))) participants.delete(String(from));
 
    const remainingCount = participants.size;
 
    // If only 1 or 0 users remains → end entire call
    if (remainingCount <= 1) {
      io.to(callId).emit("endCall", {
        from,
        fromUsername,
        callId,
      });



  let remainingUserId = participants.values().next().value.userId;
  console.log(remainingUserId)
  User.setOnlineStatus(remainingUserId);


      // try {
      //   io.in(callId).socketsLeave(callId);
      // } catch (e) {
      //   log("socketsLeave error:", e);
      // }

      activeCalls.delete(callId);
      return;
    }
 
    // More than 2 users → only remove the leaving user
    io.to(callId).emit("user-left-call", {
      userId: from,
      username: fromUsername,
      callId,
    });
 
    const socketId = getSocketForUser(from);
    if (socketId) {
      try {
        io.sockets.sockets.get(socketId)?.leave(callId);
      } catch (err) {
        log("Error removing user from room:", err);
      }
    }
 
    activeCalls.set(callId, call);
  });
 
  // ============================================================
  //             ADD USER TO EXISTING CALL (MULTI-USER)
  // ============================================================
  socket.on(
    "call-add-user",
    ({
      addedUserId,
      addedUsername,
      inviterId,
      callId,
      inviterUsername,
      type,
    } = {}) => {
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
 
      const participantsArray = Array.from(call.participants.values()).map((p) => ({
        userId: p.userId,
        username: p.username,
        socketId: p.socketId,
        joinedAt: p.joinedAt,
      }));
 
      const payload = {
        eventType: "call-add-user",
        isAddUser: true,
        callId,
        inviterId,
        inviterUsername,
        addedUserId,
        addedUsername,
        type,
        participants: participantsArray,
      };
 
      // Ring the invited user directly if we know their socketId
      ringUser(addedUserId, "incomingCall", payload);
 
      // Also notify everyone already inside the call room
      io.to(callId).emit("call-invite-ringing", payload);
 
      log("call-add-user → ringing", addedUserId, "in", callId);
    }
  );


   
  socket.on("answerCall", ({ to, answer, from, fromUsername, callId } = {}) => {
    if (callId) {
      
      // when callee answers, join them into the call room
      joinCallRoom(callId, from, fromUsername);
      socket.callId = callId;
    }
 
    log("Call Room has : ", activeCalls.get(callId));
 
    // relay the answer to the peer (use mapping)
    const payload = { answer, from: String(from), fromUsername, callId };
    ringUser(to, "callAccepted", payload);
 
    log(`answerCall from ${from} relayed to ${to} (callId=${callId})`);
  });
 
  socket.on("call-invite-joined", ({ userId, username, callId } = {}) => {
    if (!callId || !userId) {
      log("call-invite-joined missing params", { userId, callId });
      return;
    }
 
    // console.log("***********************************answerCall with callId:",username,callId+"******************************************")
    // const call = activeCalls.get(callId);
    // if (!call) {
    //   log("call-invite-joined: call not found", callId);
    //   return;
    // }
 
    // call.participants.set(String(userId), {
    //   userId: String(userId),
    //   username,
    //   socketId: socket.id,
    //   joinedAt: Date.now(),
    // });
 
    // socket.join(callId);

    joinCallRoom(callId,userId,username)
    // socket.callId = callId;
 
    // io.to(callId).emit("call-invite-joined", { userId, username, callId });
 
    // const participantsArray = Array.from(call.participants.values()).map((p) => ({
    //   userId: p.userId,
    //   username: p.username,
    //   socketId: p.socketId,
    //   joinedAt: p.joinedAt,
    // }));
 
    // socket.to(callId).emit("participant-joined", {
    //   newUser: { userId: String(userId), username },
    //   callId,
    //   participants: participantsArray,
    // });
 
    log("call-invite-joined", userId, "in", callId);
  });
 
  socket.on("call-invite-cancel", ({ userId, callId } = {}) => {
    if (!callId || !userId) return;
 
    const call = activeCalls.get(callId);
    if (call && call.participants.has(String(userId))) {
      call.participants.delete(String(userId));
    }
 
    io.to(callId).emit("call-invite-cancel", { userId, callId });
 
    ringUser(userId, "call-invite-cancel", { userId, callId });
 
    log("call-invite-cancel", userId, "in", callId);
  });
 
  socket.on("call-invite-timeout", ({ userId, callId } = {}) => {
    if (!callId || !userId) return;
    io.to(callId).emit("call-invite-timeout", { userId, callId });
    ringUser(userId, "call-invite-timeout", { userId, callId });
    log("call-invite-timeout", userId, "in", callId);
  });
 
  socket.on("call-invite-timeout-remove", ({ userId, callId } = {}) => {
    if (!callId || !userId) return;
    const call = activeCalls.get(callId);
    if (call && call.participants.has(String(userId))) {
      call.participants.delete(String(userId));
    }
 
    io.to(callId).emit("call-invite-timeout-remove", { userId, callId });
    ringUser(userId, "call-invite-timeout-remove", { userId, callId });
 
    log("call-invite-timeout-remove", userId, "in", callId);
  });


socket.on("in-call-users-request", ({ callId } = {}, cb) => {
  if (!callId) {
    console.log("in-call-users-request: missing callId");
    if (cb) cb({ success: false, message: "Missing callId" });
    return;
  }

  // Fetch the call room from activeCalls map
  const call = activeCalls.get(callId);

  console.log("call room :", call);

  if (!call) {
    console.log("Call not found:", callId);
    if (cb) cb({ success: false, message: "Call not found" });
    return;
  }

  // Extract users from call.participants (Map)
  const usersInCall = [...call.participants.values()].map((p) => ({
    userId: p.userId,
    username: p.username,
  }));

  console.log("users in call", callId, ":", usersInCall);

  if (cb) {
    cb({
      success: true,
      users: usersInCall,
    });
  }
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
      log(`Relayed ${type} from ${from} -> ${to} via ${targetSocket}`);
      return;
    }
 
    // fallback to room
    io.to(`user_${to}`).emit(type, { ...payload, from });
    log(`Relayed ${type} from ${from} -> user_${to} (fallback)`);
  };
 
  socket.on("offer", (payload) => relaySignal("offer", payload));
  socket.on("answer", (payload) => relaySignal("answer", payload));
  socket.on("iceCandidate", (payload) => relaySignal("iceCandidate", payload));


//   // ----------------------------------------------------------
//   // DISCONNECT
//   // ----------------------------------------------------------
//   socket.on("disconnect", () => {
//     const userId = socket.userId;
//     const roomCode = socket.roomCode;
 
//     log("disconnect", { socketId: socket.id, userId, roomCode });
 
//     // Remove from group rooms
//     if (roomCode && activeRooms.has(roomCode)) {
//       const roomMap = activeRooms.get(roomCode);
//       roomMap.delete(userId);
//       socket.to(roomCode).emit("userLeft", { userId });
 
//       if (roomMap.size === 0) activeRooms.delete(roomCode);
//     }
 
//     // Remove from 1:1 / call rooms
//     activeCalls.forEach((call, callId) => {
//       if (call.participants.has(String(userId))) {
//         call.participants.delete(String(userId));
//         io.to(callId).emit("userLeftCall", { userId });
 
//         if (call.participants.size === 0) {
//           activeCalls.delete(callId);
//         }
//       }
//     });
 
//     // Also remove socketId from connectedSockets (if connectedSockets is Map<userId,Set>)
//     if (userId) {
//       const set = connectedSockets.get(String(userId));
//       if (set) {
//         set.delete(socket.id);
//         if (set.size === 0) connectedSockets.delete(String(userId));
//       }
//     }
//   });
// };
}