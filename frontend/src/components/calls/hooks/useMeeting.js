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

  async function joinMeeting() {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    if (!socket.connected) socket.connect();
    socket.emit("register", { userId });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(stream);
    console.log("🟢 Local stream ready:", stream);

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
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.off("iceCandidate").on("iceCandidate", async ({ from, candidate }) => {
      const peer = peerMap.current.get(from);
      if (peer && candidate) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
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

    socket.emit("joinRoom", { userId, roomCode });
  }

  function createPeer(remoteId, stream, initiator) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    // Attach current tracks
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("iceCandidate", { to: remoteId, candidate: e.candidate });
      }
    };

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

    if (initiator) {
      (async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("offer", { to: remoteId, offer });
      })();
    }

    return peer;
  }

  function leaveMeeting() {
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

  function createBlackTrack({ width = 640, height = 480 } = {}) {
  const canvas = Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  const stream = canvas.captureStream(1); // 1 fps
  return stream.getVideoTracks()[0];
}



async function toggleMic() {
  if (!localStream) return;

  const audioTrack = localStream.getAudioTracks()[0];

  if (audioTrack) {
    // Mic is ON → turn it OFF
    audioTrack.stop();
    localStream.removeTrack(audioTrack);
    setIsMuted(true);

    peerMap.current.forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) sender.replaceTrack(null);
    });
  } else {
    // Mic is OFF → turn it ON
    const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const newTrack = newStream.getAudioTracks()[0];

    localStream.addTrack(newTrack);
    setIsMuted(false);

    peerMap.current.forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) sender.replaceTrack(newTrack);
      else peer.addTrack(newTrack, localStream);
    });
  }
}

async function toggleCam() {
  if (!localStream) return;

  const videoTracks = localStream.getVideoTracks();
  const isCameraOn = videoTracks.length > 0 && isVideoEnabled;

  if (isCameraOn) {
    // 🔥 Stop and remove all video tracks
    videoTracks.forEach((track) => {
      track.stop(); // releases camera hardware
      localStream.removeTrack(track);
    });

    setIsVideoEnabled(false);

    // 🕶️ Create and use black stream
    const blackTrack = createBlackTrack();
    const blackStream = new MediaStream([blackTrack]);
    setLocalStream(blackStream);

    // 🔄 Update peers with black track
    peerMap.current.forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(blackTrack);
      else peer.addTrack(blackTrack, blackStream);
    });

    console.log("📷 Camera OFF — black stream sent, light should be OFF");
  } else {
    // 🎥 Get fresh camera stream
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const newTrack = newStream.getVideoTracks()[0];

      setLocalStream(newStream);
      setIsVideoEnabled(true);

      // 🔄 Update peers with new track
      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(newTrack);
        else peer.addTrack(newTrack, newStream);
      });

      console.log("📷 Camera ON — live stream restored");
    } catch (err) {
      console.error("🚫 Failed to access camera:", err);
    }
  }
}

  async function startScreenShare() {
    if (!localStream) return;
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    peerMap.current.forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
    });

    screenTrack.onended = stopScreenShare;
    setIsScreenSharing(true);
  }

  async function stopScreenShare() {
    const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const camTrack = camStream.getVideoTracks()[0];

    peerMap.current.forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(camTrack);
    });

    // ensure track is added back to localStream
    localStream.addTrack(camTrack);
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
