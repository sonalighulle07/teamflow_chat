import { useState, useRef, useEffect } from "react";
import socket from "./socket";

export function useMeeting(userId, roomCode) {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState(new Map()); // Map<remoteId, MediaStream>
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerMap = useRef(new Map());
  const hasJoinedRef = useRef(false);

  // Join the meeting
  async function joinMeeting() {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    if (!socket.connected) socket.connect();
    socket.emit("register", { userId });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(stream);
    console.log("🟢 Local stream ready:", stream);

    // Existing users
    socket.off("existingUsers").on("existingUsers", ({ users }) => {
      console.log("🌍 Existing users in room:", users);
      users.forEach((remoteId) => {
        if (!peerMap.current.has(remoteId)) {
          const peer = createPeer(remoteId, stream, true);
          peerMap.current.set(remoteId, peer);
        }
      });
    });

    // New user joined
    socket.off("userJoined").on("userJoined", ({ userId: remoteId }) => {
      console.log("👋 New user joined:", remoteId);
      if (!peerMap.current.has(remoteId)) {
        const peer = createPeer(remoteId, stream, true);
        peerMap.current.set(remoteId, peer);
      }
    });

    // Receive offer
    socket.off("offer").on("offer", async ({ from, offer }) => {
      console.log("📩 Offer received from", from);
      const peer = createPeer(from, stream, false);
      peerMap.current.set(from, peer);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("answer", { to: from, answer });
    });

    // Receive answer
    socket.off("answer").on("answer", async ({ from, answer }) => {
      const peer = peerMap.current.get(from);
      if (peer) await peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ICE candidates
    socket.off("iceCandidate").on("iceCandidate", ({ from, candidate }) => {
      const peer = peerMap.current.get(from);
      if (peer && candidate && peer.remoteDescription) {
        peer.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("📡 Adding ICE candidate from", from, candidate);
      }
    });

    // User left
    socket.off("userLeft").on("userLeft", ({ userId: remoteId }) => {
      console.log("👋 User left:", remoteId);
      const peer = peerMap.current.get(remoteId);
      if (peer) peer.close();
      peerMap.current.delete(remoteId);
      setPeers((prev) => {
        const updated = new Map(prev);
        updated.delete(remoteId);
        return updated;
      });
    });

    socket.emit("joinRoom", { userId, roomCode });
    console.log("🚪 Joined room:", roomCode);
  }

  // Create peer connection
  function createPeer(remoteId, stream, initiator) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add local tracks
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    // Handle ICE candidates
    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit("iceCandidate", { to: remoteId, candidate: e.candidate });
    };

    // Handle remote stream
    peer.ontrack = (e) => {
      const remoteStream = e.streams[0];
      if (remoteStream) {
        setPeers((prev) => {
          const updated = new Map(prev);
          updated.set(remoteId, remoteStream);
          return updated;
        });
      }
    };

    // Create offer if initiator
    if (initiator) {
      peer.createOffer().then((offer) => {
        peer.setLocalDescription(offer);
        socket.emit("offer", { to: remoteId, offer });
      });
    }

    return peer;
  }

  // Leave meeting
  function leaveMeeting() {
    console.log("🚪 Leaving meeting");
    socket.emit("leaveRoom", { userId, roomCode });
    peerMap.current.forEach((peer) => peer.close());
    peerMap.current.clear();
    setPeers(new Map());
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    hasJoinedRef.current = false;
  }

  function toggleMic() {
    const track = localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }

  function toggleCam() {
    const track = localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoEnabled(track.enabled);
    }
  }

  async function startScreenShare() {
    if (!localStream) return;
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    peerMap.current.forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
    });

    // Update local stream for self-view
    setLocalStream(screenStream);
    screenTrack.onended = stopScreenShare;
    setIsScreenSharing(true);
  }

  async function stopScreenShare() {
    if (!localStream) return;

    const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    peerMap.current.forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track.kind === "video");
      if (sender) sender.replaceTrack(camStream.getVideoTracks()[0]);
    });

    setLocalStream(camStream);
    setIsScreenSharing(false);
  }

  return {
    peers,
    localStream,
    joinMeeting,
    leaveMeeting,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
  };
}
