import { io } from "socket.io-client";

// Use VITE_API_URL from .env (e.g., http://192.168.1.10:5000)
const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL;

// Connect to socket.io server with reliable options
const socket = io(SOCKET_SERVER_URL, {
  transports: ["websocket"], // force WebSocket (avoids polling issues over network)
  reconnection: true,        // enable reconnections
  reconnectionAttempts: 10,  // try reconnecting 10 times
  reconnectionDelay: 1000,   // wait 1s between attempts
  autoConnect: true,         // automatically connect on import
});

export default socket;