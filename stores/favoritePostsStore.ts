import AsyncStorage from "@react-native-async-storage/async-storage";
import { MobilePublicPost, Post, PostLiveStatus, PostStatus } from "@/types/api";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type FavoritePostEntry = {
  post: MobilePublicPost;
  savedAt: string;
  lastCheckedAt?: string | null;
  unavailableAt?: string | null;
};

type FavoritePosts = Record<string, FavoritePostEntry>;

type FavoritePostsStore = {
  favorites: FavoritePosts;
  addFavorite: (post: Post | MobilePublicPost) => void;
  removeFavorite: (postId?: string | null) => void;
  toggleFavorite: (post: Post | MobilePublicPost) => void;
  isFavorite: (postId?: string | null) => boolean;
  syncPosts: (posts: (Post | MobilePublicPost)[]) => void;
  markUnavailable: (postId?: string | null) => void;
};

type FavoritePostIdSource = Partial<Pick<Post, "id" | "_id">>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getNullableString = (value: unknown) =>
  typeof value === "string" ? value : null;

const getBoolean = (value: unknown) => value === true;

const getLiveStatus = (value: unknown): PostLiveStatus =>
  value === "UPCOMING" ||
  value === "LIVE" ||
  value === "WAS_LIVE" ||
  value === "NOT_LIVE"
    ? value
    : "UNKNOWN";

const getPostStatus = (value: unknown): PostStatus =>
  value === "draft" || value === "expired" ? value : "published";

const getVideoSource = (value: unknown) =>
  value === "YOUTUBE" || value === "FACEBOOK" ? value : null;

export const getPostFavoriteId = (post?: FavoritePostIdSource | null) =>
  String(post?._id || post?.id || "");

export const sanitizePostForFavorites = (
  post: Partial<Post> | MobilePublicPost,
  fallbackId = "",
): MobilePublicPost => {
  const id = getString(post.id, getString(post._id, fallbackId));
  const _id = getString(post._id, id);

  return {
    id,
    _id,
    title: getString(post.title),
    description: getString(post.description),
    mainImage: getNullableString(post.mainImage),
    videoSource: getVideoSource(post.videoSource),
    youtubeUrl: getNullableString(post.youtubeUrl),
    youtubeVideoId: getNullableString(post.youtubeVideoId),
    facebookUrl: getNullableString(post.facebookUrl),
    profileName: getNullableString(post.profileName),
    eventDate: getNullableString(post.eventDate),
    eventTime: getNullableString(post.eventTime),
    location: getNullableString(post.location),
    isLive: getBoolean(post.isLive),
    liveStatus: getLiveStatus(post.liveStatus),
    liveStatusCheckedAt: getNullableString(post.liveStatusCheckedAt),
    isPublished: getBoolean(post.isPublished),
    status: getPostStatus(post.status),
    postedDate: getString(post.postedDate, getString(post.createdAt)),
    link: getNullableString(post.link),
    createdAt: getString(post.createdAt),
    updatedAt: getString(post.updatedAt),
    expiresAt: getNullableString(post.expiresAt),
    reminderEnabled: getBoolean(post.reminderEnabled),
  };
};

const getEntryDate = (value: unknown) =>
  typeof value === "string" ? value : new Date().toISOString();

const sanitizeFavoriteEntries = (value: unknown): FavoritePosts => {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce<FavoritePosts>((acc, [key, rawEntry]) => {
    if (!isRecord(rawEntry)) return acc;

    const rawPost = isRecord(rawEntry.post) ? rawEntry.post : {};
    const post = sanitizePostForFavorites(
      rawPost as unknown as Partial<Post>,
      key,
    );
    const postId = getPostFavoriteId(post);
    if (!postId) return acc;

    acc[postId] = {
      post,
      savedAt: getEntryDate(rawEntry.savedAt),
      lastCheckedAt: getNullableString(rawEntry.lastCheckedAt),
      unavailableAt: getNullableString(rawEntry.unavailableAt),
    };

    return acc;
  }, {});
};

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
              post: sanitizePostForFavorites(post),
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
              post: sanitizePostForFavorites(post),
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
      version: 1,
      migrate: (persistedState) => {
        if (!isRecord(persistedState)) return persistedState;
        return {
          ...persistedState,
          favorites: sanitizeFavoriteEntries(persistedState.favorites),
        };
      },
      partialize: (state) => ({
        favorites: sanitizeFavoriteEntries(state.favorites),
      }),
    },
  ),
);
