// useMeeting.js
import { useState, useRef, useEffect } from "react";
import socket from "../hooks/socket";
import { setPreviewStream } from "../../../utils/streamStore";

export function useMeeting(userId, roomCode, teamId = null) {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const userRefs = useRef(new Map()); // username map

  const peerMap = useRef(new Map());
  const hasJoinedRef = useRef(false);
  const localStreamRef = useRef(null);
  
  // ------------------------------------------
  // JOIN MEETING
  // ------------------------------------------
  async function joinMeeting({ micEnabled = true, camEnabled = true } = {}) {
    if (hasJoinedRef.current) return;

    console.log("Join meeting called with micEnabled:", micEnabled, "camEnabled:", camEnabled);

    const sessionKey = `joined_${roomCode}_${userId}`;
    if (sessionStorage.getItem(sessionKey)) {
      hasJoinedRef.current = true;
      return;
    }
    hasJoinedRef.current = true;
    sessionStorage.setItem(sessionKey, "true");

    if (!socket.connected) socket.connect();
    socket.emit("register", { userId });

    // Get media
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getAudioTracks().forEach((t) => (t.enabled = !!micEnabled));
      stream.getVideoTracks().forEach((t) => (t.enabled = !!camEnabled));
    } catch (err) {
      console.error("Failed to get user media:", err);
      stream = new MediaStream();
    }

    // Clone it
    const clonedStream = new MediaStream(stream.getTracks());
    setPreviewStream(clonedStream);
    updateLocalStream(clonedStream);

    setIsMuted(!micEnabled);
    setIsVideoEnabled(camEnabled);

    // Re-attach tracks to existing peers
    peerMap.current.forEach((peer) => {
      try {
        clonedStream.getTracks().forEach((t) => peer.addTrack(t, clonedStream));
      } catch (e) {}
    });

    // SOCKET HANDLERS
    socket.off("existingUsers").on("existingUsers", ({ users }) => {
      users.forEach(({ userId: rId, username }) => {
        userRefs.current.set(rId, username);
        if (!peerMap.current.has(rId)) createPeer(rId, true);
      });
    });

    socket.off("userJoined").on("userJoined", ({ userId: rId, username }) => {
      userRefs.current.set(rId, username);
      if (!peerMap.current.has(rId)) createPeer(rId, true);

      window.dispatchEvent(
        new CustomEvent("meeting-toast", {
          detail: { message: `${username} joined the meeting` },
        })
      );
    });
 
    socket.off("offer").on("offer", async ({ from, offer }) => {
      let peer = peerMap.current.get(from);
      if (!peer) peer = createPeer(from, false);

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("answer", { to: from, answer: peer.localDescription });
      } catch (err) {
        console.error("Offer handling failed:", err);
      }
    });

    socket.off("answer").on("answer", async ({ from, answer }) => {
      const peer = peerMap.current.get(from);
      if (!peer) return;

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Setting answer failed:", err);
      }
    });

    socket.off("iceCandidate").on("iceCandidate", async ({ from, candidate }) => {
      const peer = peerMap.current.get(from);
      if (peer && candidate) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("addIceCandidate failed:", err);
        }
      }
    });

    socket.off("userLeft").on("userLeft", ({ userId: rId, username }) => {
      userRefs.current.delete(rId);
      const peer = peerMap.current.get(rId);
      if (peer) peer.close();
      peerMap.current.delete(rId);

      setPeers((prev) => {
        const updated = new Map(prev);
        updated.delete(rId);
        return updated;
      });

      window.dispatchEvent(
        new CustomEvent("meeting-toast", {
          detail: { message: `${username} left the meeting` },
        })
      );
    });

    // Emit joinRoom
    const user = JSON.parse(sessionStorage.getItem("chatUser") || "{}");
    socket.emit("joinRoom", {
      userId,
      username: user.username || "Unknown User",
      roomCode,
    });
  }

  // ------------------------------------------
  // LEAVE MEETING
  // ------------------------------------------
  function leaveMeeting() {
    if (!hasJoinedRef.current) return;
    hasJoinedRef.current = false;

    const username =
      JSON.parse(sessionStorage.getItem("chatUser") || "{}")?.username ||
      "Unknown User";

    socket.emit("leaveRoom", { userId, username, roomCode });

    // Remove all handlers
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

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    updateLocalStream(null);

    sessionStorage.removeItem(`joined_${roomCode}_${userId}`);
  }


  const updateLocalStream = (s) => {
    localStreamRef.current = s;
    setLocalStream(s);
  };


  // ------------------------------------------
  // PEER CREATION
  // ------------------------------------------

  function createPeer(remoteId, initiator = false) {
    if (peerMap.current.has(remoteId)) return peerMap.current.get(remoteId);

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Attach local tracks if already present
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((track) =>
          peer.addTrack(track, localStreamRef.current)
        );
      } catch (err) {
        console.warn("addTrack immediate failed:", err);
      }
    }

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("iceCandidate", { to: remoteId, candidate: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      const remoteStream = e.streams[0];
      if (remoteStream) {
        setPeers((prev) => {
          const copy = new Map(prev);
          copy.set(remoteId, remoteStream);
          return copy;
        });
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed" || peer.connectionState === "closed") {
        peer.close();
        peerMap.current.delete(remoteId);
        setPeers((prev) => {
          const copy = new Map(prev);
          copy.delete(remoteId);
          return copy;
        });
      }
    };

    peerMap.current.set(remoteId, peer);

    // If initiator → create offer immediately
    if (initiator) {
      (async () => {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit("offer", { to: remoteId, offer: peer.localDescription });
        } catch (err) {
          console.error("Failed creating/sending offer", err);
        }
      })();
    }

    return peer;
  }

 
  // ------------------------------------------
  // CAMERA TOGGLE
  // ------------------------------------------
  const toggleCam = async () => {
    if (!localStreamRef.current) return;

    let existingTrack = localStreamRef.current.getVideoTracks()[0];

    if (isVideoEnabled && existingTrack) {
      existingTrack.enabled = false;
      setIsVideoEnabled(false);
      sessionStorage.setItem("cameraOn", "false");
      updateLocalStream(localStreamRef.current);
      return;
    }

    // Turn camera ON
    try {
      if (existingTrack) {
        existingTrack.enabled = true;
      } else {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = camStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(newTrack);

        peerMap.current.forEach((peer) => {
          const sender = peer
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");

          if (sender) {
            sender.replaceTrack(newTrack);
          } else {
            peer.addTrack(newTrack, localStreamRef.current);
          }
        });
      }

      setIsVideoEnabled(true);
      sessionStorage.setItem("cameraOn", "true");
      updateLocalStream(localStreamRef.current);
    } catch (err) {
      console.error("Unable to access camera:", err);
    }
  };

  // ------------------------------------------
  // MIC TOGGLE
  // ------------------------------------------
  const toggleMic = () => {
    if (!localStreamRef.current) return;

    const track = localStreamRef.current.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);

    sessionStorage.setItem("micOn", track.enabled ? "true" : "false");
  };

  // ------------------------------------------
  // SCREEN SHARE
  // ------------------------------------------
  async function startScreenShare() {
    if (!localStreamRef.current) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");

        if (sender) sender.replaceTrack(screenTrack);
        else peer.addTrack(screenTrack, screenStream);
      });

      const newStream = new MediaStream([
        ...localStreamRef.current.getAudioTracks(),
        screenTrack,
      ]);

      updateLocalStream(newStream);
      setIsScreenSharing(true);
      setIsVideoEnabled(true);

      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error("Unable to start screen share:", err);
    }
  }

  async function stopScreenShare() {
    if (!localStreamRef.current) return;

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];

      const newStream = new MediaStream([
        ...localStreamRef.current.getAudioTracks(),
        camTrack,
      ]);

      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");

        if (sender) sender.replaceTrack(camTrack);
        else peer.addTrack(camTrack, newStream);
      });

      updateLocalStream(newStream);
      setIsScreenSharing(false);
      setIsVideoEnabled(true);
    } catch (err) {
      console.error("Unable to stop screen share:", err);
    }
  }

  // ------------------------------------------
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
    userRefs,
  };
}
