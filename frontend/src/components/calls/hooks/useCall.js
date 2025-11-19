import { useState, useEffect, useRef } from "react";
import socket from "./socket";
import { set } from "date-fns";

export function useCall(userId, currentUsername) {
  const [callType, setCallType] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const peerMap = useRef(new Map());
  const [inCall,setInCall] = useState(false);


  useEffect(() => {
    if (!userId) return;
    console.log("connecting socket from useCall...")
    if (!socket.connected) socket.connect();
    socket.emit("register", { userId });

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("iceCandidate", handleIceCandidate);
    socket.on("endCall", handleEndCall);
    socket.on("callCancelled", handleCallCancelled);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("iceCandidate", handleIceCandidate);
      socket.off("endCall", handleEndCall);
      socket.off("callCancelled", handleCallCancelled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId,socket]);

  function handleIncomingCall({ from,fromUsername, offer, callType }) {
    console.log("Inside handleIncomingCall")
    console.log("📥 Incoming call from", from);
    setIncoming({ from, fromUsername, offer, callType });
    console.log("incoming call data:",{ from,fromUsername,offer,callType});
    console.log("Incoming details set:", incoming);
  }

  async function handleCallAccepted({ answer, from }) {
    setInCall(true);
    const peer = peerMap.current.get(from);
    if (peer) {
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Error setting remote description on callAccepted:", err);
      }
    }
  }

  function handleIceCandidate({ from, candidate }) {
    const peer = peerMap.current.get(from);
    if (peer && candidate) {
      try {
        peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    }
  }

  // payload could be { from, username }
  function handleEndCall(payload = {}) {
    setInCall(false);
    const { from, username } = payload;
    const name = username || from || "Remote";
    // Notify user - replace with your toast if you have one
    try {
      // Use a toast in your app instead of alert if available
      // e.g., toast.info(`${name} ended the call`);
      // fallback:
      if (typeof window !== "undefined" && window && window.document) {
        // tiny non-blocking UI-friendly notification
        console.log(`📞 Call ended by ${name}`);
      }
    } catch (err) {
      /* ignore */
    }
    cleanup();
  }

  function handleCallCancelled() {
    setInCall(false);
    cleanup();
  }

  async function startCall(type, remoteUser) {
    setInCall(true);
    if (!remoteUser) return;
    setCallType(type);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      setLocalStream(stream);

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("iceCandidate", {
            to: remoteUser.id,
            from: userId,
            candidate: e.candidate,
          });
        }
      };

      peer.ontrack = (e) => {
        const incomingStream = e.streams[0];
        if (incomingStream) {
          setRemoteStream((prev) => prev || incomingStream);
        }
      };

      peerMap.current.set(remoteUser.id, peer);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("callUser", {
        from: userId,
        to: remoteUser.id,
        offer,
        callType: type,
        fromUsername: currentUsername, // optional: include caller name
      });
    } catch (err) {
      console.error("❌ Failed to start call:", err);
      cleanup();
    }
  }

  async function acceptCall() {
    if (!incoming) return;
    setInCall(true);
    setCallType(incoming.callType);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incoming.callType === "video",
      });
      setLocalStream(stream);

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("iceCandidate", {
            to: incoming.from,
            from: userId,
            candidate: e.candidate,
          });
        }
      };

      peer.ontrack = (e) => {
        const incomingStream = e.streams[0];
        if (incomingStream) {
          setRemoteStream((prev) => prev || incomingStream);
        }
      };

      peerMap.current.set(incoming.from, peer);

      await peer.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answerCall", { to: incoming.from, answer, from: userId, username: currentUsername });
      setIncoming(null);
    } catch (err) {
      console.error("❌ Failed to accept call:", err);
      cleanup();
    }
  }

  function rejectCall() {
    if (incoming) {
      socket.emit("cancelCall", { to: incoming.from, from: userId });
    }
    setIncoming(null);
    cleanup();
  }

  // remoteUser is expected to be { id, ... } - pass the remote participant when ending the call
  function endCall(remoteUser) {
    setInCall(false);
    if (!remoteUser) return;
    socket.emit("endCall", { from: userId, to: remoteUser.id, username: currentUsername });
    cleanup();
  }

  function cleanup() {
    if (localStream) {
      try {
        localStream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        console.warn("Error stopping local tracks:", err);
      }
      setLocalStream(null);
    }
    if (remoteStream) {
      try {
        remoteStream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        console.warn("Error stopping remote tracks:", err);
      }
      setRemoteStream(null);
    }

    peerMap.current.forEach((peer) => {
      try {
        peer.close();
      } catch (err) {
        /* ignore */
      }
    });
    peerMap.current.clear();

    setCallType(null);
    setIncoming(null);
    setIsScreenSharing(false);
    setIsMuted(false);
    setIsVideoEnabled(true);
  }

  function toggleMic() {
    const audioTrack = localStream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }

  function toggleCam() {
    const videoTrack = localStream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
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

  return {
    callState: {
      incoming,
      caller: incoming?.from,
      type: callType,
      active: !!localStream || !!remoteStream,
    },
    localStream,
    remoteStreams: remoteStream ? [remoteStream] : [],
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    isMuted,
    isVideoEnabled,
    isMaximized,
    setIsMaximized,
    inCall
  };
}
