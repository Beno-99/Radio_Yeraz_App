// services/socket.service.ts
import { API_ORIGIN } from "@/services/mobileApi";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = API_ORIGIN;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      this.socket?.emit("get_notifications");
    });

    this.socket.on("disconnect", () => {});

    this.socket.on("connect_error", (err) => {
      console.log("Socket connection error:", err.message);
    });

    this.socket.onAny((event, data) => {
      console.log("Socket event received:", event, data);
    });

    const events = [
      "new_notification",
      "notifications_list",
      "notifications_cleared",
      "notification_read",
      "admin_notification",
    ];

    events.forEach((event) => {
      this.socket?.on(event, (data: unknown) => {
        this.listeners.get(event)?.forEach((cb) => cb(data));
      });
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
