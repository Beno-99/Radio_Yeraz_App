// services/socket.service.ts
import { SOCKET_URL } from "@/services/mobileApi";
import { io, Socket } from "socket.io-client";

type SocketCallback = (data: unknown) => void;

const PUBLIC_SOCKET_EVENTS_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_SOCKET_EVENTS === "true";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketCallback>> = new Map();
  private connectionRefs = 0;

  connect() {
    if (!PUBLIC_SOCKET_EVENTS_ENABLED) return false;

    this.connectionRefs += 1;
    if (this.socket) return true;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      if (__DEV__) {
        console.log(
          "Socket connected:",
          this.socket?.id,
          this.socket?.io.engine.transport.name,
        );
      }
    });

    this.socket.on("disconnect", () => {});

    this.socket.on("connect_error", (err) => {
      if (__DEV__) {
        console.log("Socket connection error:", err.message);
      }
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

    return true;
  }

  disconnect() {
    if (!PUBLIC_SOCKET_EVENTS_ENABLED) return;

    this.connectionRefs = Math.max(0, this.connectionRefs - 1);
    if (this.connectionRefs > 0) return;

    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: SocketCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: SocketCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: unknown) {
    if (!PUBLIC_SOCKET_EVENTS_ENABLED) return;
    this.socket?.emit(event, data);
  }

  isEnabled() {
    return PUBLIC_SOCKET_EVENTS_ENABLED;
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
