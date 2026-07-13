// components/PageHeader.tsx
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationStore } from "@/stores/notificationStore";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationDropdown from "./NotificationDropdown";

export default function PageHeader({
  title,
  onNotificationPress,
}: {
  title?: string;
  onNotificationPress?: (postId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [showDropdown, setShowDropdown] = useState(false);
  const { unreadCount } = useNotificationStore();
  const { markAllRead, markRead } = useNotifications({ listen: false });

  return (
    <>
      {/* The container handles the background and top inset. 
        The 'innerHeader' handles the actual content with a fixed height.
      */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View
          style={[
            styles.innerHeader,
            isLandscape && styles.innerHeaderLandscape,
          ]}
        >
          <Image
            source={require("@/assets/images/radioLogoOrg.png")}
            style={[styles.logo, isLandscape && styles.logoLandscape]}
            resizeMode="contain"
          />

          <Text
            style={[
              styles.headerTitle,
              isLandscape && styles.headerTitleLandscape,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          <TouchableOpacity
            style={[
              styles.notificationBell,
              isLandscape && styles.notificationBellLandscape,
            ]}
            onPress={() => setShowDropdown(true)}
          >
            <Ionicons
              name="notifications-outline"
              size={isLandscape ? 18 : 20}
              color="#e94560"
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <NotificationDropdown
        visible={showDropdown}
        onClose={() => setShowDropdown(false)}
        onMarkAllRead={markAllRead}
        onMarkRead={markRead}
        onNotificationPress={onNotificationPress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "rgba(15,23,42,0.98)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  innerHeader: {
    height: 56, // Standard Android/iOS header height
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  innerHeaderLandscape: {
    height: 44,
    paddingHorizontal: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    flex: 1, // Allows title to take available space
    textAlign: "center",
    marginHorizontal: 8,
  },
  headerTitleLandscape: {
    fontSize: 15,
  },
  logo: {
    width: 70, // Reduced from 90
    height: 65, // Reduced from 66 to keep header slim
  },
  logoLandscape: {
    width: 54,
    height: 42,
  },
  notificationBell: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(233,69,96,0.1)",
  },
  notificationBellLandscape: {
    padding: 7,
    borderRadius: 18,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#e94560",
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0f172a",
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  },
});
