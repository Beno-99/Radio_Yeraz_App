import { Tabs, usePathname, useRouter, type Href } from "expo-router";
import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
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
            layout={({ children }) => (
              <View style={styles.navigatorRoot}>{children}</View>
            )}
            screenLayout={({ children }) => (
              <View style={styles.screenRoot}>{children}</View>
            )}
            screenOptions={{
              headerShown: false,
              animation: "none",
              sceneStyle: styles.scene,
              tabBarStyle: styles.hiddenTabBar,
            }}
          >
            <Tabs.Screen
              name="stream/index"
              options={{ title: "Stream" }}
            />

            <Tabs.Screen
              name="posts/index"
              options={{ title: "Posts" }}
            />

            <Tabs.Screen
              name="favorites/index"
              options={{ title: "Favorites" }}
            />

            <Tabs.Screen
              name="about/index"
              options={{ title: "About Us" }}
            />

            <Tabs.Screen
              name="contact/index"
              options={{ title: "Contact Us" }}
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
    backgroundColor: "#070b14",
  },
  navigatorRoot: {
    flex: 1,
  },
  screenRoot: {
    flex: 1,
  },
  scene: {
    backgroundColor: "#070b14",
    flex: 1,
  },
  hiddenTabBar: {
    display: "none",
  },
});
