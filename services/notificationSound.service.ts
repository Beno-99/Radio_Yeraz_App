// services/notificationSound.service.ts
import { Audio } from "expo-av";
import { Platform, Vibration } from "react-native";

class NotificationSoundService {
  async play() {
    try {
      // Vibrate
      if (Platform.OS === "android") {
        Vibration.vibrate([0, 80, 50, 80]);
      } else {
        Vibration.vibrate();
      }

      // Always create a fresh sound instance
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/mixkit-software-interface-back-2575.wav"),
        { shouldPlay: true, volume: 1.0 },
      );

      // Auto unload after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.log("Notification sound/vibration error:", e);
    }
  }
}

export const notificationSoundService = new NotificationSoundService();
