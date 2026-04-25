// services/socket.service.ts
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_IMAGE_BASE_URL || "http://192.168.1.197:8000";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    console.log("🔌 Connecting socket to:", SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      // ← removed /notifications namespace
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected");
      this.socket?.emit("get_notifications");
    });

    this.socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    this.socket.on("connect_error", (err) => {
      console.log("⚠️ Socket connection error:", err.message);
    });
    this.socket.onAny((event, data) => {
      console.log("📨 Socket event received:", event, data);
    });
    const events = [
      "new_notification",
      "notifications_list",
      "notifications_cleared",
      "notification_read",
      "admin_notification",
    ];

    events.forEach((event) => {
      this.socket?.on(event, (data: any) => {
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

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
