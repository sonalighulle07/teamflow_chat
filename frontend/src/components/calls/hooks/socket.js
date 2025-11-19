import { io } from "socket.io-client";

// Ensure the signaling URL is defined
const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_URL;

if (!SIGNALING_SERVER) {
  throw new Error("VITE_SIGNALING_URL is not defined. Check your .env file.");
}

// Create socket instance (will NOT auto-connect)
const socket = io(SIGNALING_SERVER, {
  transports: ["websocket"],
  autoConnect: false,
});

/**
 * Connect socket with userId auth
 */
export const connectSocket = (userId) => {
  if (!socket.connected) {
    console.log("connecting socket from socket.js...")
    socket.auth = { userId };
    socket.connect();
  }
  return socket;
};

/**
 * Get socket instance
 */
export const getSocket = () => socket;

export default socket;
