// import { io } from "socket.io-client";

// // Vite picks up VITE_ env vars via import.meta.env
// const SIGNALING_SERVER =
//   import.meta.env.VITE_SIGNALING_URL || "http://localhost:3000";

// const socket = io(SIGNALING_SERVER, { autoConnect: false });

// export default socket;

import { io } from "socket.io-client";

// Ensure the signaling URL is defined
const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_URL;

if (!SIGNALING_SERVER) {
  throw new Error("VITE_SIGNALING_URL is not defined. Check your .env file.");
}

// Prefer WebSocket transport to avoid polling-related CORS issues
const socket = io(SIGNALING_SERVER, {
  transports: ["websocket"],
  autoConnect: false,
});
export const connectSocket = (userId) => {
  if (!socket.connected) {
    socket.auth = { userId };
    socket.connect();
  }
  return socket;
};

// Get socket instance
export const getSocket = () => socket;
export default socket;




