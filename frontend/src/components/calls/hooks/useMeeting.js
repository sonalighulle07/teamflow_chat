// src/hooks/useMeeting.js
import { useState, useRef } from "react";
import socket from "./socket";

export function useMeeting(userId, roomCode) {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerMap = useRef(new Map());
  const hasJoinedRef = useRef(false);

  // ---- Join Meeting ----
  async function joinMeeting({ micEnabled = true, camEnabled = true } = {}) {
    // Prevent double-join in same window
    if (hasJoinedRef.current) return;
    // Prevent join if already joined in another tab/window
    const sessionKey = `joined_${roomCode}_${userId}`;
    if (sessionStorage.getItem(sessionKey)) {
      console.warn("Already marked as joined in sessionStorage — aborting join.");
      hasJoinedRef.current = true; // mark locally too
      return;
    }

    hasJoinedRef.current = true;

    // Mark as joined (so other prejoin windows won't open another meeting)
    try {
      sessionStorage.setItem(sessionKey, "true");
      // notify other tabs (optional)
      const channel = new BroadcastChannel("meeting-session");
      channel.postMessage(`joined_${roomCode}_${userId}`);
      channel.close();
    } catch (e) {
      console.warn("sessionStorage/BroadcastChannel may be unavailable:", e);
    }

    if (!socket.connected) socket.connect();
    socket.emit("register", { userId });

    let stream;
    try {
      // Always get full stream (we toggle enabled instead of adding/removing tracks)
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      // Respect prejoin choices by enabling/disabling tracks (do not remove)
      stream.getAudioTracks().forEach((t) => (t.enabled = !!micEnabled));
      stream.getVideoTracks().forEach((t) => (t.enabled = !!camEnabled));
    } catch (err) {
      console.error("🚫 Failed to get user media:", err);
      // fallback to empty MediaStream to avoid breaking peer creation logic
      stream = new MediaStream();
    }

    setLocalStream(stream);
    setIsMuted(!micEnabled);
    setIsVideoEnabled(!!camEnabled);

    // ---- Peer setup ----
    socket.off("existingUsers").on("existingUsers", ({ users }) => {
      users.forEach((remoteId) => {
        if (!peerMap.current.has(remoteId)) {
          const peer = createPeer(remoteId, stream, true);
          peerMap.current.set(remoteId, peer);
        }
      });
    });

    socket.off("userJoined").on("userJoined", ({ userId: remoteId }) => {
      if (!peerMap.current.has(remoteId)) {
        const peer = createPeer(remoteId, stream, false);
        peerMap.current.set(remoteId, peer);
      }
    });

    socket.off("offer").on("offer", async ({ from, offer }) => {
      let peer = peerMap.current.get(from);
      if (!peer) {
        peer = createPeer(from, stream, false);
        peerMap.current.set(from, peer);
      }
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("answer", { to: from, answer });
    });

    socket.off("answer").on("answer", async ({ from, answer }) => {
      const peer = peerMap.current.get(from);
      if (peer) await peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.off("iceCandidate").on("iceCandidate", async ({ from, candidate }) => {
      const peer = peerMap.current.get(from);
      if (peer && candidate) await peer.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.off("userLeft").on("userLeft", ({ userId: remoteId }) => {
      const peer = peerMap.current.get(remoteId);
      if (peer) peer.close();
      peerMap.current.delete(remoteId);
      setPeers((prev) => {
        const updated = new Map(prev);
        updated.delete(remoteId);
        return updated;
      });
    });

    // finally join room on server
    socket.emit("joinRoom", { userId, roomCode });
  }

  function createPeer(remoteId, stream, initiator) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    // Attach current tracks to the RTCPeerConnection
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit("iceCandidate", { to: remoteId, candidate: e.candidate });
    };

    peer.ontrack = (e) => {
      const remoteStream = e.streams[0];
      if (remoteStream) {
        setPeers((prev) => new Map(prev).set(remoteId, remoteStream));
      }
    };

    if (initiator) (async () => {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("offer", { to: remoteId, offer });
    })();

    return peer;
  }

  // ---- Leave Meeting ----
  function leaveMeeting() {
    if (!hasJoinedRef.current) return;
    hasJoinedRef.current = false;

    socket.emit("leaveRoom", { userId, roomCode });

    // Unbind handlers
    socket.off("existingUsers");
    socket.off("userJoined");
    socket.off("offer");
    socket.off("answer");
    socket.off("iceCandidate");
    socket.off("userLeft");

    // Close peers
    peerMap.current.forEach((peer) => peer.close());
    peerMap.current.clear();
    setPeers(new Map());

    // Stop local tracks
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    setLocalStream(null);

    // remove session key and broadcast leaving
    try {
      sessionStorage.removeItem(`joined_${roomCode}_${userId}`);
      const channel = new BroadcastChannel("meeting-session");
      channel.postMessage(`left_${roomCode}_${userId}`);
      channel.close();
    } catch (e) {
      console.warn("Could not remove session key or broadcast:", e);
    }
  }

  // ---- Send Toast to Peers ----
  function sendToastToPeers(msg) {
    if (!socket.connected) return;
    socket.emit("sendToast", { roomCode, message: msg });
  }

  // ---- Toggle Camera ----
  const toggleCam = async () => {
    if (!localStream) return;

    const videoTracks = localStream.getVideoTracks();
    // If there is no video track, request one (first-time)
    if (videoTracks.length === 0) {
      try {
        const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = newVideoStream.getVideoTracks()[0];
        localStream.addTrack(newTrack);
        // Replace for peers or add
        peerMap.current.forEach((peer) => {
          const sender = peer.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(newTrack);
          else peer.addTrack(newTrack, localStream);
        });
        setIsVideoEnabled(true);
        // persist state
        sessionStorage.setItem("cameraOn", "true");
      } catch (err) {
        console.error("Unable to access camera:", err);
      }
      return;
    }

    // Toggle enabled flag (keeps track and hardware state consistent)
    const track = videoTracks[0];
    track.enabled = !track.enabled;
    setIsVideoEnabled(track.enabled);
    // persist the user's preference
    sessionStorage.setItem("cameraOn", track.enabled ? "true" : "false");
  };

  // ---- Toggle Mic ----
  const toggleMic = async () => {
    if (!localStream) return;

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      try {
        const newAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = newAudioStream.getAudioTracks()[0];
        localStream.addTrack(newTrack);
        peerMap.current.forEach((peer) => {
          const sender = peer.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) sender.replaceTrack(newTrack);
          else peer.addTrack(newTrack, localStream);
        });
        setIsMuted(false);
        sessionStorage.setItem("micOn", "true");
      } catch (err) {
        console.error("Unable to access mic:", err);
      }
      return;
    }

    const track = audioTracks[0];
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
    sessionStorage.setItem("micOn", track.enabled ? "true" : "false");
  };

  // ---- Screen Share ----
  async function startScreenShare() {
    if (!localStream) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });
      screenTrack.onended = stopScreenShare;
      setIsScreenSharing(true);
    } catch (err) {
      console.error("Unable to start screen share:", err);
    }
  }

  async function stopScreenShare() {
    if (!localStream) return;
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];

      // Remove any existing video tracks then add the new camera track
      localStream.getVideoTracks().forEach((t) => localStream.removeTrack(t));
      localStream.addTrack(camTrack);

      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
      });

      setIsScreenSharing(false);
    } catch (err) {
      console.error("Unable to stop screen share:", err);
    }
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
    sendToastToPeers,
  };
}
