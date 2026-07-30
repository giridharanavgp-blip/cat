import { io } from "socket.io-client";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:4000";

// Single shared socket instance for the whole app
export const socket = io(GATEWAY_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

export const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL || "http://localhost:8000";
