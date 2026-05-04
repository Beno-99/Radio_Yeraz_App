// app/_layout.tsx
import { NetworkContext, NetworkProvider } from "@/components/NetworkProvider";
import { OfflineScreen } from "@/components/OfflineScreen";
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
import { useContext, useEffect } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

// For testing purposes, allows us to force offline mode

// function AppGate({ children }: { children: React.ReactNode }) {
//   const { isOnline, setManualOffline, manualOffline } =
//     useContext(NetworkContext);
//   const insets = useSafeAreaInsets();

//   return (
//     <View style={{ flex: 1 }}>
//       {/* 1. Only show the app if we are online OR if we are forced online */}
//       {isOnline ? <>{children}</> : <OfflineScreen />}

//       {/* 2. Floating Toggle for testing (only in dev mode) */}
//       {__DEV__ && (
//         <TouchableOpacity
//           style={{
//             position: "absolute",
//             top: insets.top + 10,
//             right: 60,
//             backgroundColor: "rgba(0, 0, 0, 0.7)",
//             paddingHorizontal: 12,
//             paddingVertical: 8,
//             borderRadius: 20,
//             zIndex: 9999,
//           }}
//           onPress={() => setManualOffline?.(!manualOffline)}
//         >
//           <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
//             {manualOffline ? "Go Online" : "Test Offline"}
//           </Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// }

function AppGate({ children }: { children: React.ReactNode }) {
  const { isOnline } = useContext(NetworkContext);

  // Clean gate logic: if not online, show the screen
  if (!isOnline) {
    return <OfflineScreen />;
  }

  return <>{children}</>;
}

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
    <NetworkProvider>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "light" ? DarkTheme : DefaultTheme}
        >
          {/* Wrap your main UI in the Gate */}
          <AppGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
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
          </AppGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </NetworkProvider>
  );
}
