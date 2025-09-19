import { useState, useRef, useEffect } from "react";
import socket from "./socket";

export function useCall(userId) {
  const [callType, setCallType] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteUserId, setRemoteUserId] = useState(null);

  const peerRef = useRef(null);
  const callEndedByMe = useRef(false);
  const hasCleanedUp = useRef(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("register", { userId });

    const handleIncomingCall = ({ from, offer, callType }) => {
      setIncoming({ from, offer, callType });
    };

    const handleCallAccepted = async ({ answer }) => {
      if (peerRef.current) {
        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.warn("Failed to set remote description:", err);
        }
      }
    };

    const handleIceCandidate = ({ candidate }) => {
      const peer = peerRef.current;
      if (!peer || peer.signalingState === "closed") return;
      if (candidate) peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
    };

    const handleEndCall = ({ from }) => {
      const isRemoteEnd = from !== userId;
      if (isRemoteEnd) alert(`Call ended by user: ${from}`);
      cleanup();
    };

    const handleCallCancelled = ({ from }) => {
      alert(`Call cancelled by user: ${from}`);
      setIncoming(null);
      cleanup();
    };

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

  function createPeerConnection(remoteId) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const remote = new MediaStream();
    setRemoteStream(remote);

    peer.ontrack = (e) => remote.addTrack(e.track);
    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit("iceCandidate", { to: remoteId, candidate: e.candidate });
    };

    peer.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(peer.connectionState)) cleanup();
    };

    peerRef.current = peer;
    return peer;
  }

  async function startCall(type, remoteUser) {
    hasCleanedUp.current = false;
    callEndedByMe.current = false;
    setRemoteUserId(remoteUser.id);
    setCallType(type);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      setLocalStream(stream);

      const peer = createPeerConnection(remoteUser.id);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("callUser", { from: userId, to: remoteUser.id, offer, callType: type });
    } catch (err) {
      console.error("Error accessing media devices:", err);
      cleanup();
    }
  }

  async function acceptCall() {
    if (!incoming) return;
    hasCleanedUp.current = false;
    callEndedByMe.current = false;
    setRemoteUserId(incoming.from);
    setCallType(incoming.callType);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incoming.callType === "video" });
      setLocalStream(stream);

      const peer = createPeerConnection(incoming.from);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));

      await peer.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answerCall", { to: incoming.from, answer });
      setIncoming(null);
    } catch (err) {
      console.error("Error accepting call:", err);
      cleanup();
    }
  }

  function rejectCall() {
    if (incoming) socket.emit("cancelCall", { to: incoming.from, from: userId });
    setIncoming(null);
    cleanup();
  }

  function endCall() {
    callEndedByMe.current = true;
    if (remoteUserId) socket.emit("endCall", { to: remoteUserId, from: userId });
    cleanup();
  }

  function stopTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
  }

  function cleanup() {
    if (hasCleanedUp.current) return;
    hasCleanedUp.current = true;
    callEndedByMe.current = false;

    stopTracks(localStream);
    stopTracks(remoteStream);

    setLocalStream(null);
    setRemoteStream(null);
    setCallType(null);
    setRemoteUserId(null);
    setIncoming(null);

    if (peerRef.current) {
      peerRef.current.onicecandidate = null;
      peerRef.current.ontrack = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }
  }

  return {
    callState: {
      incoming,
      caller: incoming?.from,
      type: callType,
      active: !!remoteStream || !!localStream,
    },
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    cleanup,
    localStream,
    remoteStream,
    isMaximized,
    setIsMaximized,
  };
}
