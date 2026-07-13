import AsyncStorage from "@react-native-async-storage/async-storage";
import { Post } from "@/types/api";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type FavoritePostEntry = {
  post: Post;
  savedAt: string;
  lastCheckedAt?: string | null;
  unavailableAt?: string | null;
};

type FavoritePosts = Record<string, FavoritePostEntry>;

type FavoritePostsStore = {
  favorites: FavoritePosts;
  addFavorite: (post: Post) => void;
  removeFavorite: (postId?: string | null) => void;
  toggleFavorite: (post: Post) => void;
  isFavorite: (postId?: string | null) => boolean;
  syncPosts: (posts: Post[]) => void;
  markUnavailable: (postId?: string | null) => void;
};

export const getPostFavoriteId = (post?: Partial<Post> | null) =>
  String(post?._id || post?.id || "");

export const useFavoritePostsStore = create<FavoritePostsStore>()(
  persist(
    (set, get) => ({
      favorites: {},

      addFavorite: (post) => {
        const postId = getPostFavoriteId(post);
        if (!postId) return;

        set((state) => ({
          favorites: {
            ...state.favorites,
            [postId]: {
              post,
              savedAt:
                state.favorites[postId]?.savedAt ?? new Date().toISOString(),
              lastCheckedAt: new Date().toISOString(),
              unavailableAt: null,
            },
          },
        }));
      },

      removeFavorite: (postId) => {
        if (!postId) return;

        set((state) => {
          const { [postId]: _removed, ...favorites } = state.favorites;
          return { favorites };
        });
      },

      toggleFavorite: (post) => {
        const postId = getPostFavoriteId(post);
        if (!postId) return;

        if (get().favorites[postId]) {
          get().removeFavorite(postId);
          return;
        }

        get().addFavorite(post);
      },

      isFavorite: (postId) => Boolean(postId && get().favorites[postId]),

      syncPosts: (posts) => {
        if (posts.length === 0) return;

        set((state) => {
          let changed = false;
          const favorites = { ...state.favorites };

          posts.forEach((post) => {
            const postId = getPostFavoriteId(post);
            if (!postId || !favorites[postId]) return;

            favorites[postId] = {
              ...favorites[postId],
              post,
              lastCheckedAt: new Date().toISOString(),
              unavailableAt: null,
            };
            changed = true;
          });

          return changed ? { favorites } : {};
        });
      },

      markUnavailable: (postId) => {
        if (!postId) return;

        set((state) => {
          const entry = state.favorites[postId];
          if (!entry) return {};

          return {
            favorites: {
              ...state.favorites,
              [postId]: {
                ...entry,
                lastCheckedAt: new Date().toISOString(),
                unavailableAt: entry.unavailableAt ?? new Date().toISOString(),
              },
            },
          };
        });
      },
    }),
    {
      name: "favorite-posts-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ favorites: state.favorites }),
    },
  ),
);
