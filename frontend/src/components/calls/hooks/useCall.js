import { useState, useEffect, useRef } from "react";
// must point at the same socket.js above
import socket from "./socket";

export function useCall(userId) {
  const [callType, setCallType] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [remoteUserId, setRemoteUserId] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const peerRef = useRef(null);
  const screenTrackRef = useRef(null);
  const hasCleanedUp = useRef(false);

  // ——— Socket.IO wiring ———
  useEffect(() => {
    if (!userId) return;
    if (!socket.connected) socket.connect();
    console.log("🔗 useCall: registering socket for user", userId);
    socket.emit("register", { userId });

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("iceCandidate", handleIceCandidate);
    socket.on("endCall",      handleEndCall);
    socket.on("callCancelled", handleCallCancelled);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("iceCandidate", handleIceCandidate);
      socket.off("endCall",      handleEndCall);
      socket.off("callCancelled", handleCallCancelled);
    };
  }, [userId]);

  function handleIncomingCall({ from, offer, callType }) {
    console.log("✔️ incomingCall received from", from, "type", callType);
    setIncoming({ from, offer, callType });
  }

  async function handleCallAccepted({ answer }) {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(answer);
    }
  }

  function handleIceCandidate({ candidate }) {
    const peer = peerRef.current;
    if (peer && peer.signalingState !== "closed" && candidate) {
      peer.addIceCandidate(candidate).catch(console.warn);
    }
  }

  function handleEndCall({ from }) {
    alert(`Call ended by user: ${from}`);
    cleanup();
  }

  function handleCallCancelled({ from }) {
    alert(`Call cancelled by user: ${from}`);
    setIncoming(null);
    cleanup();
  }

  // ——— WebRTC + media logic ———
  function createPeerConnection(remoteId) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    const remote = new MediaStream();
    setRemoteStream(remote);

    peer.ontrack = (e) => remote.addTrack(e.track);
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("iceCandidate", {
          to: remoteId,
          candidate: e.candidate,
        });
      }
    };
    peer.onconnectionstatechange = () => {
      if (
        ["disconnected", "failed", "closed"].includes(peer.connectionState)
      ) {
        cleanup();
      }
    };

    peerRef.current = peer;
    return peer;
  }

  async function startCall(type, remoteUser) {
    if (!remoteUser) {
      console.warn("startCall: no remote user selected");
      return;
    }
    hasCleanedUp.current = false;
    setRemoteUserId(remoteUser.id);
    setCallType(type);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      setLocalStream(stream);

      const peer = createPeerConnection(remoteUser.id);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("callUser", {
        from: userId,
        to: remoteUser.id,
        offer,
        callType: type,
      });
    } catch (err) {
      console.error("Error accessing media devices:", err);
      cleanup();
    }
  }

  async function acceptCall() {
    if (!incoming) return;
    hasCleanedUp.current = false;
    setRemoteUserId(incoming.from);
    setCallType(incoming.callType);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incoming.callType === "video",
      });
      setLocalStream(stream);

      const peer = createPeerConnection(incoming.from);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));

      await peer.setRemoteDescription(incoming.offer);
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
    if (incoming) {
      socket.emit("cancelCall", {
        to: incoming.from,
        from: userId,
      });
    }
    setIncoming(null);
    cleanup();
  }

  function endCall() {
    if (remoteUserId) {
      socket.emit("endCall", { to: remoteUserId, from: userId });
    }
    // immediately close our overlay
    cleanup();
  }

  function stopTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
  }

  function cleanup(force = false) {
    if (hasCleanedUp.current && !force) return;
    const delay = remoteStream?.getTracks().length ? 0 : 500;

    setTimeout(() => {
      if (hasCleanedUp.current && !force) return;
      hasCleanedUp.current = true;
      stopTracks(localStream);
      stopTracks(remoteStream);
      if (screenTrackRef.current) screenTrackRef.current.stop();

      setLocalStream(null);
      setRemoteStream(null);
      setCallType(null);
      setRemoteUserId(null);
      setIncoming(null);
      setIsScreenSharing(false);

      if (peerRef.current) {
        peerRef.current.onicecandidate = null;
        peerRef.current.ontrack = null;
        peerRef.current.onconnectionstatechange = null;
        peerRef.current.close();
        peerRef.current = null;
      }
    }, delay);

    setTimeout(() => {
      if (!hasCleanedUp.current) cleanup(true);
    }, 3000);
  }

  function toggleMic() {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setIsMuted(!t.enabled);
    });
  }

  function toggleCam() {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoEnabled(track.enabled);
    }
  }

  async function startScreenShare() {
    if (!peerRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      screenTrackRef.current = screenTrack;

      const sender = peerRef.current
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);

      screenTrack.onended = () => stopScreenShare();
      setIsScreenSharing(true);
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  }

  function stopScreenShare() {
    if (!peerRef.current || !screenTrackRef.current) return;
    const sender = peerRef.current
      .getSenders()
      .find((s) => s.track?.kind === "video");
    const localVideo = localStream?.getVideoTracks()[0];
    if (sender && localVideo) sender.replaceTrack(localVideo);

    screenTrackRef.current.stop();
    screenTrackRef.current = null;
    setIsScreenSharing(false);
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
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
    isMuted,
    isVideoEnabled,
  };
}

