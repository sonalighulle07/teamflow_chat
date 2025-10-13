import { useState, useRef } from "react";
import socket from "./socket";
import { useSelector } from "react-redux";

export function useMeeting(userId, roomCode) {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  // const currentUser = useSelector((state) => state.user.currentUser);
  

  const peerMap = useRef(new Map());
  const hasJoinedRef = useRef(false);

  async function joinMeeting({ micEnabled = true, camEnabled = true } = {}) {
    if (hasJoinedRef.current) return;
    const sessionKey = `joined_${roomCode}_${userId}`;
    if (sessionStorage.getItem(sessionKey)) {
      hasJoinedRef.current = true;
      return;
    }
    hasJoinedRef.current = true;
    sessionStorage.setItem(sessionKey, "true");

    if (!socket.connected) socket.connect();
    socket.emit("register", { userId });

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getAudioTracks().forEach((t) => (t.enabled = !!micEnabled));
      stream.getVideoTracks().forEach((t) => (t.enabled = !!camEnabled));
    } catch (err) {
      console.error("Failed to get user media:", err);
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

    socket
      .off("userJoined")
      .on("userJoined", ({ userId: remoteId, username: remoteUsername }) => {
        if (!peerMap.current.has(remoteId)) {
          const peer = createPeer(remoteId, stream, false);
          peerMap.current.set(remoteId, peer);
        }

        window.dispatchEvent(
          new CustomEvent("meeting-toast", {
            detail: { message: `${remoteUsername} joined the meeting` },
          })
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
      if (peer)
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket
      .off("iceCandidate")
      .on("iceCandidate", async ({ from, candidate }) => {
        const peer = peerMap.current.get(from);
        if (peer && candidate)
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
      });

    socket
      .off("userLeft")
      .on("userLeft", ({ userId: remoteId, username: remoteUsername }) => {
        const peer = peerMap.current.get(remoteId);
        if (peer) peer.close();
        peerMap.current.delete(remoteId);
        setPeers((prev) => {
          const updated = new Map(prev);
          updated.delete(remoteId);
          return updated;
        });
        window.dispatchEvent(
          new CustomEvent("meeting-toast", {
            detail: { message: `${remoteUsername} left the meeting` },
          })
        );
      });
      let userStr = sessionStorage.getItem("chatUser");
      let user = userStr ? JSON.parse(userStr) : null;
      let username = user?.username || "Unknown User";


    socket.emit("joinRoom", { userId,username, roomCode });
  }

  function createPeer(remoteId, stream, initiator) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.onicecandidate = (e) => {
      if (e.candidate)
        socket.emit("iceCandidate", { to: remoteId, candidate: e.candidate });
    };

    peer.ontrack = (e) => {
      const remoteStream = e.streams[0];
      if (remoteStream)
        setPeers((prev) => new Map(prev).set(remoteId, remoteStream));
    };

    if (initiator)
      (async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("offer", { to: remoteId, offer });
      })();

    return peer;
  }

  function leaveMeeting() {
  if (!hasJoinedRef.current) return;
  hasJoinedRef.current = false;

  // Parse session storage safely
  const userStr = sessionStorage.getItem("chatUser");
  const user = userStr ? JSON.parse(userStr) : null;
  const username = user?.username || "Unknown User";

  socket.emit("leaveRoom", { userId, username, roomCode });

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


  // ---- Toggle Camera ----
  const toggleCam = async () => {
    if (!localStream) return;

    const videoTracks = localStream.getVideoTracks();

    if (videoTracks.length > 0) {
      // Camera is ON → turn OFF
      const track = videoTracks[0];
      track.stop(); // actually turns off camera
      localStream.removeTrack(track); // remove from stream
      setIsVideoEnabled(false);
      sessionStorage.setItem("cameraOn", "false");
    } else {
      // Camera is OFF → turn ON
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newTrack = newStream.getVideoTracks()[0];
        localStream.addTrack(newTrack);

        peerMap.current.forEach((peer) => {
          const sender = peer
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(newTrack);
          else peer.addTrack(newTrack, localStream);
        });

        setIsVideoEnabled(true);
        sessionStorage.setItem("cameraOn", "true");
      } catch (err) {
        console.error("Unable to access camera:", err);
      }
    }
  };

  // ---- Toggle Mic ----
  const toggleMic = () => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
    sessionStorage.setItem("micOn", track.enabled ? "true" : "false");
  };

  // ---- Screen Share ----
  async function startScreenShare() {
    if (!localStream) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = stopScreenShare;

      // Replace local video track for preview
      localStream.getVideoTracks().forEach((t) => localStream.removeTrack(t));
      localStream.addTrack(screenTrack);

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

      localStream.getVideoTracks().forEach((t) => localStream.removeTrack(t));
      localStream.addTrack(camTrack);

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
