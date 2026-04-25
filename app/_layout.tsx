// app/_layout.tsx
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApp } from "@react-native-firebase/app";
import {
  getInitialNotification,
  getMessaging,
  onNotificationOpenedApp,
} from "@react-native-firebase/messaging";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    const app = getApp();
    const messaging = getMessaging(app);

    const openPostFromNotification = (remoteMessage: any) => {
      const postId =
        remoteMessage?.data?.postId ??
        remoteMessage?.data?.post_id ??
        remoteMessage?.data?.id;

      if (!postId) return;

      router.push({
        pathname: "/post/[id]",
        params: { id: String(postId) },
      });
    };

    const unsubscribeOpen = onNotificationOpenedApp(
      messaging,
      openPostFromNotification,
    );

    getInitialNotification(messaging).then((remoteMessage) => {
      if (remoteMessage) {
        openPostFromNotification(remoteMessage);
      }
    });

    return unsubscribeOpen;
  }, [router]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "light" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* 1. Add the index screen here at the top */}
          <Stack.Screen name="index" />

          {/* 2. Keep your existing (tabs) screen */}
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="post/[id]" />

          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              title: "Modal",
              headerShown: true,
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
