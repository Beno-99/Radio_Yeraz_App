// stores/videoProgressStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type VideoProgress = {
  [postId: string]: number;
};

interface VideoStore {
  progress: VideoProgress;
  setProgress: (postId: string, seconds: number) => void;
  getProgress: (postId: string) => number;
  clearProgress: (postId: string) => void;
}

export const useVideoProgress = create<VideoStore>()(
  persist(
    (set, get) => ({
      progress: {},

      setProgress: (postId, seconds) => {
        if (!postId || seconds < 0) return;
        set((state) => ({
          progress: { ...state.progress, [postId]: Math.max(0, seconds) },
        }));
      },

      getProgress: (postId) => {
        return get().progress[postId] ?? 0;
      },

      clearProgress: (postId) => {
        if (!postId) return;
        set((state) => {
          const { [postId]: _, ...rest } = state.progress;
          return { progress: rest };
        });
      },
    }),
    {
      name: "video-progress-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
