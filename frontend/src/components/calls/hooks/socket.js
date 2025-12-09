import { io } from "socket.io-client";

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_URL;

if (!SIGNALING_SERVER) {
  throw new Error("VITE_SIGNALING_URL is not defined. Check your .env file.");
}

// Create socket instance — autoConnect false
const socket = io(SIGNALING_SERVER, {
  autoConnect: false,
  withCredentials: true,
});

// Connect with userId
export const connectSocket = (userId) => {
  if (!socket.connected) {
    console.log("Connecting socket...");

    // Send userId in auth BEFORE connect
    socket.auth = { userId };

    // Connect socket
    socket.connect();

    // Listen once for successful connection
    socket.once("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.once("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });
  }

  return socket;
};

// Always return instance
export const getSocket = () => socket;
export default socket;
