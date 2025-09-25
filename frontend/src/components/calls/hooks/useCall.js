import { useState, useEffect, useRef } from "react";
import socket from "./socket";

export function useCall(userId) {
  const [callType, setCallType] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const peerMap = useRef(new Map());
  const screenTrackRef = useRef(null);
  const hasCleanedUp = useRef(false);

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

  function handleIncomingCall({ from, offer, callType }) {
    setIncoming({ from, offer, callType });
  }

  async function handleCallAccepted({ answer }) {
    const peer = peerMap.current.get(incoming?.from);
    if (peer) await peer.setRemoteDescription(answer);
  }

  function handleIceCandidate({ from, candidate }) {
    const peer = peerMap.current.get(from);
    if (peer && candidate) peer.addIceCandidate(candidate);
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

  function createPeer(remoteUserId) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    localStream?.getTracks().forEach((track) => peer.addTrack(track, localStream));

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("iceCandidate", {
          to: remoteUserId,
          from: userId,
          candidate: e.candidate,
        });
      }
    };

    peer.ontrack = (e) => {
  const stream = e.streams[0];
  console.log("📡 Received remote stream:", stream.id);
  setRemoteStreams((prev) => {
    const exists = prev.some((s) => s.id === stream.id);
    return exists ? prev : [...prev, stream];
  });
};


    peer.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(peer.connectionState)) {
        peerMap.current.delete(remoteUserId);
        setRemoteStreams((prev) =>
          prev.filter((s) => s.id !== peer.remoteStream?.id)
        );
      }
    };

    return peer;
  }

  async function startCall(type, remoteUser) {
    if (!remoteUser) return;
    hasCleanedUp.current = false;
    setCallType(type);

    try {
      const stream =
        localStream ||
        (await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        }));
      setLocalStream(stream);

      const peer = createPeer(remoteUser.id);
      peerMap.current.set(remoteUser.id, peer);

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
    setCallType(incoming.callType);

    try {
      const stream =
        localStream ||
        (await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: incoming.callType === "video",
        }));
      setLocalStream(stream);

      const peer = createPeer(incoming.from);
      peerMap.current.set(incoming.from, peer);

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
      socket.emit("cancelCall", { to: incoming.from, from: userId });
    }
    setIncoming(null);
    cleanup();
  }

  function endCall() {
    socket.emit("endCall", { from: userId });
    cleanup();
  }

  function joinMeetingRoom(meetingCode) {
    if (!userId || !meetingCode) return;
    socket.emit("joinMeeting", { code: meetingCode, userId });

    socket.on("userJoined", async ({ userId: otherUserId }) => {
      if (otherUserId === userId || peerMap.current.has(otherUserId)) return;

      const peer = createPeer(otherUserId);
      peerMap.current.set(otherUserId, peer);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("offer", { to: otherUserId, from: userId, offer });
    });

    socket.on("offer", async ({ from, offer }) => {
      if (peerMap.current.has(from)) return;

      const peer = createPeer(from);
      peerMap.current.set(from, peer);

      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", { to: from, from: userId, answer });
    });

    socket.on("answer", async ({ from, answer }) => {
      const peer = peerMap.current.get(from);
      if (peer) await peer.setRemoteDescription(answer);
    });

    socket.on("iceCandidate", ({ from, candidate }) => {
      const peer = peerMap.current.get(from);
      if (peer && candidate) peer.addIceCandidate(candidate);
    });

    socket.on("userJoined", ({ userId }) => {
  console.log("👥 User joined:", userId);
});



  }

  function stopTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
  }

  function cleanup(force = false) {
    if (hasCleanedUp.current && !force) return;

    setTimeout(() => {
      hasCleanedUp.current = true;
      stopTracks(localStream);
      remoteStreams.forEach(stopTracks);
      if (screenTrackRef.current) screenTrackRef.current.stop();

      setLocalStream(null);
      setRemoteStreams([]);
      setCallType(null);
      setIncoming(null);
      setIsScreenSharing(false);

      peerMap.current.forEach((peer) => peer.close());
      peerMap.current.clear();
    }, 500);
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
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      screenTrackRef.current = screenTrack;

      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = stopScreenShare;
      setIsScreenSharing(true);
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  }

 function stopScreenShare() {
    const localVideo = localStream?.getVideoTracks()[0];
    peerMap.current.forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track?.kind === "video");
      if (sender && localVideo) sender.replaceTrack(localVideo);
    });

    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    setIsScreenSharing(false);
  }

  return {
    callState: {
      incoming,
      caller: incoming?.from,
      type: callType,
      active: !!localStream || remoteStreams.length > 0,
    },
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    cleanup,
    localStream,
    remoteStreams,
    isMaximized,
    setIsMaximized,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
    isMuted,
    isVideoEnabled,
    joinMeetingRoom,
  };
}

