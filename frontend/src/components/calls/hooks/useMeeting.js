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

  // --- Helper: create black dummy video track ---
  const createDummyVideoStream = () => {
    const canvas = Object.assign(document.createElement("canvas"), { width: 640, height: 480 });
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.captureStream(10); // 10fps dummy
  };

  async function joinMeeting({ micEnabled = true, camEnabled = true } = {}) {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    if (!socket.connected) socket.connect();
    socket.emit("register", { userId });

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: camEnabled });
      stream.getAudioTracks().forEach((t) => (t.enabled = !!micEnabled));
      if (!camEnabled) {
        // replace video track with dummy
        const dummy = createDummyVideoStream();
        stream.getVideoTracks().forEach((t) => t.stop());
        stream.addTrack(dummy.getVideoTracks()[0]);
      }
    } catch {
      stream = createDummyVideoStream();
    }

    setLocalStream(stream);
    setIsMuted(!micEnabled);
    setIsVideoEnabled(camEnabled);

    // --- Peer setup ---
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

      const username = sessionStorage.getItem(`username_${remoteId}`) || remoteId;
      window.dispatchEvent(
        new CustomEvent("meeting-toast", { detail: { message: `${username} joined the meeting` } })
      );
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

      const username = sessionStorage.getItem(`username_${remoteId}`) || remoteId;
      window.dispatchEvent(
        new CustomEvent("meeting-toast", { detail: { message: `${username} left the meeting` } })
      );
    });

    socket.emit("joinRoom", { userId, roomCode });
  }

  function createPeer(remoteId, stream, initiator) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit("iceCandidate", { to: remoteId, candidate: e.candidate });
    };

    peer.ontrack = (e) => {
      const remoteStream = e.streams[0];
      if (remoteStream) setPeers((prev) => new Map(prev).set(remoteId, remoteStream));
    };

    if (initiator) (async () => {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("offer", { to: remoteId, offer });
    })();

    return peer;
  }

  function leaveMeeting() {
    if (!hasJoinedRef.current) return;
    hasJoinedRef.current = false;

    socket.emit("leaveRoom", { userId, roomCode });

    socket.off("existingUsers");
    socket.off("userJoined");
    socket.off("offer");
    socket.off("answer");
    socket.off("iceCandidate");
    socket.off("userLeft");

    peerMap.current.forEach((peer) => peer.close());
    peerMap.current.clear();
    setPeers(new Map());

    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    setLocalStream(null);

    try {
      sessionStorage.removeItem(`joined_${roomCode}_${userId}`);
      const channel = new BroadcastChannel("meeting-session");
      channel.postMessage(`left_${roomCode}_${userId}`);
      channel.close();
    } catch {}
  }

  // --- Toggle Camera: stop real track to turn off LED ---
  const toggleCam = async () => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();

    if (isVideoEnabled) {
      // Stop physical camera track → LED off
      videoTracks.forEach((t) => t.stop());

      // Replace with dummy black track for local preview
      const dummy = createDummyVideoStream();
      setLocalStream((prev) => {
        const newStream = new MediaStream([...prev.getAudioTracks(), dummy.getVideoTracks()[0]]);
        // Update peers
        peerMap.current.forEach((peer) => {
          const sender = peer.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(dummy.getVideoTracks()[0]);
        });
        return newStream;
      });

      setIsVideoEnabled(false);
      sessionStorage.setItem("cameraOn", "false");
    } else {
      // Turn on camera
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = camStream.getVideoTracks()[0];

        setLocalStream((prev) => {
          const newStream = new MediaStream([camTrack, ...prev.getAudioTracks()]);
          peerMap.current.forEach((peer) => {
            const sender = peer.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(camTrack);
            else peer.addTrack(camTrack, newStream);
          });
          return newStream;
        });

        setIsVideoEnabled(true);
        sessionStorage.setItem("cameraOn", "true");
      } catch (err) {
        console.error("Unable to enable camera:", err);
      }
    }
  };

  // --- Toggle Mic ---
  const toggleMic = () => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
    sessionStorage.setItem("micOn", track.enabled ? "true" : "false");
  };

  // --- Screen Share ---
  const startScreenShare = async () => {
    if (!localStream) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });
      screenTrack.onended = stopScreenShare;

      localStream.getVideoTracks().forEach((t) => localStream.removeTrack(t));
      localStream.addTrack(screenTrack);
      setLocalStream(localStream);
      setIsScreenSharing(true);
      setIsVideoEnabled(true);
    } catch (err) {
      console.error("Unable to start screen share:", err);
    }
  };

  const stopScreenShare = async () => {
    if (!localStream) return;
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];
      localStream.getVideoTracks().forEach((t) => localStream.removeTrack(t));
      localStream.addTrack(camTrack);
      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
      });
      setLocalStream(localStream);
      setIsScreenSharing(false);
      setIsVideoEnabled(true);
    } catch (err) {
      console.error("Unable to stop screen share:", err);
    }
  };

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
