// useMeeting.js
import { useState, useRef, useEffect, useCallback } from "react";
import socket from "../hooks/socket";
import { setPreviewStream } from "../../../utils/streamStore";

/**
 * useMeeting(userId, roomCode, teamId)
 * - userId: string/number (will be normalized)
 * - roomCode: string
 * - teamId: optional (for backend meeting end)
 **/

export function useMeeting(userId, roomCode, teamId = null) {

  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const userRefs = useRef(new Map()); // userId -> username
  const peerMap = useRef(new Map()); // userId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const hasJoinedRef = useRef(false);

  // normalize userId to string
  const userIdStr = String(userId);

  // update local stream helper
  const updateLocalStream = useCallback((s) => {
    localStreamRef.current = s;
    setLocalStream(s);
  }, []);


  // Clean event listener helper
  const cleanupSocketHandlers = useCallback(() => {
    socket.off("existingUsers");
    socket.off("userJoined");
    socket.off("meet-offer");
    socket.off("meet-answer");
    socket.off("meet-iceCandidate");
    socket.off("userLeft");
    socket.off("registered");
  }, []);


  // Create RTCPeerConnection for a remote user
  const createPeer = useCallback(
    (remoteId, initiator = false) => {
      if (!remoteId) return null;
      if (peerMap.current.has(remoteId)) return peerMap.current.get(remoteId);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // store remoteId for later reference
      try { pc.remoteId = remoteId; } catch (e) {}

      // attach local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          try { pc.addTrack(t, localStreamRef.current); } catch (e) {}
        });
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit("meet-iceCandidate", { to: remoteId, candidate: ev.candidate });
        }
      };

      pc.ontrack = (ev) => {
        const remoteStream = ev.streams && ev.streams[0];
        if (!remoteStream) return;
        setPeers((prev) => {
          const m = new Map(prev);
          m.set(remoteId, remoteStream);
          return m;
        });
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (["closed", "failed", "disconnected"].includes(s)) {
          try { pc.close(); } catch (e) {}
          peerMap.current.delete(remoteId);
          setPeers((prev) => {
            const m = new Map(prev);
            m.delete(remoteId);
            return m;
          });
        }
      };

      peerMap.current.set(remoteId, pc);

      if (initiator) {
        // small delay to ensure tracks added
        (async () => {
          try {
            await new Promise((r) => setTimeout(r, 30));
            // ensure we have tracks
            const senders = pc.getSenders().filter((s) => s.track);
            if (senders.length === 0 && localStreamRef.current) {
              localStreamRef.current.getTracks().forEach((t) => {
                try { pc.addTrack(t, localStreamRef.current); } catch (e) {}
              });
            }

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("meet-offer", { to: remoteId, offer: pc.localDescription || offer });
          } catch (err) {
            console.error("createPeer (initiator) failed:", err);
          }
        })();
      }

      return pc;
    },
    []
  );

  // joinMeeting is safe, idempotent, and queued
  const joinMeeting = useCallback(
    async ({ micEnabled = true, camEnabled = true } = {}) => {
      if (hasJoinedRef.current) return;
      hasJoinedRef.current = true;

      // persist join to avoid double-side effects on reload
      try { sessionStorage.setItem(`joined_${roomCode}_${userIdStr}`, "1"); } catch (e) {}

      // Acquire media
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getAudioTracks().forEach((t) => (t.enabled = !!micEnabled));
        stream.getVideoTracks().forEach((t) => (t.enabled = !!camEnabled));
      } catch (err) {
        console.warn("getUserMedia failed - falling back to empty stream", err);
        stream = new MediaStream();
      }

      // clone tracks to avoid adding same track across multiple PCs
      const cloned = new MediaStream();
      stream.getTracks().forEach((t) => {
        try { cloned.addTrack(t.clone()); } catch (e) { cloned.addTrack(t); }
      });

      // set preview + state
      try { setPreviewStream(cloned); } catch (e) {}
      updateLocalStream(cloned);
      setIsMuted(!micEnabled);
      setIsVideoEnabled(camEnabled);

      // Socket event handlers and pending queue
      const pending = [];

      // existingUsers (server sends array in { users: [...] })
      socket.off("existingUsers").on("existingUsers", (payload) => {
        const users = Array.isArray(payload) ? payload : payload?.users || [];
        users.forEach(({ userId: rId, username }) => {
          userRefs.current.set(String(rId), username);
          if (localStreamRef.current && !peerMap.current.has(String(rId))) {
            createPeer(String(rId), true);
          } else if (!peerMap.current.has(String(rId))) {
            pending.push({ id: String(rId), initiator: true });
          }
        });

        // drain pending
        while (localStreamRef.current && pending.length) {
          const p = pending.shift();
          if (!peerMap.current.has(p.id)) createPeer(p.id, p.initiator);
        }
      });

      socket.off("userJoined").on("userJoined", ({ userId: rId, username }) => {
        rId = String(rId);
        userRefs.current.set(rId, username);
        if (localStreamRef.current && !peerMap.current.has(rId)) {
          createPeer(rId, true);
        } else if (!peerMap.current.has(rId)) {
          pending.push({ id: rId, initiator: true });
        }
        window.dispatchEvent(new CustomEvent("meeting-toast", { detail: { message: `${username} joined` } }));
      });

      // meet-offer (incoming)
      socket.off("meet-offer").on("meet-offer", async ({ from, offer }) => {
        if (!from) {
          console.warn("meet-offer without from", { from, offer });
          return;
        }
        const rid = String(from);
        let pc = peerMap.current.get(rid);
        if (!pc) pc = createPeer(rid, false);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("meet-answer", { to: rid, answer: pc.localDescription || answer });
        } catch (err) {
          console.error("handle meet-offer error", err);
        }
      });

      socket.off("meet-answer").on("meet-answer", async ({ from, answer }) => {
        if (!from) return;
        const pc = peerMap.current.get(String(from));
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("handle meet-answer error", err);
        }
      });

      socket.off("meet-iceCandidate").on("meet-iceCandidate", async ({ from, candidate }) => {
        if (!from || !candidate) return;
        const pc = peerMap.current.get(String(from));
        if (!pc) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("addIceCandidate failed:", err);
        }
      });

      socket.off("userLeft").on("userLeft", ({ userId: rId, username }) => {
        rId = String(rId);
        userRefs.current.delete(rId);
        const pc = peerMap.current.get(rId);
        if (pc) {
          try { pc.close(); } catch (e) {}
          peerMap.current.delete(rId);
        }
        setPeers((prev) => {
          const m = new Map(prev);
          m.delete(rId);
          return m;
        });
        window.dispatchEvent(new CustomEvent("meeting-toast", { detail: { message: `${username} left` } }));
      });

      // Finally emit join AFTER handlers are registered
      const localUser = JSON.parse(sessionStorage.getItem("chatUser") || "{}");
      socket.emit("meet-joinRoom", { userId: userIdStr, username: localUser.username || "Unknown", roomCode }, (res) => {
        console.log("meet-joinRoom response:",res)

        // server callback: might contain existing users — server already emits existingUsers,
        // but callback can be used for errors
        if (res && res.success === false) {
          console.warn("meet-joinRoom failed:", res.message);
        }
      });

      // attach local stream into existing peerMap entries (in case peers are already created)
      // (NOTE: createPeer already adds tracks for new peers; this ensures reconnect cases)
      peerMap.current.forEach((pc) => {
        try {
          const existingSenderIds = new Set(pc.getSenders().map((s) => s.track && s.track.id));
          cloned.getTracks().forEach((t) => {
            if (!existingSenderIds.has(t.id)) {
              try { pc.addTrack(t, cloned); } catch (e) {}
            }
          });
        } catch (e) {}
      });

      updateLocalStream(cloned);
    },
    [createPeer, updateLocalStream, roomCode, userIdStr]
  );


  // leaveMeeting: clean everything
  const leaveMeeting = useCallback(() => {
    if (!hasJoinedRef.current) return;
    hasJoinedRef.current = false;

    const username = JSON.parse(sessionStorage.getItem("chatUser") || "{}")?.username || "Unknown";

    socket.emit("meet-leaveRoom", { userId: userIdStr, username, roomCode, teamId });

    // remove socket listeners
    cleanupSocketHandlers();

    // close peers
    peerMap.current.forEach((pc) => {
      try { pc.close(); } catch (e) {}
    });
    peerMap.current.clear();
    setPeers(new Map());

    // stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    updateLocalStream(null);

    try { sessionStorage.removeItem(`joined_${roomCode}_${userIdStr}`); } catch (e) {}
  }, [cleanupSocketHandlers, roomCode, teamId, updateLocalStream, userIdStr]);

  // toggle camera
  const toggleCam = useCallback(async () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      return;
    }

    // if no track, create and replace / add to peers
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true });
      const newTrack = cam.getVideoTracks()[0];
      localStreamRef.current.addTrack(newTrack);

      peerMap.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(newTrack);
        else pc.addTrack(newTrack, localStreamRef.current);
      });

      setIsVideoEnabled(true);
    } catch (err) {
      console.error("toggleCam error", err);
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  // screen share
  const startScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return;
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screen.getVideoTracks()[0];

      peerMap.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
        else pc.addTrack(screenTrack, screen);
      });

      const newStream = new MediaStream([...localStreamRef.current.getAudioTracks(), screenTrack]);
      updateLocalStream(newStream);
      setIsScreenSharing(true);

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("startScreenShare error", err);
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return;
    try {
      // get camera track
      const cam = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = cam.getVideoTracks()[0];
      const newStream = new MediaStream([...localStreamRef.current.getAudioTracks(), camTrack]);

      peerMap.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
        else pc.addTrack(camTrack, newStream);
      });

      updateLocalStream(newStream);
      setIsScreenSharing(false);
    } catch (err) {
      console.error("stopScreenShare error", err);
    }
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      leaveMeeting();
    };
  }, [leaveMeeting]);

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
