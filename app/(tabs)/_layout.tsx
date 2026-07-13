import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter, type Href } from "expo-router";
import { useCallback, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  Directions,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

type TabRoute = {
  href: Href;
  path: string;
};

const TAB_ROUTES = [
  { href: "/(tabs)/stream", path: "/stream" },
  { href: "/(tabs)/posts", path: "/posts" },
  { href: "/(tabs)/favorites", path: "/favorites" },
  { href: "/(tabs)/about", path: "/about" },
  { href: "/(tabs)/contact", path: "/contact" },
] as const satisfies readonly TabRoute[];

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const currentTabIndex = useMemo(() => {
    return TAB_ROUTES.findIndex((route) => pathname.startsWith(route.path));
  }, [pathname]);

  const navigateTabs = useCallback(
    (direction: 1 | -1) => {
      if (currentTabIndex < 0) return;

      const nextIndex = currentTabIndex + direction;
      const nextRoute = TAB_ROUTES[nextIndex];
      if (!nextRoute) return;

      router.replace(nextRoute.href);
    },
    [currentTabIndex, router],
  );

  const swipeLeft = useMemo(
    () =>
      Gesture.Fling()
        .direction(Directions.LEFT)
        .onEnd(() => {
          runOnJS(navigateTabs)(1);
        }),
    [navigateTabs],
  );

  const swipeRight = useMemo(
    () =>
      Gesture.Fling()
        .direction(Directions.RIGHT)
        .onEnd(() => {
          runOnJS(navigateTabs)(-1);
        }),
    [navigateTabs],
  );

  const tabSwipeGesture = useMemo(
    () => Gesture.Exclusive(swipeLeft, swipeRight),
    [swipeLeft, swipeRight],
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={tabSwipeGesture}>
        <View style={styles.root}>
          <Tabs
            screenOptions={{
              headerShown: false,
              animation: "shift",
              transitionSpec: {
                animation: "timing",
                config: {
                  duration: 260,
                },
              },

              tabBarStyle: [
                styles.tabBar,
                isLandscape ? styles.tabBarLandscape : styles.tabBarPortrait,
              ],
              tabBarLabelStyle: [
                styles.tabBarLabel,
                isLandscape && styles.tabBarLabelLandscape,
              ],
              tabBarItemStyle: isLandscape
                ? styles.tabBarItemLandscape
                : undefined,

              tabBarActiveTintColor: "#ff4d6d",
              tabBarInactiveTintColor: "#9ca3af",
            }}
          >
            <Tabs.Screen
              name="stream/index"
              options={{
                title: "Stream",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="radio" size={size} color={color} />
                ),
              }}
            />

            <Tabs.Screen
              name="posts/index"
              options={{
                title: "Posts",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="newspaper" size={size} color={color} />
                ),
              }}
            />

            <Tabs.Screen
              name="favorites/index"
              options={{
                title: "Favorites",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="heart" size={size} color={color} />
                ),
              }}
            />

            <Tabs.Screen
              name="about/index"
              options={{
                title: "About Us",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons
                    name="information-circle"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />

            <Tabs.Screen
              name="contact/index"
              options={{
                title: "Contact Us",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="mail" size={size} color={color} />
                ),
              }}
            />
          </Tabs>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    position: "absolute",
    backgroundColor: "#1b2746",
    borderTopWidth: 0,
    elevation: 0,
  },
  tabBarPortrait: {
    height: 80,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabBarLandscape: {
    height: 58,
    paddingBottom: 4,
    paddingTop: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  tabBarLabelLandscape: {
    fontSize: 11,
    marginTop: -2,
  },
  tabBarItemLandscape: {
    height: 50,
    paddingVertical: 0,
  },
});
