import { useState, useRef } from "react";
import io from "socket.io-client";

export function useCall(userId) {
  const [callType, setCallType] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const peerRef = useRef(null);
  const socket = useRef(io("http://localhost:3000")).current;

  // Register
  socket.emit("register", { userId });

  function createPeerConnection(remoteUserId) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const remote = new MediaStream();
    setRemoteStream(remote);

    peer.ontrack = e => remote.addTrack(e.track);
    peer.onicecandidate = e => {
      if (e.candidate) socket.emit("iceCandidate", { to: remoteUserId, candidate: e.candidate });
    };
    peerRef.current = peer;
    return peer;
  }

  async function startCall(remoteUser, type) {
    setCallType(type);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
    setLocalStream(stream);

    const peer = createPeerConnection(remoteUser.id);
    stream.getTracks().forEach(t => peer.addTrack(t, stream));

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("callUser", { from: userId, to: remoteUser.id, offer, callType: type });
  }

  socket.on("incomingCall", ({ from, offer, callType }) => {
    setIncoming({ from, offer, callType });
  });

  async function acceptCall() {
    if (!incoming) return;
    setCallType(incoming.callType);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incoming.callType === "video" });
    setLocalStream(stream);

    const peer = createPeerConnection(incoming.from);
    stream.getTracks().forEach(t => peer.addTrack(t, stream));

    await peer.setRemoteDescription(new RTCSessionDescription(incoming.offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit("answerCall", { to: incoming.from, answer });
    setIncoming(null);
  }

  function rejectCall() {
    if (incoming) socket.emit("cancelCall", { to: incoming.from });
    setIncoming(null);
  }

  function endCall(remoteUserId) {
    socket.emit("endCall", { to: remoteUserId });
    cleanup();
  }

  function cleanup() {
    setCallType(null);
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (remoteStream) remoteStream.getTracks().forEach(t => t.stop());
    if (peerRef.current) peerRef.current.close();
    setLocalStream(null);
    setRemoteStream(null);
  }

  return {
    callType,
    localStream,
    remoteStream,
    incoming,
    isMaximized,
    setIsMaximized,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    cleanup
  };
}
