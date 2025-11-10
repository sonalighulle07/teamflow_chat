// useMeeting.js
import { useState, useRef, useEffect } from "react";
import socket from "./socket";
import { useSelector } from "react-redux";

export function useMeeting(userId, roomCode, teamId = null) {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerMap = useRef(new Map());
  const hasJoinedRef = useRef(false);
  const localStreamRef = useRef(null);

  const updateLocalStream = (s) => {
    localStreamRef.current = s;
    setLocalStream(s);
  };

  // ---- Create or get peer connection for a remote id ----
  function createPeer(remoteId, initiator = false) {
    // return existing if present
    if (peerMap.current.has(remoteId)) return peerMap.current.get(remoteId);

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Attach any existing local tracks immediately
    const s = localStreamRef.current;
    if (s) {
      try {
        s.getTracks().forEach((track) => peer.addTrack(track, s));
      } catch (err) {
        console.warn("addTrack immediate failed:", err);
      }
    }

    peer.onicecandidate = (e) => {
      if (e.candidate) socket.emit("iceCandidate", { to: remoteId, candidate: e.candidate });
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
      // optional: cleanup on failed/disconnected
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

    // If initiator, create and send offer right away
    if (initiator) {
      (async () => {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit("offer", { to: remoteId, offer: peer.localDescription });
        } catch (err) {
          console.error("Failed to create/send offer", err);
        }
      })();
    }

    return peer;
  }

  // ---- Join meeting (get media, register socket, handle peers) ----
  async function joinMeeting({ micEnabled = true, camEnabled = true } = {}) {
    if (hasJoinedRef.current) return;

    const sessionKey = `joined_${roomCode}_${userId}`;
    if (sessionStorage.getItem(sessionKey)) {
      hasJoinedRef.current = true;
      return;
    }
    hasJoinedRef.current = true;
    sessionStorage.setItem(sessionKey, "true");

    // ensure socket connected and register
    if (!socket.connected) socket.connect();
    socket.emit("register", { userId });

    // get user media (apply requested initial states)
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getAudioTracks().forEach((t) => (t.enabled = !!micEnabled));
      stream.getVideoTracks().forEach((t) => (t.enabled = !!camEnabled));
    } catch (err) {
      console.error("Failed to get user media:", err);
      stream = new MediaStream();
    }

    // create a fresh MediaStream instance (clone tracks)
    const initialStream = new MediaStream(stream.getTracks());
    updateLocalStream(initialStream);
    setIsMuted(!micEnabled);
    setIsVideoEnabled(!!camEnabled);

    // If peers already exist (created earlier), attach tracks to them
    peerMap.current.forEach((peer) => {
      try {
        initialStream.getTracks().forEach((track) => peer.addTrack(track, initialStream));
      } catch (err) {
        // ignore; some peers might already have senders
        console.warn("attach tracks to existing peer failed:", err);
      }
    });

    // ---- socket handlers: (use off/on to avoid duplicates) ----
    socket.off("existingUsers").on("existingUsers", ({ users }) => {
      // users = array of remote IDs present in room
      users.forEach((remoteId) => {
        if (!peerMap.current.has(remoteId)) {
          // we are initiator for existing users (we create offer)
          createPeer(remoteId, true);
        }
      });
    });

    socket
      .off("userJoined")
      .on("userJoined", ({ userId: remoteId, username: remoteUsername }) => {
        // A new user joined — create peer and initiate offer to them
        if (!peerMap.current.has(remoteId)) {
          createPeer(remoteId, true);
        }
        window.dispatchEvent(
          new CustomEvent("meeting-toast", {
            detail: { message: `${remoteUsername} joined the meeting` },
          })
        );
      });

    socket.off("offer").on("offer", async ({ from, offer }) => {
      // remote sent offer => ensure peer exists as non-initiator, set remote, create answer
      let peer = peerMap.current.get(from);
      if (!peer) peer = createPeer(from, false);
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("answer", { to: from, answer: peer.localDescription });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    });

    socket.off("answer").on("answer", async ({ from, answer }) => {
      const peer = peerMap.current.get(from);
      if (peer) {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Error setting remote description from answer:", err);
        }
      }
    });

    socket
      .off("iceCandidate")
      .on("iceCandidate", async ({ from, candidate }) => {
        const peer = peerMap.current.get(from);
        if (peer && candidate) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("addIceCandidate failed:", err);
          }
        }
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

    // finally emit joinRoom (no ack here; if you use ack change accordingly)
    let userStr = sessionStorage.getItem("chatUser");
    let user = userStr ? JSON.parse(userStr) : null;
    let username = user?.username || "Unknown User";

    socket.emit("joinRoom", { userId, username, roomCode });
  }

  function leaveMeeting() {
    if (!hasJoinedRef.current) return;
    hasJoinedRef.current = false;

    let userStr = sessionStorage.getItem("chatUser");
    const user = userStr ? JSON.parse(userStr) : null;
    const username = user?.username || "Unknown User";
    const teamIdFromCode = roomCode?.split("-")[1] || teamId || null;

    socket.emit("leaveRoom", { userId, username, roomCode, teamId: teamIdFromCode });

    // remove socket handlers
    socket.off("existingUsers");
    socket.off("userJoined");
    socket.off("offer");
    socket.off("answer");
    socket.off("iceCandidate");
    socket.off("userLeft");

    // close peers
    peerMap.current.forEach((peer) => peer.close());
    peerMap.current.clear();
    setPeers(new Map());

    // stop local stream tracks and clear
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    updateLocalStream(null);

    try {
      sessionStorage.removeItem(`joined_${roomCode}_${userId}`);
      const channel = new BroadcastChannel("meeting-session");
      channel.postMessage(`left_${roomCode}_${userId}`);
      channel.close();
    } catch (e) {
      // ignore
    }
  }

  // --------- Camera toggle ----------
  const toggleCam = async () => {
    if (!localStreamRef.current) return;

    // current video track (if any)
    let existingVideo = localStreamRef.current.getVideoTracks()[0];

    if (isVideoEnabled && existingVideo) {
      try {
        existingVideo.enabled = false;
      } catch (err) {
        console.warn("Failed to disable video track:", err);
      }
      updateLocalStream(localStreamRef.current);
      setIsVideoEnabled(false);
      sessionStorage.setItem("cameraOn", "false");
    } else {
      try {
        existingVideo = localStreamRef.current.getVideoTracks()[0];
        if (existingVideo) {
          existingVideo.enabled = true;
          updateLocalStream(localStreamRef.current);
        } else {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = camStream.getVideoTracks()[0];
          try {
            localStreamRef.current.addTrack(newTrack);
          } catch (err) {
            console.warn("addTrack to local stream failed:", err);
          }

          // try replaceTrack on senders, fallback to addTrack
          peerMap.current.forEach((peer) => {
            const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
            if (sender) {
              try {
                sender.replaceTrack(newTrack);
              } catch (err) {
                try {
                  peer.addTrack(newTrack, localStreamRef.current);
                } catch (e) {
                  console.warn("peer.addTrack failed:", e);
                }
              }
            } else {
              try {
                peer.addTrack(newTrack, localStreamRef.current);
              } catch (err) {
                console.warn("peer.addTrack failed:", err);
              }
            }
          });

          updateLocalStream(localStreamRef.current);
        }

        setIsVideoEnabled(true);
        sessionStorage.setItem("cameraOn", "true");
      } catch (err) {
        console.error("Unable to access camera:", err);
      }
    }
  };

  // ---- Toggle Mic (enable/disable) ----
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
    sessionStorage.setItem("micOn", track.enabled ? "true" : "false");
  };

  // ---- Screen Share ----
  async function startScreenShare() {
    if (!localStreamRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          try {
            sender.replaceTrack(screenTrack);
          } catch (err) {
            console.warn("replaceTrack screen failed:", err);
          }
        } else {
          peer.addTrack(screenTrack, screenStream);
        }
      });

      const newStream = new MediaStream([...localStreamRef.current.getAudioTracks(), screenTrack]);
      updateLocalStream(newStream);

      screenTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);
      setIsVideoEnabled(true);
    } catch (err) {
      console.error("Unable to start screen share:", err);
    }
  }

  async function stopScreenShare() {
    if (!localStreamRef.current) return;
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];

      const newStream = new MediaStream([...localStreamRef.current.getAudioTracks(), camTrack]);

      peerMap.current.forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          try {
            sender.replaceTrack(camTrack);
          } catch (err) {
            console.warn("replaceTrack when stopping screen failed:", err);
          }
        } else {
          peer.addTrack(camTrack, newStream);
        }
      });

      updateLocalStream(newStream);
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
