// import { io } from "socket.io-client";

// // Vite picks up VITE_ env vars via import.meta.env
// const SIGNALING_SERVER =
//   import.meta.env.VITE_SIGNALING_URL || "http://localhost:3000";

// const socket = io(SIGNALING_SERVER, { autoConnect: false });

// export default socket;

import { io } from "socket.io-client";

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_URL || "http://localhost:3000";
const socket = io(SIGNALING_SERVER, { autoConnect: false });

export default socket;



