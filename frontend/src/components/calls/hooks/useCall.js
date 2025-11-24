// useCall.js
import { useState, useEffect, useRef } from "react";
import socket from "./socket";

export function useCall(userId, currentUsername) {
  console.log("🟢 useCall mounted for user:", userId);

  const [callType, setCallType] = useState(null);
  const [callId, setCallId] = useState(null); // backend-generated call id
  const [incoming, setIncoming] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreamsMap, setRemoteStreamsMap] = useState(new Map()); // userId -> MediaStream
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const peerMap = useRef(new Map()); // userId -> RTCPeerConnection
  const [inCall, setInCall] = useState(false);

  // ------------------------------------------------------------------
  // Helpers to manage remoteStreamsMap reactively
  // ------------------------------------------------------------------
  const setRemoteStreamFor = (remoteUserId, stream) => {
    setRemoteStreamsMap((prev) => {
      const m = new Map(prev);
      m.set(String(remoteUserId), stream);
      return m;
    });
  };

  const removeRemoteStreamFor = (remoteUserId) => {
    setRemoteStreamsMap((prev) => {
      const m = new Map(prev);
      m.delete(String(remoteUserId));
      return m;
    });
  };

  // helper to close peer & remove stream
  const closePeerFor = (peerUserId) => {
    try {
      const p = peerMap.current.get(String(peerUserId));
      if (p) {
        p.ontrack = null;
        p.onicecandidate = null;
        try {
          p.close();
        } catch {}
      }
      peerMap.current.delete(String(peerUserId));
    } catch (e) {
      console.warn("closePeerFor error", e);
    }
    removeRemoteStreamFor(peerUserId);
  };

  // ------------------------------------------------------------------
  // Create local media if not existing
  // ------------------------------------------------------------------
  const ensureLocalStream = async (wantVideo) => {
    if (localStream) {
      // if existing but video requested and currently false, try to get video track
      if (wantVideo && !localStream.getVideoTracks().length) {
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          vStream.getVideoTracks().forEach((t) => localStream.addTrack(t));
        } catch (e) {
          console.warn("ensureLocalStream: could not add video", e);
        }
      }
      return localStream;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: !!wantVideo,
    });
    setLocalStream(stream);
    return stream;
  };

  // ------------------------------------------------------------------
  // Socket bindings & handlers
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return console.log("❌ No userId provided to useCall");

    // ---------- INCOMING CALL (1:1 or add-user invite) ----------
    const handleIncomingCall = (payload) => {
      console.log("📥 incomingCall", payload);

      // Normalize payload for both 1:1 and add-user invites
      const normalized = {
        ...payload,
        isAddUser: payload.isAddUser === true,
        inviterId: payload.inviterId || payload.from,
        inviterUsername: payload.inviterUsername || payload.fromUsername,
        invitedType: payload.type || payload.callType,
      };

      setIncoming(normalized);
      if (normalized.callId) setCallId(normalized.callId);
    };

    // server notifies caller of created callId
    const handleCallCreated = ({ callId: newCallId }) => {
      console.log("🆔 call-created", newCallId);
      if (newCallId) setCallId(newCallId);
    };

    // Legacy: server's answerCall relays 'callAccepted' for 1:1 flows
    const handleCallAccepted = async ({
      answer,
      from,
      callId: answerCallId,
    }) => {
      console.log(
        "📡 callAccepted (legacy) from",
        from,
        "callId:",
        answerCallId
      );
      if (answerCallId) setCallId(answerCallId);

      const peer = peerMap.current.get(String(from));
      if (!peer) {
        console.warn("No peer found for", from);
        return;
      }

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("✅ Remote answer applied for", from);
      } catch (err) {
        console.error("Error applying remote answer:", err);
      }

      setInCall(true);
    };

    // generic answer (relayed)
    const handleAnswer = async ({ answer, from, callId: answerCallId }) => {
      console.log("📡 answer (relayed) from", from, "callId:", answerCallId);
      if (answerCallId) setCallId(answerCallId);
      const peer = peerMap.current.get(String(from));
      if (!peer) {
        console.warn("answer for unknown peer", from);
        return;
      }
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("✅ Remote answer applied for", from);
      } catch (err) {
        console.error("Error applying remote answer:", err);
      }
      setInCall(true);
    };

    // incoming offer: we are the callee for this pair (create answer)
    const handleOffer = async ({
      offer,
      from,
      callId: offerCallId,
      fromUsername,
    }) => {
      console.log("📩 offer from", from, "callId:", offerCallId);
      try {
        // ensure local stream exists (video if requested by callType is unknown here)
        await ensureLocalStream(true);

        // if already have a peer for this 'from', close it first
        closePeerFor(from);

        const peer = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peer.ontrack = (e) => {
          if (e.streams && e.streams[0]) {
            console.log("📡 ontrack from", from);
            setRemoteStreamFor(from, e.streams[0]);
          }
        };

        peer.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("iceCandidate", {
              to: from,
              from: userId,
              candidate: e.candidate,
            });
          }
        };

        // add local tracks
        localStream?.getTracks()?.forEach((t) => peer.addTrack(t, localStream));

        peerMap.current.set(String(from), peer);

        // set remote offer and answer
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        // send answer back (use generic 'answer' relay)
        socket.emit("answer", {
          to: from,
          answer,
          from: userId,
          fromUsername: currentUsername,
          callId: offerCallId,
        });
      } catch (err) {
        console.error("handleOffer error:", err);
      }
    };

    // ICE candidates from remote peer
    const handleIceCandidate = ({ from, candidate }) => {
      const peer = peerMap.current.get(String(from));
      if (!peer) {
        console.warn("ICE for unknown peer", from);
        return;
      }
      if (!candidate) return;
      try {
        peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
    };

    // existing participant(s) created offer for new participant
    const handleParticipantJoined = async ({
      newUser,
      callId: pCallId,
      participants,
    }) => {
      // This event is received by EXISTING participants when someone joins.
      // Existing participants should create an offer directed to the new user.
      try {
        if (!newUser || !newUser.userId) return;
        const newUserId = String(newUser.userId);

        console.log("🔔 participant-joined → create offer to", newUserId);

        // ensure we have local stream
        await ensureLocalStream(true);

        // close any existing peer entry to newUser
        closePeerFor(newUserId);

        const peer = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peer.ontrack = (e) => {
          if (e.streams && e.streams[0]) {
            console.log("📡 ontrack from", newUserId);
            setRemoteStreamFor(newUserId, e.streams[0]);
          }
        };

        peer.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("iceCandidate", {
              to: newUserId,
              from: userId,
              candidate: e.candidate,
            });
          }
        };

        // add local tracks
        localStream?.getTracks()?.forEach((t) => peer.addTrack(t, localStream));

        // save peer before creating offer
        peerMap.current.set(String(newUserId), peer);

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        // emit offer to new participant (server will relay)
        socket.emit("offer", {
          to: newUserId,
          offer,
          from: userId,
          fromUsername: currentUsername,
          callId: pCallId,
        });
      } catch (e) {
        console.error("handleParticipantJoined error:", e);
      }
    };

    // user left call (cleanup)
    const handleUserLeftCall = ({ userId: leftUserId } = {}) => {
      console.log("userLeftCall", leftUserId);
      closePeerFor(leftUserId);
    };

    const handleEndCall = (payload) => {
      console.log("📴 endCall", payload);
      cleanup();
    };

    const handleCallCancelled = () => {
      console.log("📴 callCancelled");
      cleanup();
    };

    // invite / call events (for UI tiles)
    const handleInviteRinging = ({
      userId: invitedUserId,
      username,
      inviterId,
      callId: incomingCallId,
    } = {}) => {
      // front-end UI will listen to "call-invite-ringing" to create tiles
      if (incomingCallId && !callId) setCallId(incomingCallId);
    };

    // Bind socket listeners
    socket.on("incomingCall", handleIncomingCall);
    socket.on("call-created", handleCallCreated);
    socket.on("callAccepted", handleCallAccepted); // legacy 1:1
    socket.on("answer", handleAnswer); // generic relayed answer
    socket.on("offer", handleOffer); // generic relayed offer
    socket.on("iceCandidate", handleIceCandidate);
    socket.on("participant-joined", handleParticipantJoined);
    socket.on("userLeftCall", handleUserLeftCall);
    socket.on("endCall", handleEndCall);
    socket.on("callCancelled", handleCallCancelled);
    socket.on("call-invite-ringing", handleInviteRinging);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("call-created", handleCallCreated);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("answer", handleAnswer);
      socket.off("offer", handleOffer);
      socket.off("iceCandidate", handleIceCandidate);
      socket.off("participant-joined", handleParticipantJoined);
      socket.off("userLeftCall", handleUserLeftCall);
      socket.off("endCall", handleEndCall);
      socket.off("callCancelled", handleCallCancelled);
      socket.off("call-invite-ringing", handleInviteRinging);
    };
  }, [userId, callId, localStream, currentUsername]);

  // ------------------------------------------------------------------
  // START a call (caller)
  // remoteUser = { id, username } — single user to initiate 1:1 with
  // ------------------------------------------------------------------
  async function startCall(type, remoteUser) {
    if (!remoteUser) return console.warn("startCall missing remoteUser");
    setCallType(type);
    setInCall(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      setLocalStream(stream);

      // create peer
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peer.ontrack = (e) => {
        console.log("📡 ontrack (caller) from", remoteUser.id, e.streams);
        if (e.streams && e.streams[0])
          setRemoteStreamFor(remoteUser.id, e.streams[0]);
      };

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("iceCandidate", {
            to: remoteUser.id,
            from: userId,
            candidate: e.candidate,
          });
        }
      };

      // add local tracks
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));

      peerMap.current.set(String(remoteUser.id), peer);

      // offer
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      // emit callUser (server will create callId and notify callee)
      socket.emit("callUser", {
        from: userId,
        fromUsername: currentUsername,
        to: remoteUser.id,
        offer,
        callType: type,
      });
    } catch (err) {
      console.error("startCall error:", err);
      cleanup();
    }
  }

  // ------------------------------------------------------------------
  // ACCEPT an incoming call (callee)
  // ------------------------------------------------------------------
  async function acceptCall() {
    if (!incoming) return console.warn("acceptCall: no incoming call");

    const isAddUser = incoming.isAddUser === true;

    // For add-user invite: just set up local stream and join the call room.
    // Existing participants will create offers to this new joiner via `participant-joined`.
    if (isAddUser) {
      try {
        setCallType(incoming.invitedType || incoming.type);
        setCallId(incoming.callId || callId);
        setInCall(true);

        await ensureLocalStream(incoming.invitedType === "video");

        // emit join so server registers and notifies others
        socket.emit("call-invite-joined", {
          userId,
          username: currentUsername,
          callId: incoming.callId || callId,
        });

        // clear the incoming invite UI
        setIncoming(null);
        return;
      } catch (err) {
        console.error("acceptCall (add-user) error:", err);
        cleanup();
        return;
      }
    }

    // Normal 1:1 flow (has offer)
    setCallType(incoming.callType);
    setCallId(incoming.callId || callId);
    setInCall(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incoming.callType === "video",
      });
      setLocalStream(stream);

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peer.ontrack = (e) => {
        console.log("📡 ontrack (callee) from", incoming.from, e.streams);
        if (e.streams && e.streams[0])
          setRemoteStreamFor(incoming.from, e.streams[0]);
      };

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("iceCandidate", {
            to: incoming.from,
            from: userId,
            candidate: e.candidate,
          });
        }
      };

      stream.getTracks().forEach((t) => peer.addTrack(t, stream));

      peerMap.current.set(String(incoming.from), peer);

      // set remote (offer) then create answer
      await peer.setRemoteDescription(
        new RTCSessionDescription(incoming.offer)
      );
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      // send answer back, include callId so server can attach user to call room
      socket.emit("answer", {
        to: incoming.from,
        answer,
        from: userId,
        fromUsername: currentUsername,
        callId: incoming.callId || callId,
      });

      // notify server we're joined (so other participants can update tiles)
      socket.emit("call-invite-joined", {
        userId,
        username: currentUsername,
        callId: incoming.callId || callId,
      });

      setIncoming(null);
    } catch (err) {
      console.error("acceptCall error:", err);
      cleanup();
    }
  }

  // ------------------------------------------------------------------
  // Add an existing user into the current call (inviter)
  // ------------------------------------------------------------------
  function addUserToCall(addedUserId, addedUsername) {
    if (!callId) {
      console.warn(
        "No callId set — cannot add user. Wait for server to create call."
      );
      return;
    }

    // emit to server to ring + notify call room
    socket.emit("call-add-user", {
      addedUserId,
      addedUsername,
      inviterId: userId,
      inviterUsername: currentUsername,
      type: callType,
      callId,
    });
  }

  // ------------------------------------------------------------------
  // Cancel invite (caller-side)
  // ------------------------------------------------------------------
  function cancelInviteFor(addedUserId) {
    if (!callId) return;
    socket.emit("call-invite-cancel", { userId: addedUserId, callId });
  }

  // ------------------------------------------------------------------
  // End call
  // ------------------------------------------------------------------
  function endCall() {
    if (callId) {
      socket.emit("endCall", { callId, from: userId });
      // server will broadcast endCall to call room
    }
    cleanup();
  }

  // ------------------------------------------------------------------
  // Cleanup peers + streams
  // ------------------------------------------------------------------
  function cleanup() {
    console.log("🧹 cleanup");

    try {
      localStream?.getTracks()?.forEach((t) => t.stop());
    } catch (e) {
      console.warn("cleanup localStream error", e);
    }

    try {
      // stop all remote streams
      remoteStreamsMap?.forEach((s) => {
        try {
          s?.getTracks()?.forEach((t) => t.stop());
        } catch {}
      });
    } catch (e) {}

    peerMap.current.forEach((peer) => {
      try {
        peer.close();
      } catch {}
    });
    peerMap.current.clear();

    setLocalStream(null);
    setRemoteStreamsMap(new Map());
    setIncoming(null);
    setCallType(null);
    setCallId(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
    setInCall(false);
  }


  // ---- Screen Share ----
  async function startScreenShare() {
    if (!localStream) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
 
      // Replace video track in all peers
      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });
 
      // Stop screen share when user ends it
      screenTrack.onended = stopScreenShare;
 
      // Replace local preview video (manipulate tracks)
      try {
        localStream.getVideoTracks().forEach((t) => localStream.removeTrack(t));
      } catch (err) {
        // in some browsers removeTrack might not be allowed on MediaStream - fallback to replacing tracks via senders only
      }
      try {
        localStream.addTrack(screenTrack);
      } catch (err) {
        // if localStream is immutable or operation fails, ignore (peer replacement already done)
      }
 
      setIsScreenSharing(true);
      setIsVideoEnabled(true);
    } catch (err) {
      console.error("Unable to start screen share:", err);
    }
  }
 
  async function stopScreenShare() {
    if (!localStream) return;
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      const camTrack = camStream.getVideoTracks()[0];
 
      // Replace back with camera track
      try {
        localStream.getVideoTracks().forEach((t) => localStream.removeTrack(t));
      } catch (err) {
        // ignore
      }
      try {
        localStream.addTrack(camTrack);
      } catch (err) {
        // ignore
      }
 
      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
      });
 
      setIsScreenSharing(false);
      setIsVideoEnabled(true);
    } catch (err) {
      console.error("Unable to stop screen share:", err);
    }
  }

  // ------------------------------------------------------------------
  // Exposed values and functions
  // ------------------------------------------------------------------
  return {
    callState: {
      callId,
      incoming,
      caller: incoming?.from || incoming?.inviterId,
      type: callType,
      active: inCall,
    },
    localStream,
    // convert map to array of streams (preserves order by map insertion)
    remoteStreams: Array.from(remoteStreamsMap.entries()).map(
      ([userId, stream]) => ({ userId, stream })
    ),
    startCall,
    acceptCall,
    rejectCall: () => {
      if (incoming) {
        if (incoming.isAddUser) {
          // cancel add-user invite
          socket.emit("call-invite-cancel", {
            userId: userId,
            callId: incoming.callId || callId,
          });
        } else {
          socket.emit("cancelCall", { to: incoming.from, from: userId });
        }
      }
      cleanup();
    },
    endCall,
    addUserToCall,
    cancelInviteFor,
    toggleMic() {
      const audio = localStream?.getAudioTracks()?.[0];
      if (audio) {
        audio.enabled = !audio.enabled;
        setIsMuted(!audio.enabled);
      }
    },
    toggleCam() {
      const video = localStream?.getVideoTracks()?.[0];
      if (video) {
        video.enabled = !video.enabled;
        setIsVideoEnabled(video.enabled);
      }
    },
    isScreenSharing,
    isMuted,
    isVideoEnabled,
    isMaximized,
    setIsMaximized,
    inCall,
    startScreenShare,
    stopScreenShare,
  };
}
