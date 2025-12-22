import { io } from "socket.io-client";

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_URL;

const socket = io(SIGNALING_SERVER, {
  autoConnect: false,
  withCredentials: true,
});

export const connectSocket = (userId) => {
  if (!userId) {
    console.warn("❌ connectSocket called without userId");
    return socket;
  }

  if (socket.connected) return socket;

  console.log("Connecting socket...");

  socket.auth = { userId };

  socket.connect();

  socket.once("connect", () => {
    console.log("🟢 Socket connected:", socket.id);

    // 🔥 REGISTER ONLY AFTER CONNECT
    socket.emit("register", { userId: String(userId) });
  });

  socket.once("connect_error", (err) => {
    console.error("🔴 Socket connection error:", err.message);
  });

  return socket;
};

export default socket;
