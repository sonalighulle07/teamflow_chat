import { useState, useEffect, useRef } from "react";
import socket from "./socket";

export function useCall(userId) {
  const [callType, setCallType] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const peerMap = useRef(new Map());

  // Get current username from sessionStorage
  const getUsername = () => {
    const userStr = sessionStorage.getItem("chatUser");
    const user = userStr ? JSON.parse(userStr) : null;
    return user?.username || "Unknown User";
  };

  useEffect(() => {
    if (!userId) return;
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
  }, [userId]);

  function handleIncomingCall({ from, fromUsername, offer, callType }) {
    console.log("📥 Incoming call from", fromUsername || from);
    setIncoming({ from, fromUsername, offer, callType });
  }

  async function handleCallAccepted({ answer, from, fromUsername }) {
    const peer = peerMap.current.get(from);
    if (peer) await peer.setRemoteDescription(new RTCSessionDescription(answer));
    console.log(`✅ Call accepted by ${fromUsername || from}`);
  }

  function handleIceCandidate({ from, candidate }) {
    const peer = peerMap.current.get(from);
    if (peer && candidate) peer.addIceCandidate(new RTCIceCandidate(candidate));
  }

  function handleEndCall() {
    cleanup();
  }

  function handleCallCancelled() {
    cleanup();
  }

  async function startCall(type, remoteUser) {
    if (!remoteUser) return;
    setCallType(type);
    const username = getUsername();

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
        if (incomingStream) setRemoteStream((prev) => prev || incomingStream);
      };

      peerMap.current.set(remoteUser.id, peer);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("callUser", {
        from: userId,
        fromUsername: username,
        to: remoteUser.id,
        offer,
        callType: type,
      });
    } catch (err) {
      console.error("❌ Failed to start call:", err);
      cleanup();
    }
  }

  async function acceptCall() {
    if (!incoming) return;
    setCallType(incoming.callType);
    const username = getUsername();

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
        if (incomingStream) setRemoteStream((prev) => prev || incomingStream);
      };

      peerMap.current.set(incoming.from, peer);

      await peer.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answerCall", {
        to: incoming.from,
        from: userId,
        fromUsername: username,
        answer,
      });

      setIncoming(null);
    } catch (err) {
      console.error("❌ Failed to accept call:", err);
      cleanup();
    }
  }

  function rejectCall() {
    if (incoming) {
      socket.emit("cancelCall", {
        to: incoming.from,
        from: userId,
        fromUsername: getUsername(),
      });
    }
    setIncoming(null);
    cleanup();
  }

  function endCall() {
    socket.emit("endCall", { from: userId, fromUsername: getUsername() });
    cleanup();
  }

  function cleanup() {
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    if (remoteStream) remoteStream.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    peerMap.current.forEach((peer) => peer.close());
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

  return {
    callState: {
      incoming,
      caller: incoming?.from,
      callerUsername: incoming?.fromUsername, // <-- always available for modal
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
    isMuted,
    isVideoEnabled,
    isMaximized,
    setIsMaximized,
  };
}
