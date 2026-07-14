import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter, type Href } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabItem = {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  path: string;
};

const TAB_ITEMS: readonly TabItem[] = [
  { href: "/(tabs)/stream", icon: "radio", label: "Stream", path: "/stream" },
  {
    href: "/(tabs)/posts",
    icon: "newspaper",
    label: "Posts",
    path: "/posts",
  },
  {
    href: "/(tabs)/favorites",
    icon: "heart",
    label: "Favorites",
    path: "/favorites",
  },
  {
    href: "/(tabs)/about",
    icon: "information-circle",
    label: "About Us",
    path: "/about",
  },
  {
    href: "/(tabs)/contact",
    icon: "mail",
    label: "Contact Us",
    path: "/contact",
  },
] as const;

export default function FixedTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const activeIndex = useMemo(
    () => TAB_ITEMS.findIndex((item) => pathname.startsWith(item.path)),
    [pathname],
  );
  const isVisible = activeIndex >= 0;

  const navigateToTab = useCallback(
    (href: Href) => {
      router.replace(href);
    },
    [router],
  );

  if (!isVisible) return null;

  const bottomPadding = isLandscape ? 4 : Math.max(insets.bottom, 10);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        isLandscape ? styles.wrapperLandscape : styles.wrapperPortrait,
        { paddingBottom: bottomPadding },
      ]}
    >
      {TAB_ITEMS.map((item, index) => {
        const isActive = index === activeIndex;
        const color = isActive ? "#ff4d6d" : "#9ca3af";

        return (
          <TouchableOpacity
            key={item.path}
            activeOpacity={0.78}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={[
              styles.item,
              isLandscape && styles.itemLandscape,
            ]}
            onPress={() => navigateToTab(item.href)}
          >
            <Ionicons
              name={item.icon}
              size={isLandscape ? 23 : 28}
              color={color}
            />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={[
                styles.label,
                isLandscape && styles.labelLandscape,
                { color },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    backgroundColor: "#1b2746",
    borderTopWidth: 0,
    bottom: 0,
    elevation: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 0,
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    zIndex: 500,
  },
  wrapperPortrait: {
    minHeight: 80,
    paddingTop: 10,
  },
  wrapperLandscape: {
    minHeight: 58,
    paddingTop: 4,
  },
  item: {
    alignItems: "center",
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minWidth: 0,
  },
  itemLandscape: {
    gap: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    maxWidth: "100%",
    textAlign: "center",
  },
  labelLandscape: {
    fontSize: 11,
  },
});
