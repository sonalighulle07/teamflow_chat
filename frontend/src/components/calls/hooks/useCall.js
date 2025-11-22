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

  // ------------------------------------------------------------------
  // Socket bindings
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return console.log("❌ No userId provided to useCall");

    const handleIncomingCall = (payload) => {
      // payload: { from, fromUsername, offer, callType, callId? }
      console.log("📥 incomingCall", payload);
      setIncoming(payload);
      if (payload.callId) {
        setCallId(payload.callId);
      }
    };

    const handleCallCreated = ({ callId: newCallId }) => {
      // server may notify caller of created callId
      console.log("🆔 call-created", newCallId);
      if (newCallId) setCallId(newCallId);
    };

    const handleCallAccepted = async ({ answer, from, callId: answerCallId }) => {
      console.log("📡 callAccepted from", from, "callId:", answerCallId);
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

    const handleIceCandidate = ({ from, candidate }) => {
      const peer = peerMap.current.get(String(from));
      if (!peer) {
        console.warn("ICE for unknown peer", from);
        return;
      }
      if (!candidate) return;
      try {
        peer.addIceCandidate(new RTCIceCandidate(candidate));
        // console.log("✅ added ICE candidate for", from);
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
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
    const handleInviteRinging = ({ userId: invitedUserId, username, inviterId, callId: incomingCallId }) => {
      // front-end UI will listen to "call-invite-ringing" to create tiles
      // set callId if missing (this client is participant of the call)
      if (incomingCallId && !callId) setCallId(incomingCallId);
      // no other action here — CallOverlay listens to socket events directly to create tiles
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("call-created", handleCallCreated);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("iceCandidate", handleIceCandidate);
    socket.on("endCall", handleEndCall);
    socket.on("callCancelled", handleCallCancelled);

    // invite related events (optional)
    socket.on("call-invite-ringing", handleInviteRinging);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("call-created", handleCallCreated);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("iceCandidate", handleIceCandidate);
      socket.off("endCall", handleEndCall);
      socket.off("callCancelled", handleCallCancelled);
      socket.off("call-invite-ringing", handleInviteRinging);
    };
  }, [userId, callId]);

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
      const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

      peer.ontrack = (e) => {
        console.log("📡 ontrack (caller) from", remoteUser.id, e.streams);
        if (e.streams && e.streams[0]) setRemoteStreamFor(remoteUser.id, e.streams[0]);
      };

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("iceCandidate", { to: remoteUser.id, from: userId, candidate: e.candidate });
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

      // Wait / rely on server to send 'call-created' or include callId in subsequent messages.
      // Caller might also receive 'callCreated' event — we handle that above.

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
        console.log("📡 ontrack (callee) from", incoming.from, e.streams);
        if (e.streams && e.streams[0]) setRemoteStreamFor(incoming.from, e.streams[0]);
      };

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("iceCandidate", { to: incoming.from, from: userId, candidate: e.candidate });
        }
      };

      stream.getTracks().forEach((t) => peer.addTrack(t, stream));

      peerMap.current.set(String(incoming.from), peer);

      // set remote (offer) then create answer
      await peer.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      // send answer back, include callId so server can attach user to call room
      socket.emit("answerCall", {
        to: incoming.from,
        answer,
        from: userId,
        fromUsername: currentUsername,
        callId: incoming.callId || callId,
      });

      // notify server we're joined (so other participants can update tiles)
      socket.emit("call-invite-joined", { userId, username: currentUsername, callId: incoming.callId || callId });

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
      console.warn("No callId set — cannot add user. Wait for server to create call.");
      return;
    }

    // emit to server to ring + notify call room
    socket.emit("call-add-user", {
      addedUserId,
      addedUsername,
      inviterId: userId,
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
        try { s?.getTracks()?.forEach((t) => t.stop()); } catch {}
      });
    } catch (e) {}

    peerMap.current.forEach((peer) => {
      try { peer.close(); } catch {}
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

  // ------------------------------------------------------------------
  // Exposed values and functions
  // ------------------------------------------------------------------
  return {
    callState: {
      callId,
      incoming,
      caller: incoming?.from,
      type: callType,
      active: inCall,
    },
    localStream,
    // convert map to array of streams (preserves order by map insertion)
    remoteStreams: Array.from(remoteStreamsMap.entries()).map(([userId, stream]) => ({ userId, stream })),
    startCall,
    acceptCall,
    rejectCall: () => {
      if (incoming) socket.emit("cancelCall", { to: incoming.from, from: userId });
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
  };
}
