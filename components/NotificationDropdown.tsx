// components/NotificationDropdown.tsx
import {
  AppNotification,
  useNotificationStore,
} from "@/stores/notificationStore";
import {
  getPostIdFromNotificationData,
  isLivePostNotificationType,
} from "@/utils/notificationPayload";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const timeAgo = (dateStr: string) => {
  const now = new Date();
  const past = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (!Number.isFinite(seconds)) return "recent";
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  BROADCAST: "megaphone-outline",
  NEW_POST: "megaphone-outline",
  POST_LIVE: "radio-outline",
  POST_STARTED_LIVE: "radio-outline",
  POST_UPDATED: "create-outline",
  POST_DELETED: "trash-outline",
  POST_PUBLISHED: "checkmark-circle-outline",
  EVENT_REMINDER: "calendar-outline",
  CAROUSEL_CREATED: "images-outline",
  CAROUSEL_UPDATED: "create-outline",
  CAROUSEL_DELETED: "trash-outline",
  CAROUSEL_TOGGLED: "sync-outline",
};

const messageTypes = new Set([
  "BROADCAST",
  "EVENT_REMINDER",
  "NEW_POST",
  "POST_PUBLISHED",
]);

interface Props {
  visible: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead?: (id: string) => void;
}

export default function NotificationDropdown({
  visible,
  onClose,
  onMarkAllRead,
  onMarkRead,
}: Props) {
  const insets = useSafeAreaInsets();
  const { notifications, pruneExpired } = useNotificationStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const [selectedNotification, setSelectedNotification] =
    useState<AppNotification | null>(null);

  const closeDetail = () => {
    setSelectedNotification(null);
  };

  const handleRequestClose = () => {
    if (selectedNotification) {
      closeDetail();
      return;
    }

    onClose();
  };

  const handleNotificationPress = (item: AppNotification) => {
    onMarkRead?.(item.id || item._id || "");

    const postId = getPostIdFromNotificationData(item.data);

    if (postId) {
      onClose();
      router.replace({
        pathname: "/post/[id]",
        params: { id: postId },
      });
      return;
    }

    setSelectedNotification(item);
  };

  useEffect(() => {
    if (visible) {
      pruneExpired();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(-20);
      setSelectedNotification(null);
    }
  }, [fadeAnim, pruneExpired, slideAnim, visible]);

  const renderItem = ({ item }: { item: AppNotification }) => {
    const showMessage =
      messageTypes.has(item.type) || isLivePostNotificationType(item.type);

    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.isRead && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={typeIcon[item.type] || "notifications-outline"}
          size={20}
          color="#e94560"
          style={styles.notifIcon}
        />
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle} numberOfLines={3}>
            {item.title}
          </Text>
          {showMessage && item.message ? (
            <Text style={styles.notifMessage} numberOfLines={2}>
              {item.message}
            </Text>
          ) : null}
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead ? <View style={styles.unreadDot} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.dropdown,
          {
            top: insets.top + 60,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={onMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="notifications-outline"
              size={32}
              color="#6b7280"
            />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              item.id?.toString() ||
              item._id?.toString() ||
              `${item.createdAt}-${index}`
            }
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {selectedNotification ? (
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={closeDetail} />
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailIconShell}>
                <Ionicons
                  name={
                    typeIcon[selectedNotification.type] ||
                    "notifications-outline"
                  }
                  size={22}
                  color="#e94560"
                />
              </View>

              <View style={styles.detailHeading}>
                <Text style={styles.detailTime}>
                  {timeAgo(selectedNotification.createdAt)}
                </Text>
                <Text style={styles.detailTitle}>
                  {selectedNotification.title}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.detailClose}
                onPress={closeDetail}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#d1d5db" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.detailMessage}>
                {selectedNotification.message || "No message content."}
              </Text>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  dropdown: {
    position: "absolute",
    right: 12,
    width: 320,
    maxHeight: 420,
    backgroundColor: "#1a2035",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  markAllText: { color: "#e94560", fontSize: 13 },
  list: { maxHeight: 360 },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  unreadItem: { backgroundColor: "rgba(233,69,96,0.06)" },
  notifIcon: { marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
    lineHeight: 18,
  },
  notifTime: { color: "#6b7280", fontSize: 11, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e94560",
    marginTop: 6,
  },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: "#6b7280", fontSize: 14 },
  notifMessage: {
    color: "#d1d5db",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    zIndex: 20,
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,9,18,0.78)",
  },
  detailCard: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "78%",
    backgroundColor: "#171d31",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  detailIconShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233,69,96,0.12)",
  },
  detailHeading: { flex: 1, minWidth: 0 },
  detailTime: {
    color: "#8b93a7",
    fontSize: 12,
    marginBottom: 4,
  },
  detailTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },
  detailClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  detailScroll: { maxHeight: 420 },
  detailScrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  detailMessage: {
    color: "#e5e7eb",
    fontSize: 15,
    lineHeight: 23,
  },
});
