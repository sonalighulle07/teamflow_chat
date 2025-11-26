// useCall.js
import { useState, useEffect, useRef } from "react";
import socket from "./socket";

/**
 * Key design decisions:
 * - remoteStreamsMap (Map userId -> MediaStream) is the single source of truth
 * - We NEVER add a remoteStreams entry with null/undefined stream
 * - addUserToCall only notifies server (no local remote entry creation)
 * - Peers are created when offers/offers are exchanged; stream is added when peer.ontrack fires
 */

export function useCall(userId, currentUsername) {

  console.log("🟢 useCall mounted for user:", userId);

  const [callType, setCallType] = useState(null);
  const [callId, setCallId] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const peerMap = useRef(new Map()); // userId -> RTCPeerConnection
  const [inCall, setInCall] = useState(false);

  // remoteStreamsMap holds only real streams (no placeholders)
  const [remoteStreamsMap, setRemoteStreamsMap] = useState(new Map()); // userId -> MediaStream

  // helpers: convert map to array
  const remoteStreams = Array.from(remoteStreamsMap.entries()).map(([userId, stream]) => ({ userId, stream }));

  // ---------------------------------------------------------------------------
  // Helpers to manage remoteStreamsMap reactively (only set when real stream)
  // ---------------------------------------------------------------------------
  const setRemoteStreamFor = (remoteUserId, stream) => {
    if (!stream) return; // defensive: ignore falsy streams
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

  // close peer connection and remove stream
  const closePeerFor = (peerUserId) => {
    try {
      const p = peerMap.current.get(String(peerUserId));
      if (p) {
        try {
          p.ontrack = null;
          p.onicecandidate = null;
          p.close();
        } catch (e) {}
      }
      peerMap.current.delete(String(peerUserId));
    } catch (e) {
      console.warn("closePeerFor error", e);
    }
    removeRemoteStreamFor(peerUserId);
  };

  // Ensure local stream exists (create if needed)
  const ensureLocalStream = async (wantVideo = false) => {
    if (localStream) {
      // optionally attempt to add video track to existing stream if requested
      if (wantVideo && (!localStream.getVideoTracks() || localStream.getVideoTracks().length === 0)) {
        try {
          const v = await navigator.mediaDevices.getUserMedia({ video: true });
          v.getVideoTracks().forEach((t) => localStream.addTrack(t));
        } catch (e) {
          console.warn("ensureLocalStream could not add video", e);
        }
      }
      return localStream;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !!wantVideo });
    setLocalStream(stream);
    return stream;
  };

  // ------------------------------------------------------------------
  // Socket bindings
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return console.log("❌ No userId provided to useCall");

    // Normalize incoming payloads and set incoming state
    const handleIncomingCall = (payload) => {
    // payload could be either normal 1:1 or add-user invite
      const normalized = {
        ...payload,
        isAddUser: payload.isAddUser === true,
        inviterId: payload.inviterId || payload.from,
        inviterUsername: payload.inviterUsername || payload.fromUsername,
        invitedType: payload.type || payload.callType,
      };

      console.log("📥 incomingCall normalized:", normalized);
      setIncoming(normalized);
      if (normalized.callId) setCallId(normalized.callId);
    };

    const handleCallCreated = ({ callId: newCallId }) => {
      if (newCallId) setCallId(newCallId);
    };

    // legacy 1:1 'callAccepted' (server relays callee answer)
    const handleCallAccepted = async ({ answer, from, callId: answerCallId }) => {
      if (answerCallId) setCallId(answerCallId);
      const peer = peerMap.current.get(String(from));
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        setInCall(true);
      } catch (e) {
        console.error("handleCallAccepted error", e);
      }
    };

    // generic relayed answer
    const handleAnswer = async ({ answer, from, callId: answerCallId }) => {
      if (answerCallId) setCallId(answerCallId);
      const peer = peerMap.current.get(String(from));
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        setInCall(true);
      } catch (e) {
        console.error("handleAnswer error", e);
      }
    };

    // generic relayed offer (we are receiving offer => create answer)
    const handleOffer = async ({ offer, from, callId: offerCallId, fromUsername }) => {
      try {
        // ensure we have media (try video true to allow remote video)
        await ensureLocalStream(true);

        // close any previous peer for this user
        closePeerFor(from);

        const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

        peer.ontrack = (e) => {
          // ONLY set remote stream when ontrack fires with actual stream (no placeholder)
          if (e.streams && e.streams[0]) {
            setRemoteStreamFor(from, e.streams[0]);
          }
        };

        peer.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("iceCandidate", { to: from, from: userId, candidate: e.candidate });
          }
        };

        // add local tracks (if available)
        if (localStream) {
          try {
            localStream.getTracks().forEach((t) => peer.addTrack(t, localStream));
          } catch (e) {
            console.warn("handleOffer addTrack error", e);
          }
        }

        peerMap.current.set(String(from), peer);

        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit("answer", { to: from, answer, from: userId, fromUsername: currentUsername, callId: offerCallId });
      } catch (err) {
        console.error("handleOffer error:", err);
      }
    };

    // ICE candidate handling
    const handleIceCandidate = ({ from, candidate }) => {
      const peer = peerMap.current.get(String(from));
      if (!peer) return;
      try {
        if (!candidate) return;
        peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
    };

    // When an existing participant is asked to create an offer for a newly-joined user
    const handleParticipantJoined = async ({ newUser, callId: pCallId }) => {

      if (!newUser || !newUser.userId) return;
      const newUserId = String(newUser.userId);

      try {
        // ensure we have local stream (video allowed)
        await ensureLocalStream(true);

        // close existing peer for newUser if any (avoid placeholders)
        closePeerFor(newUserId);

        const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

        peer.ontrack = (e) => {
          if (e.streams && e.streams[0]) {
            setRemoteStreamFor(newUserId, e.streams[0]);
          }
        };

        peer.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("iceCandidate", { to: newUserId, from: userId, candidate: e.candidate });
          }
        };

        // add local tracks
        if (localStream) {
          localStream.getTracks().forEach((t) => peer.addTrack(t, localStream));
        }

        peerMap.current.set(String(newUserId), peer);

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit("offer", { to: newUserId, offer, from: userId, fromUsername: currentUsername, callId: pCallId });

        window.dispatchEvent(
        new CustomEvent("user-joined-toast", { detail: { message: `${newUser.username === currentUsername ? "You" : newUser.username} Joined the call` } })
    );
      } catch (e) {
        console.error("handleParticipantJoined error", e);
      }
    };

    // When someone leaves the call room
    const handleUserLeftCall = ({ userId: leftUserId, username:leftUsername } = {}) => {
      closePeerFor(leftUserId);
      window.dispatchEvent(
      new CustomEvent("user-left-toast", { detail: { message: `${leftUsername === currentUsername ? "You" : leftUsername} left the call` } })
    );
    };

    const handleEndCall = () => {
      setCallId(null);
      cleanup();
    };

    const handleCallCancelled = () => {
      cleanup();
    };

    // INVITE ringing for UI only — do NOT create placeholder remote streams here
    const handleInviteRinging = ({ callId: evCallId } = {}) => {
      if (evCallId && !callId) setCallId(evCallId);
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("call-created", handleCallCreated);
    socket.on("callAccepted", handleCallAccepted); // legacy
    socket.on("answer", handleAnswer);
    socket.on("offer", handleOffer);
    socket.on("iceCandidate", handleIceCandidate);
    socket.on("participant-joined", handleParticipantJoined);
    socket.on("user-left-call", handleUserLeftCall);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, callId, localStream, currentUsername]);

  // ------------------------------------------------------------------
  // START a call (caller)
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

      // create peer for the initial 1:1
      const peer = new RTCPeerConnection({ iceServers : [{ urls: "stun:stun.l.google.com:19302" }] });

      peer.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          setRemoteStreamFor(remoteUser.id, e.streams[0]);
        }
      };

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("iceCandidate", { to: remoteUser.id, from: userId, candidate: e.candidate });
        }
      };

      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      peerMap.current.set(String(remoteUser.id), peer);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("callUser", {
        from: userId,
        fromUsername: currentUsername,
        to: remoteUser.id,
        offer,
        callType: type,
      });

      // caller will receive call-created event and callee's incomingCall
    } catch (err) {
      console.error("startCall error:", err);
      cleanup();
    }
  }

  // ------------------------------------------------------------------
  // ACCEPT an incoming call
  // ------------------------------------------------------------------
  async function acceptCall() {
    if (!incoming) return console.warn("acceptCall: no incoming call");

    const isAddUser = incoming.isAddUser === true;

    if (isAddUser) {
      // join existing call room — do not create local remote placeholders
      try {
        setCallType(incoming.invitedType || incoming.type);
        setCallId(incoming.callId || callId);
        setInCall(true);

        await ensureLocalStream(incoming.invitedType === "video");

        socket.emit("call-invite-joined", {
          userId,
          username: currentUsername,
          callId: incoming.callId || callId,
        });

        setIncoming(null);
        return;
      } catch (err) {
        console.error("acceptCall (add-user) error:", err);
        cleanup();
        return;
      }
    }

    // Normal 1:1 offer/answer flow
    setCallType(incoming.callType);
    setCallId(incoming.callId || callId);
    setInCall(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incoming.callType === "video",
      });
      setLocalStream(stream);

      const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

      peer.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          setRemoteStreamFor(incoming.from, e.streams[0]);
        }
      };

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("iceCandidate", { to: incoming.from, from: userId, candidate: e.candidate });
        }
      };

      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      peerMap.current.set(String(incoming.from), peer);

      await peer.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", {
        to: incoming.from,
        answer,
        from: userId,
        fromUsername: currentUsername,
        callId: incoming.callId || callId,
      });

      // Now tell server we joined so other participants can create offers to us
      socket.emit("call-invite-joined", { userId, username: currentUsername, callId: incoming.callId || callId });

      setIncoming(null);
    } catch (err) {
      console.error("acceptCall error:", err);
      cleanup();
    }
  }

  // ------------------------------------------------------------------
  // Add user to call (inviter)
  // IMPORTANT: do NOT create any placeholder remote entry here.
  // Just notify server and let server trigger call-invite-ringing + participant-joined flows.
  // ------------------------------------------------------------------
  function addUserToCall(addedUserId, addedUsername) {
    if (!callId) {
      console.warn("No callId set — cannot add user. Wait for server to create call.");
      return;
    }

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
  // Cancel invite
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
      socket.emit("endCall", { callId, from: userId, fromUsername: currentUsername } );
    }
    setCallId(null);
    cleanup();
  }

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------
  function cleanup() {
    console.log("🧹 cleanup");
    try {
      localStream?.getTracks()?.forEach((t) => t.stop());
    } catch (e) {
      console.warn("cleanup localStream error", e);
    }

    try {
      remoteStreamsMap?.forEach((s) => {
        try {
          s?.getTracks()?.forEach((t) => t.stop());
        } catch (e) {}
      });
    } catch (e) {}

    peerMap.current.forEach((peer) => {
      try {
        peer.close();
      } catch (e) {}
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
  // Exposed API
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
    remoteStreams, // array form of remoteStreamsMap
    startCall,
    acceptCall,
    rejectCall: () => {
      if (incoming) {
        if (incoming.isAddUser) {
          socket.emit("call-invite-cancel", { userId: userId, callId: incoming.callId || callId });
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
    stopScreenShare
    
  };
}
